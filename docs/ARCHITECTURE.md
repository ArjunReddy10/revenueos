# Architecture
Next.js App Router provides server-rendered route shells and isolated client islands for transient interaction, charts, and WebGL. `lib/types.ts` is the domain contract; `data.ts` is the preview adapter; `finance.ts` and `scoring.ts` are pure domain services. Replace the preview adapter with a Supabase repository without changing UI contracts.

## Realtime readiness
Subscribe per workspace to `agents`, `agent_heartbeats`, `approvals`, `events`, and `transactions`; apply typed payloads into a query/cache layer. Server routes must calculate financial totals from posted ledger rows. Never expose service-role credentials to client components.
