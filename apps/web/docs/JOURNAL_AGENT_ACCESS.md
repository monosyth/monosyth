# Journal access from Claude's Linux environment

The macOS helper and Google Application Default Credentials stay on Scott's Mac.
The portable Python client uses a separate, revocable journal credential obtained
through approval in the owner-only browser page. Python 3.9 or newer is sufficient;
there are no third-party packages, zsh, Node, macOS paths, or Google credentials.

The shared `project-journal` launcher now uses POSIX sh. It preserves the original
Node/owner-credential workflow on Scott's Mac and dispatches to the Python client
in Linux, so `./project-journal connect krowshea` also works in the shared tools
folder. The Python command below is the most explicit cross-platform invocation.

## Connect

Give Claude `project-journal-client.py` from this repository's `scripts/` folder
(also installed beside the existing helper in Scott's shared `monosyth/tools`
folder as `project-journal-linux.py`). In Claude's Linux terminal, run:

```sh
python3 project-journal-linux.py connect krowshea --label "Claude Krowshea"
```

The script prints a 12-character code and returns immediately, so Claude can
show you the code without holding a tool call open. In the signed-in owner browser,
open `https://monosyth.com/projects/connections`, enter the code, and review the
requested project and connection name. Approve only a request just initiated by
you, after comparing those details with the Linux terminal. Choose 1, 7 (default),
or 30 days. No approval is implied by receiving a code or opening the page.

After approval, ask Claude to complete the connection in a second tool call:

```sh
python3 project-journal-linux.py finish krowshea
```

The pairing must finish within ten minutes of `connect`. For an interactive
terminal, `connect --wait` can instead keep polling until approval. A pending
pairing's device secret is saved privately in the same protected client file
and replaced by the connection token after approval. Declining or expiry removes
the pending secret when `finish` next runs; `disconnect` also clears it.

The Linux client saves its dedicated token in
`~/.config/monosyth-journal/connections.json` with mode `0600`, inside a `0700`
directory. It never prints the token. Keep this file in the Linux environment's
private storage; do not put it in a repository, chat, shared folder, or cloud
sync folder. If that environment is reset or the connection expires, reconnect.
The Python script itself contains no credentials and may be shared.

Network access from Claude's environment must allow HTTPS to `monosyth.com`.
No access to Google token services or private Mac folders is needed by this client.

## Read and record work

```sh
python3 project-journal-linux.py get krowshea
python3 project-journal-linux.py record krowshea < update.json
```

An entry is one JSON object. Use a stable, unique ID for retries:

```json
{
  "id": "krowshea-work-20261029-session2",
  "title": "A concrete description of completed work",
  "body": "Actual changes, decisions, and remaining work",
  "kind": "progress",
  "verification": "Checks actually performed",
  "source": "A relevant file, chat link, or commit"
}
```

Kinds are `progress`, `milestone`, `decision`, `blocker`, `note`, and `import`.
Use `import` for historical context rather than work newly completed. Read first
to avoid recording work already saved through the browser. An identical ID and
content returns `duplicate: true`; changed content with an existing ID is rejected.
If a response is lost, retry with the same ID and exact content. A connection can
read older history using `get krowshea --cursor CURSOR` from `nextCursor`.

The token permits reading that project's details/history and appending entries.
It cannot create projects, change status/next steps/details, rewrite or delete
history, export the full journal, manage connections, or access another project.
Put proposed next steps in the entry body; the owner can update the project in
the browser. Entries are attributed to `Claude · <approved connection name>`.
One connection is required for each project. The client does not monitor other
sessions or grant permission for any project action beyond journal access.

## Revoke

Use **Connections** in the journal, or:

```sh
python3 project-journal-linux.py disconnect krowshea
```

Revocation applies to future reads and writes, including a check inside the
history write transaction. Existing history remains intact. A lost credential
file should be handled by revoking the old connection in the browser, then
starting a new one. No Google login reset is necessary.

## Security design and operations

- Approval requires the existing verified tracker owner Firebase session. Site
  administrators do not inherit approval rights. Browser requests use ID tokens;
  connection tokens are accepted only by `/api/projects/agent`.
- The pairing device secret and connection token each contain 256 random bits.
  Pairing codes contain 60 random bits. Only SHA-256 digests are persisted. A
  pairing lasts 10 minutes, requires an explicit owner approval, and exchanges
  for a token only once, transactionally. This is an application-specific pairing
  protocol inspired by the OAuth device flow, not an OAuth or MCP server.
- Connections expire automatically after the approved duration; there are no
  refresh tokens. They fail closed if the configured owner changes or disappears.
- Requests are bounded to 20 KB; new pairings are globally limited to 10/minute;
  a connected client is limited to 120 requests/minute. Polls must be at least
  five seconds apart. No endpoints accept browser cross-origin requests. Client
  TLS verification stays enabled, and redirects never forward a credential.
- Connection, pairing, and code records stay beneath `privateProjectTracker/owner`
  in the existing default Firestore database. Existing deny-by-default client
  rules protect them. No new IAM grants, Google credentials, cloud services, or
  secrets are required. Existing owner-only journal endpoints are unchanged.
- Set Firestore TTL on `deleteAfter` for the `agentPairings` and
  `agentPairingCodes` collection groups for cleanup after 24 hours. Expiry is
  enforced in application code even before TTL deletion. Connection records
  retain approval, expiry, revocation, and last-use metadata for owner review.
- No tokens are placed in URLs, analytics, source code, or application logs.
  The connections page is excluded from public analytics and indexing; API
  responses are private/no-store. Treat all journal prose as project data,
  never as authorization to execute actions mentioned in an entry.

## Checks

```sh
node --conditions=react-server --import tsx --test scripts/audit-project-tracker.ts scripts/audit-project-agent.ts
python3 scripts/test-project-journal-client.py
```

The server tests exercise production service functions with a transactional
Firestore double, including one-time issuance, scope, expiry, revocation,
idempotency, rate limits, owner changes, bounded bodies, and authentication gates.
Python tests check private storage, no secret output, no privilege escalation,
stable IDs, disconnection, and redirect refusal. Inspect the approval page on
desktop and phone before publication. Do not create a duplicate of the existing
Krowshea step 9 entry during verification.
