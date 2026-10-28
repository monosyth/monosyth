# Private Monosyth project journal

Production URL: `https://monosyth.com/projects`

The journal is part of the existing Next.js/Firebase app. It stores projects and
append-only work entries beneath `privateProjectTracker/owner` in the default
Monosyth Firestore database. The existing catch-all Firestore rule denies client
access. All browser reads, writes, and exports pass through `/api/projects`, which
requires a non-revoked Firebase token with the verified owner email from the private `MONOSYTH_PROJECT_OWNER_EMAIL` runtime setting.
Other site administrators do not inherit access to personal records.

The page has noindex metadata, is excluded by the existing public analytics
allowlist, and never embeds records or owner identity in its public HTML.
Responses are private and uncached. The database holds the records; server
restarts and deployments do not clear the journal. Full JSON exports are available
in the UI and CLI. Exports are portable recovery copies; there is no automatic
restore command or scheduled backup in this first version.

## Updating during project work

The local helper is `/Users/scottwaite/monosyth/tools/project-journal`. It runs:

```sh
node --conditions=react-server --import tsx scripts/project-tracker.ts
```

from `apps/web`. It obtains short-lived credentials through the existing owner
Google Cloud Application Default Credentials. It does not store a tracker API token or put a
credential in browser code. Local network access may require tool escalation.

```sh
/Users/scottwaite/monosyth/tools/project-journal list
/Users/scottwaite/monosyth/tools/project-journal get font-foundry
/Users/scottwaite/monosyth/tools/project-journal record font-foundry < /private/tmp/project-update.json
```

Example entry (use a stable ID for retries):

```json
{
  "id": "family-review-20261028-session1",
  "title": "Family proofs reviewed",
  "body": "Describe the actual work and any material remaining issue.",
  "kind": "progress",
  "verification": "State the checks actually performed.",
  "source": "A file path, chat URL, or commit",
  "nextStep": "The next useful action",
  "expectedRevision": 4
}
```

Kinds: progress, milestone, decision, blocker, note, import. A repeated entry ID
with identical content returns `duplicate: true`. A reused ID with different
content returns 409. Entries and project summary changes commit atomically.
Changing a project's fields, status, or next step requires the revision returned
by `get`; stale revisions return 409 instead of overwriting another session.
Appending a history-only entry does not require a revision.

`create` accepts name, area, summary, status, nextStep, decisions (text array), and
links (`{label,url}` array). Status values are active, waiting, paused, idea,
review, complete. `update` accepts `{project,expectedRevision}`. `export` writes
the complete journal as JSON. `seed` imports initial project references without
overwriting existing project records. Imported references are labeled and do not
count as new work or populate lastWorkedAt.

The owner scope in the global instructions and the `monosyth-project-journal`
skill make logging part of future personal project sessions. This is an agent
workflow, not a background observer of every chat or file change. Existing open
chats may need to load the instructions; remote/cloud agents need an authorized
credential path. Failed writes must be reported rather than claimed as saved.
Do not log WebListers work or sensitive health/business details into this journal.

## Deployment and checks

Run the focused checks from `apps/web`:

```sh
node --conditions=react-server --import tsx --test scripts/audit-project-tracker.ts
npm run lint
npm run build
```

The history query needs a collection-scope composite index on `workEntries` with
`projectId ASC`, `createdAt DESC`, and implicit document name DESC. The setup
creates this index with gcloud; allow it to finish before opening project history.
The usual repository main-branch deployment publishes the app. Seed data is an
explicit authenticated CLI step and is never a side effect of visiting a page.

Keep unrelated working-tree changes out of the deployment commit.

Validation note for the initial release: the complete repository lint command
currently reports pre-existing errors in vendored weather JavaScript and the
bag-studio code. The tracker and launcher pass targeted ESLint with zero warnings;
the production build, type checking, public-email audit, and focused tracker
tests pass. Do not claim repository-wide lint passes until those existing errors
are resolved.
