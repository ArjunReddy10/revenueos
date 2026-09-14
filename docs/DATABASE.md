# Database
Run `supabase/migrations/202609120001_revenueos.sql`, then `supabase/seed.sql` in a development project. The schema uses UUIDs, enums, numeric(14,2) money, check constraints, foreign keys, indexes, timestamps and RLS enablement. RLS is intentionally prepared with an agent policy; production must add workspace membership policies for every remaining table before browser access.

`knowledge.embedding` is JSON fallback so migration works when pgvector is absent. With pgvector installed, migrate it to `vector(1536)` and add a vector index.
