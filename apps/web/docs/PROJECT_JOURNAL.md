# Private Monosyth project journal

Production URL: `https://monosyth.com/projects`

For Claude's isolated Linux environment, use the portable client and explicit
owner-approved, project-scoped connections described in
[`JOURNAL_AGENT_ACCESS.md`](JOURNAL_AGENT_ACCESS.md). Manage access at
`https://monosyth.com/projects/connections`. Do not copy the Mac's credentials.

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
/Users/scottwaite/monosyth/tools/project-journal entry font-foundry ENTRY_ID
/Users/scottwaite/monosyth/tools/project-journal history font-foundry --cursor CURSOR
/Users/scottwaite/monosyth/tools/project-journal record font-foundry --author Claude < /private/tmp/project-update.json
```

### Compact reads

Agents read the journal when a session starts. A busy project's 50 full entries
exceeded 100 KB, enough to push a fresh session into repeated context
compaction. `get` therefore returns a brief (`src/lib/projects/brief.ts`):
working project fields, open decisions, links, and the five most recent entries
with body, verification, and source clipped (`clipped: true` marks shortened
entries; `--limit` allows up to 20). It omits bookkeeping such as `latestEntry`.
Use `entry` for one full entry and `history` for clipped older pages.
`get --full` keeps the previous 50-entry response for recovery work. The Linux
agent API uses the same views (`view=brief|history|entry|full`); a request with
only a cursor keeps the old full page for older clients. Internal retry
fingerprints are never returned. Writes accept `--author` (default Codex).

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

Kinds: progress, milestone, decision, blocker, note, import. Keep bodies near
600 characters and link longer notes in `source`; the CLI warns above 1,200.
The `decisions` field lists open questions for Scott, not decisions already
made; record made decisions as `decision` entries. A repeated entry ID
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
node --conditions=react-server --import tsx --test scripts/audit-project-tracker.ts scripts/audit-project-reviews.ts scripts/audit-project-brief.ts scripts/audit-project-agent.ts
python3 -I scripts/test-project-journal-client.py
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

## Appearance preference

Scott prefers a white working background with grey-blue navigation and primary
actions. Keep the journal in this light palette, including its sign-in page and
edit dialogs. Use green for completion and successful verification, amber for
items needing attention, red for errors and blockers, and restrained violet for
review or decision cues. Preserve readable text contrast and visible focus states.

Scott also prefers substantially larger type and stronger contrast in this
working tool. Keep project descriptions, next steps, and history at 16–17px or
larger, form controls and primary actions at least 16px, and supporting metadata
at 13–14px. Use dark navy body text and dark slate secondary text; avoid restoring
the original 8–12px captions or shrinking important controls on phones.

Balance that readability with compact spacing: Scott found the enlarged layout
a little magnified. Prefer 16px reading text, 20px card headings, 26–30px page
headings, and restrained card/header padding. Keep the stronger contrast and
comfortable phone touch targets rather than restoring tiny captions.


## Clearing reviews

The owner can choose **Reviewed** on a project with Review status, from its card
or detail page. This records a dated decision and returns its status to In
progress. It does not mark the project complete, approve other open decisions,
or claim its next step has been performed. Review projects are included in the
Waiting on me queue until acknowledged.

Each open decision has an **OK** action in the project detail page. It records
the approved text in history and removes only that decision. Clearing the last
decision returns Waiting on me or Review status to In progress. Other statuses
and the next step are preserved. A 15-second Undo restores the prior status and
decision list through the normal audited project edit. Both the initial action
and Undo require the current revision, so concurrent agent updates cannot be
overwritten. The owner-only API action is `review`, with `projectId` and
`review: {id, expectedRevision, decisionIndex?}`; stable IDs make retries safe.

## Quick actions

The next-step card on each project offers one-click actions. Every one uses the
current revision, records a dated history entry, and offers the 15-second Undo:

- **Next step done** opens the update form with a "Done: …" title and an empty
  next step, so finishing work and choosing what follows is one save.
- **Status moves** (Pause, Resume, Start, Waiting on me, Mark complete, Reopen)
  use the owner-only `status` action with `projectId` and
  `change: {id, expectedRevision, status}`. They record "Status changed to …"
  but do not count as project work (`lastWorkedAt` is unchanged). Mark complete
  asks for confirmation and preserves the next step and open decisions.
- **Open decisions** offer OK, **Answer…**, and **Drop**. Answer records
  `Q:`/`A:` text from Scott; Drop removes the item without approving it. Both use
  the `review` action with `resolution: "answer"` (plus `answer`, up to 3,000
  characters) or `resolution: "drop"`, and follow the same last-decision status
  rule as OK.
- **Copy resume prompt**, on the detail page and each card, copies a short
  hand-off for a new agent chat: the project ID, the compact `get` command, the
  next step, open decision count, and the project folder. Cards also offer
  **Add update** without opening the project.

Entries show "Recorded by you" for the owner and the recorded agent name
otherwise, such as `Claude · Claude Linux`.

Scott requested another reduction in oversized text: keep large summary numbers
at 24px, history headings at 18px, and sidebar next-step text at 16px. Body and
form text retain their readable 16px size and stronger contrast.
