# OmniTeam documentation

Use this page as the entry point for repository documentation.

## Canonical governance

These files remain at the `docs/` root because repository guidance and change
workflows depend on their stable paths:

- `OMNITEAM_STRUCTURE.md`: canonical product and feature hierarchy.
- `PRODUCT_STRUCTURE.md`: implementation findings and architecture guidance.
- `TENANT_ISOLATION.md`: mandatory multi-tenant security requirements.
- `DATABASE_CHANGE_WORKFLOW.md`: required process for Supabase schema changes.

Canonical documents define constraints and current decisions. They are not
standalone implementation prompts.

## Reference material

[`reference/`](reference/README.md) contains current-state inventories, design
notes, operational runbooks, deployment instructions, access models, and
workflow explanations. Read the relevant references before implementing a
feature, but do not paste an operational runbook as a build prompt.

## Build prompts and enhancement audits

[`prompts/`](prompts/README.md) contains documents intended to drive future
feature or enhancement work:

- `AUDIT_BACKLOG.md` collects audited gaps, decisions, dependencies, and
  acceptance criteria. Move an item from `AUDITED` to `READY` only after its
  open decisions are resolved, then turn it into a focused implementation
  prompt.
- `OMNISITE_CODEX_PROMPT.md` is an existing reusable implementation prompt.

Implementation prompts do not override canonical governance, tenant isolation,
authorization rules, or the database change workflow.
