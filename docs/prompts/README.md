# Build prompts and enhancement audits

Files in this directory are intended to support future implementation work.
They do not override the canonical documents at `docs/` root.

## Available files

- `AUDIT_BACKLOG.md`: accumulated audits for club onboarding, validation,
  dashboard setup, and family registration. Each entry records existing
  behavior, gaps, decisions, minimal changes, and acceptance criteria.
- `DEVELOPMENT_PROMPT_QUEUE.md`: dependency-ordered implementation prompts,
  run-status tracking, and the recurring post-check-in audit standard.
- `OMNISITE_CODEX_PROMPT.md`: reusable OmniSite implementation prompt.
- `audits/`: dated evidence snapshots produced after development check-ins.

## How to use an audit entry

1. Resolve every item under **Decisions required** and confirm dependencies.
2. Change the audit status from `AUDITED` to `READY`.
3. Run the linked item from `DEVELOPMENT_PROMPT_QUEUE.md` and update its tracker.
4. Implement through the repository's normal migration, security, and testing
   workflows.
5. Mark the audit `VERIFIED` only after its acceptance criteria pass.

After a related set of development check-ins, run `AUDIT-01` from the queue to
create a dated audit file. Periodically run `AUDIT-02` to consolidate those files
into the backlog and generate the next minimal implementation batch.

Do not combine unrelated audit entries into one implementation prompt merely
because they touch the same page. Preserve tenant isolation and trusted
server/database enforcement throughout.
