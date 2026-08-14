# Monosyth Labs website repository boundary

This repository is only for the Monosyth Labs, LLC website and the web services
that support it.

- Keep website code, website assets, deployment configuration, and directly
  related documentation in this repository.
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
