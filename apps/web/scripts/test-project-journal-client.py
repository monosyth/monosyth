import contextlib
import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("journal", Path(__file__).with_name("project-journal-client.py"))
journal = importlib.util.module_from_spec(spec)
spec.loader.exec_module(journal)
TOKEN = "mjp_" + "x" * 43


class ClientTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.config = Path(self.directory.name) / "private" / "connections.json"
        self.config_mock = patch.object(journal, "config_path", return_value=self.config)
        self.config_mock.start()

    def tearDown(self):
        self.config_mock.stop()
        self.directory.cleanup()

    def test_private_atomic_storage(self):
        journal.save_config({"krowshea": {"token": TOKEN}})
        self.assertEqual(stat.S_IMODE(self.config.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.config.parent.stat().st_mode), 0o700)
        self.assertEqual(journal.credential("krowshea"), TOKEN)
        self.config.chmod(0o644)
        with self.assertRaises(journal.ClientError):
            journal.load_config()

    def test_symlink_storage_is_rejected(self):
        self.config.parent.mkdir()
        other = Path(self.directory.name) / "other.json"
        other.write_text("{}")
        self.config.symlink_to(other)
        with self.assertRaises(journal.ClientError):
            journal.save_config({})
        with self.assertRaises(journal.ClientError):
            journal.load_config()

    def test_pairing_saves_but_never_prints_secrets(self):
        responses = [
            {"verificationUri": "https://monosyth.com/projects/connections", "userCode": "ABCD-EFGH-JKLM", "deviceCode": "secret-device-code", "expiresIn": 600, "interval": 5},
            {"status": "pending", "interval": 5},
            {"status": "connected", "token": TOKEN, "connection": {"projectId": "krowshea", "expiresAt": "2026-11-05T00:00:00Z"}},
        ]
        output = io.StringIO()
        with patch.object(journal, "request", side_effect=responses), patch.object(journal.time, "sleep"), contextlib.redirect_stdout(output):
            journal.connect("krowshea", "Claude Krowshea")
        self.assertIn("ABCD-EFGH-JKLM", output.getvalue())
        self.assertNotIn(TOKEN, output.getvalue())
        self.assertNotIn("secret-device-code", output.getvalue())
        self.assertEqual(journal.credential("krowshea"), TOKEN)

    def test_record_has_no_project_edit_or_attribution_override(self):
        journal.save_config({"krowshea": {"token": TOKEN}})
        for extra in ({"status": "complete"}, {"nextStep": "Deploy"}, {"author": "Owner"}):
            raw = io.BytesIO(json.dumps({"id": "stable-entry", "title": "Verified work", "body": "Done", "kind": "progress", **extra}).encode())
            with patch.object(journal.sys, "stdin") as stdin, patch.object(journal, "request") as request:
                stdin.buffer = raw
                with self.assertRaises(journal.ClientError):
                    journal.main(["record", "krowshea"])
                request.assert_not_called()

    def test_record_preserves_stable_id_and_hides_credential(self):
        journal.save_config({"krowshea": {"token": TOKEN}})
        entry = {"id": "work-20261029", "title": "Actual work", "body": "Checks passed", "kind": "progress"}
        with patch.object(journal.sys, "stdin") as stdin, patch.object(journal, "request", return_value={"duplicate": False}) as request, contextlib.redirect_stdout(io.StringIO()):
            stdin.buffer = io.BytesIO(json.dumps(entry).encode())
            journal.main(["record", "krowshea"])
            request.assert_called_once_with("/api/projects/agent", {"projectId": "krowshea", "entry": entry}, token=TOKEN)

    def test_disconnect_revokes_before_removing_local_credential(self):
        journal.save_config({"krowshea": {"token": TOKEN}})
        with patch.object(journal, "request", return_value={"revoked": True}) as request, contextlib.redirect_stdout(io.StringIO()):
            journal.main(["disconnect", "krowshea"])
            request.assert_called_once_with("/api/projects/agent", token=TOKEN, method="DELETE")
        self.assertEqual(journal.load_config(), {})

    def test_redirects_never_forward_the_token(self):
        seen = []

        class Redirect(BaseHTTPRequestHandler):
            def do_GET(self):
                seen.append(self.path)
                self.send_response(302)
                self.send_header("Location", "/should-not-be-followed")
                self.end_headers()

            def log_message(self, *args):
                pass

        server = HTTPServer(("127.0.0.1", 0), Redirect)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.object(journal, "SERVER", "http://127.0.0.1:%d" % server.server_port):
                with self.assertRaisesRegex(journal.ClientError, "No credential was forwarded"):
                    journal.request("/test", token=TOKEN)
            self.assertEqual(seen, ["/test"])
        finally:
            server.shutdown()
            thread.join()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
