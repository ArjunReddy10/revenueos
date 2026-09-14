import { Header } from '@/components/ui';

const operatingRules = [
  ['Human approval for spend above $1,000', 'Enforced'],
  ['Require evidence before scale', 'Enforced'],
  ['Allow external execution', 'Disabled'],
  ['Reduced visual motion', 'Follows device preference'],
] as const;

export default function Settings() {
  return <>
    <Header eyebrow="Workspace configuration" title="Settings" />
    <section className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <div className="card card-pad"><h2 style={{ fontSize: 16, marginTop: 0 }}>Operating rules</h2>{operatingRules.map(([label, status]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--line)' }}><span>{label}</span><span className={status === 'Disabled' ? 'warning' : 'positive'} style={{ fontSize: 12, fontWeight: 700, textAlign: 'right' }}>{status}</span></div>)}<p className="sub" style={{ marginBottom: 0 }}>Preview rules are read-only. Persisted rule changes require a configured Supabase project and an authorized operator.</p></div>
      <div className="card card-pad"><h2 style={{ fontSize: 16, marginTop: 0 }}>Supabase readiness</h2><p className="sub">Database migrations and seed data are included. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable persistent adapters and realtime.</p><div className="divider" /><div className="label">Connection status</div><p className="warning">Not configured — preview data is active.</p><div className="label">Safety posture</div><p className="sub">No secrets in the repository. External spend and transaction execution remain disabled.</p></div>
    </section>
  </>;
}
