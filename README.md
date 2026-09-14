# RevenueOS V1

Premium dark operating console for bounded, evidence-led revenue work.

```bash
npm install
npm run dev
npm run lint && npm run typecheck && npm test && npm run build
```

Visit `/` for Command. All primary surfaces are in the sidebar. The product uses comprehensive local preview data by default and never claims that an external action occurred. To add persistence, apply the Supabase migration and seed, then configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (no values are included here).

## VS Code

Open this folder in VS Code, accept the recommended extensions, and press `F5` to launch the Next.js debugger. Use **Terminal → Run Task → RevenueOS: Full Check** to run lint, strict types, tests, and the production build.

See [`docs/PRODUCT.md`](docs/PRODUCT.md) and the remainder of `docs/` for product, safety, data, architecture, agent, economic and UI design decisions.

## P0 local simulation (Node 24+)

`npm run wallet -- init local` creates a persistent $50 simulated wallet in `.local/simulation.sqlite`; use `status local` or `ledger local` to inspect it. `init local 2000` instead starts a new wallet at $20 (below the protected reserve, so experiments are blocked). Run `npm run test:wallet` without installing dependencies.

All amounts are integer cents. The local operator can use `post local '<JSON>'` with `type`, `amount`, `requestKey`, and `evidence`; experiment events also require `experimentId`, and settlement/refund events require the original event's `referenceId`. Supported events: DEPOSIT, RESERVE, RELEASE, EXPERIMENT_SPEND, REVENUE, REFUND, LOSS, WITHDRAWAL. Reusing a request key with different content is rejected. Arbitrary balance adjustments are deliberately unsupported; use auditable compensating events.

Policy: $25 reserve, at most $3 per experiment in this initial phase, $5 gross daily experimental spend (UTC), counting outstanding reservations against capacity. Refunds do not reset the daily limit. Deposits/withdrawals are not profit. Actual spend closes its reservation and releases any unused amount. Withdrawals can take unreserved capital, but subsequent experiments must still preserve $25.

This is a local operator-only accounting backend; it is not wired to the dashboard, Supabase, or public API yet. No LLM can submit commands. Approval workflows and authenticated multi-user access must be connected before exposing writes. SQLite requires persistent server storage and cannot run on GitHub Pages. Existing Supabase files remain unchanged.

The local dashboard now connects to the persisted wallet: run `npm run dev` and open `http://127.0.0.1:3000/revenue`. Use Reserve -> Experiment Spend -> Revenue to record a simulated experiment. Command shows the same server-calculated balances; seeded strategy panels remain labeled as examples. API writes require local same-origin access and the simulation flag set by the local start scripts. Do not deploy this local operator API publicly without authentication.
