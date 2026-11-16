# Previous project instructions

Historical architecture and operating evidence, preserved at 35809d9c88bf5f95a973bdc5891e3bc4fc70d129.
Current process and authorization are exclusively in [the authored contract](../agent-contract.md).
Past approvals are not permission. Verify dated facts against current code.
Read relevant sections only; paths below have been rebased for this reference.

## Previous AGENTS.md project material

## Deploys — READ FIRST
- **Not connected to Workers Builds — deployed by hand / by AI Development Control Center.** Worker: `simple-calc`. Pushing to `main` does NOT deploy. After a manual deploy, check the live URL answers.
- GitHub Actions is OFF.
  Do not add deploy steps to Actions.
- Local direct release (only when asked or builds are broken): `npm run build && npx wrangler deploy`.
  Rollback: `npx wrangler rollback`.
- Cloud sessions: never run `wrangler deploy`; ask the owner to deploy.
- Never print or commit secret values. Secrets live in Cloudflare.

