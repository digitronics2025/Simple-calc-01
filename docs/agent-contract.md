# Simple Calculator contract

This is the simple-calc web application. Preserve existing Worker identity and
secrets; never print or commit secret values. Use npm and the scripts in package.json.

For this instruction-only change, review the authored contract, generated parity,
links and byte limits. Runtime work uses npm run lint, npm run typecheck,
npm test and npm run build as applicable to its shared risk tier.

Pushing main does not deploy. GitHub Actions is off; do not add deployment jobs.
The existing manual release is npm run build followed by the pinned Wrangler
deploy command, only when production release is authorized. Cloud sessions do
not deploy directly. Verify the active version and affected live behavior after
an actual release. This instruction change needs no application deployment.

Read [the preserved project reference](reference/agent-instructions.md) for
previous setup facts. It grants no approval. Edit this authored contract, then
regenerate both assistant files from the registered configuration source.

## Agent tool permissions

The owner pre-approved the four Cloudflare MCP tools (`search`, `docs`, `whoami`,
`execute`) in `.claude/settings.json` on 2026-11-16. Tool pre-approval does not
replace task approval: ask in chat before changing live Cloudflare resources.
Preserve the owner permissions; removing `mcp__cloudflare_mcp__execute` restores
its tool prompt. These permissions never grant new secret or destination scope.
