# `.claude/` — per-repo settings for Claude sessions

Anything Claude (via Cowork) needs to remember about *this* repo lives here.
The folder persists on your Mac between sessions, so one-time setup sticks.

## Files

- **`secrets.env.example`** — tracked template. Copy it to `secrets.env` and
  fill in real values.
- **`secrets.env`** — **gitignored**. Holds a GitHub Personal Access Token
  (and anything else sensitive) so Claude can push to this repo on your
  behalf without you pasting the token every session.

## Setting up the GitHub token (one time)

1. Create a fine-grained PAT:
   https://github.com/settings/personal-access-tokens/new
   - **Repository access:** Only select repositories → `monosyth/monosyth`
   - **Repository permissions:** Contents → Read and write
     (Metadata → Read-only gets added automatically.)
   - **Expiration:** whatever you like; 1 year is reasonable.
2. Copy the token (starts with `github_pat_...`).
3. On your Mac:
   ```
   cp ~/monosyth/.claude/secrets.env.example ~/monosyth/.claude/secrets.env
   ```
   Then open `~/monosyth/.claude/secrets.env` and paste the token in.
4. Done. Claude sessions will load it automatically when pushing.

When the token expires, regenerate it at the same URL and replace the
value in `secrets.env`.
