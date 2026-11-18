# Build prompts and enhancement audits

Files in this directory are intended to support future implementation work.
They do not override the canonical documents at `docs/` root.

## Available files

- `AUDIT_BACKLOG.md`: accumulated audits for club onboarding, validation,
  dashboard setup, and family registration. Each entry records existing
  behavior, gaps, decisions, minimal changes, and acceptance criteria.
- `OMNISITE_CODEX_PROMPT.md`: reusable OmniSite implementation prompt.

## How to use an audit entry

1. Resolve every item under **Decisions required** and confirm dependencies.
2. Change the audit status from `AUDITED` to `READY`.
3. Create a focused implementation prompt that references the audit entry and
   the canonical governance documents.
4. Implement through the repository's normal migration, security, and testing
   workflows.
5. Mark the audit `VERIFIED` only after its acceptance criteria pass.

Do not combine unrelated audit entries into one implementation prompt merely
because they touch the same page. Preserve tenant isolation and trusted
server/database enforcement throughout.
