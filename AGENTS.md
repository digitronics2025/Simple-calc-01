## Deploys — READ FIRST
- **Not connected to Workers Builds — deployed by hand / by AI Development Control Center.** Worker: `simple-calc`. Pushing to `main` does NOT deploy. After a manual deploy, check the live URL answers.
- GitHub Actions is OFF.
  Do not add deploy steps to Actions.
- Local direct release (only when asked or builds are broken): `npm run build && npx wrangler deploy`.
  Rollback: `npx wrangler rollback`.
- Cloud sessions: never run `wrangler deploy`; ask the owner to deploy.
- Never print or commit secret values. Secrets live in Cloudflare.
