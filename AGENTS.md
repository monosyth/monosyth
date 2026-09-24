# Monosyth Labs project workspace

Use `/Users/scottwaite/monosythlabs` as the working folder for Monosyth Labs,
LLC. This is the folder attached to the saved Monosyth Labs project.

Scott's naming distinction is explicit: **monosyth is the person/personal
workspace; monosythlabs is the company and its business workspace**.
`/Users/scottwaite/monosyth` is for personal ChatGPT work, sewing, questions,
and unrelated projects. `/Users/scottwaite/monosythlabs` is for Monosyth Labs,
LLC website work and company business files. The company website is
`monosyth.com`; the owner also owns `monosythlabs.com`, which forwards there.

The Git repository contains the website and its supporting web services.
Company administration records also live in this workspace, as local files.

- Keep website code, website assets, deployment configuration, and directly
  related documentation in this repository.
- Save Monosyth Labs business records (formation documents, licenses,
  registration confirmations, and business administration notes) under
  `business-records/`. This directory is Git-ignored; do not commit or deploy
  its contents. Check its `README.md` first when looking for company records.
- Put unrelated personal projects, questions, sewing patterns, generated
  artifacts, and experiments in `/Users/scottwaite/monosyth` instead.
- Before staging changes, review the complete Git status and exclude anything
  unrelated to the website.
- The production site deploys from this repository's `main` branch through
  Firebase App Hosting.
- Never deploy this site or its child apps to ChatGPT Sites. ChatGPT and Codex
  tools may assist with building, but production must remain on Monosyth-owned
  hosting at `monosyth.com`.

For work inside `apps/web`, also follow `apps/web/AGENTS.md`.

## Standing design and copy preference

Scott does not want decorative terminal periods after standalone words, short
phrases, headings, labels, or slogans. Never use that treatment in new designs
or copy. Normal sentence punctuation in explanatory body text is appropriate.
