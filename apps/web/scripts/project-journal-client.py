#!/usr/bin/env python3
"""Portable, project-scoped Monosyth journal client. Python 3.9+, no packages."""
import argparse
import json
import os
from pathlib import Path
import re
import stat
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

SERVER = "https://monosyth.com"
MAX_RESPONSE = 2_000_000


class ClientError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # A credential must never follow a redirect to another destination.
        return None


def request(path, body=None, token=None, method=None):
    headers = {"Accept": "application/json", "User-Agent": "Monosyth-Journal-Linux/1"}
    if token:
        if not re.fullmatch(r"mjp_[A-Za-z0-9_-]{43}", token):
            raise ClientError("Invalid saved journal credential. Connect again.")
        headers["Authorization"] = "Bearer " + token
    raw = None
    if body is not None:
        raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
        if len(raw) > 20_000:
            raise ClientError("This request is too large.")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(SERVER + path, data=raw, headers=headers, method=method)
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=30) as response:
            data = response.read(MAX_RESPONSE + 1)
            if len(data) > MAX_RESPONSE:
                raise ClientError("The journal response was too large.")
            return json.loads(data)
    except urllib.error.HTTPError as error:
        # Only the service's safe error field is displayed, never a request/token.
        try:
            message = json.loads(error.read(20_001)).get("error")
        except (ValueError, AttributeError):
            message = None
        if 300 <= error.code < 400:
            raise ClientError("The service redirected this request. No credential was forwarded.") from None
        raise ClientError(message if isinstance(message, str) and len(message) < 500 else "Journal request failed (HTTP %d)." % error.code) from None
    except (urllib.error.URLError, TimeoutError, ValueError):
        raise ClientError("Could not reach the journal over HTTPS. Check network access and try again.") from None


def config_path():
    # Dedicated to this Linux environment; never read Mac/Google/browser credentials.
    return Path.home() / ".config" / "monosyth-journal" / "connections.json"


def load_config():
    path = config_path()
    if not path.exists():
        return {}
    if path.is_symlink() or not path.is_file() or path.stat().st_uid != os.getuid() or stat.S_IMODE(path.stat().st_mode) & 0o077:
        raise ClientError("The journal credential file must be a private regular file (chmod 600).")
    if path.stat().st_size > 100_000:
        raise ClientError("The journal credential file is invalid.")
    try:
        data = json.loads(path.read_text())
        if not isinstance(data, dict):
            raise ValueError()
        return data
    except (ValueError, OSError):
        raise ClientError("The journal credential file could not be read.") from None


def save_config(data):
    path = config_path()
    path.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
    if path.parent.is_symlink() or path.is_symlink():
        raise ClientError("The journal credential location must not be a symbolic link.")
    os.chmod(path.parent, 0o700)
    descriptor, temporary = tempfile.mkstemp(prefix=".connections-", dir=path.parent)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w") as stream:
            json.dump(data, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def valid_project(value):
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{0,79}", value):
        raise ClientError("Use a lowercase project ID, for example krowshea.")
    return value


def credential(project):
    value = load_config().get(project)
    if not isinstance(value, dict) or not isinstance(value.get("token"), str):
        raise ClientError("Run connect for this project first.")
    return value["token"]


def connect(project, label):
    config = load_config()
    if project in config:
        raise ClientError("This project already has a saved connection. Disconnect it before connecting again.")
    # Check private storage before beginning approval, not after receiving a token.
    save_config(config)
    result = request("/api/projects/agent-connect", {"action": "start", "projectId": project, "label": label})
    print("Open %s in your signed-in browser." % result["verificationUri"], flush=True)
    print("Enter code: %s" % result["userCode"], flush=True)
    print("Approve only if the page shows project %s and connection %s." % (project, label), flush=True)
    print("Waiting for your approval (up to 10 minutes)…", flush=True)
    deadline = time.monotonic() + min(result["expiresIn"], 600)
    interval = max(result["interval"], 5)
    while time.monotonic() < deadline:
        time.sleep(interval)
        status = request("/api/projects/agent-connect", {"action": "poll", "deviceCode": result["deviceCode"]})
        if status["status"] == "connected":
            token = status.get("token")
            if not isinstance(token, str) or not re.fullmatch(r"mjp_[A-Za-z0-9_-]{43}", token) or status["connection"]["projectId"] != project:
                raise ClientError("The service returned an invalid connection.")
            config = load_config()
            config[project] = {"token": token, "expiresAt": status["connection"]["expiresAt"]}
            try:
                save_config(config)
            except (OSError, ClientError):
                request("/api/projects/agent", token=token, method="DELETE")
                raise ClientError("Could not save the credential privately; the new connection was revoked.") from None
            print("Connected to %s until %s. Credential saved privately; it is not displayed." % (project, status["connection"]["expiresAt"]))
            return
        if status["status"] not in ("pending", "slow_down"):
            raise ClientError("The service returned an unexpected connection status.")
        interval = max(status.get("interval", 5), 5)
    raise ClientError("Approval timed out. Start connect again.")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    for name in ("connect", "get", "record", "disconnect"):
        command = commands.add_parser(name)
        command.add_argument("project", help="Approved project ID, for example krowshea")
        if name == "connect":
            command.add_argument("--label", default="Claude Linux", help="Name to compare on the approval page")
        if name == "get":
            command.add_argument("--cursor", help="Read the next history page")
    args = parser.parse_args(argv)
    project = valid_project(args.project)
    if args.command == "connect":
        connect(project, args.label)
        return
    token = credential(project)
    if args.command == "get":
        query = {"project": project}
        if args.cursor:
            query["cursor"] = args.cursor
        result = request("/api/projects/agent?" + urllib.parse.urlencode(query), token=token)
    elif args.command == "record":
        try:
            raw = sys.stdin.buffer.read(20_001)
            if len(raw) > 20_000:
                raise ClientError("This entry is too large.")
            entry = json.loads(raw)
        except (ValueError, UnicodeError):
            raise ClientError("Send one JSON entry on stdin.") from None
        allowed = {"id", "title", "body", "kind", "verification", "source"}
        if not isinstance(entry, dict) or not entry.get("id") or set(entry) - allowed:
            raise ClientError("Supply a stable entry ID and history fields only. Project edits are not allowed.")
        result = request("/api/projects/agent", {"projectId": project, "entry": entry}, token=token)
    else:
        result = request("/api/projects/agent", token=token, method="DELETE")
        config = load_config()
        config.pop(project, None)
        save_config(config)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except ClientError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("Connection cancelled. An uncompleted request expires automatically.", file=sys.stderr)
        sys.exit(130)
    except (OSError, KeyError, TypeError):
        print("The client could not complete this operation. Check its private storage and network access.", file=sys.stderr)
        sys.exit(1)
