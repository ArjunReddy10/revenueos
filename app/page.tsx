import { WalletPanel } from '@/components/wallet-panel';
import Link from 'next/link';
import { events, experiments, opportunities, revenueSeries } from '@/lib/data';
import { money } from '@/lib/finance';
import { Header, ViewLink } from '@/components/ui';
import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import { GalaxyPanel } from '@/components/galaxy-panel';
import { ExperimentPerformanceChart, RevenueTrendChart } from '@/components/charts';
import { MotionCard, MotionPulse } from '@/components/motion';
import { RevenueCyclePanel } from '@/components/revenue-cycle-panel';

export default function Command() {
  return <>
    <Header eyebrow="Command center · Simulation" title="RevenueOS">
      <div style={{ display: 'flex', gap: 9 }}>
        <Link href="/approvals" className="button"><ShieldCheck size={15} style={{ verticalAlign: 'middle', marginRight: 5 }} />3 approvals</Link>
        <Link href="/opportunities" className="button primary">Explore motions</Link>
      </div>
    </Header>

    <WalletPanel compact />

    <RevenueCyclePanel />
    <p className="sub">Below: seeded strategy examples, not wallet results or live agents.</p>

    <section className="grid" style={{ gridTemplateColumns: '1.35fr .9fr', marginTop: 14 }}>
      <MotionCard className="card card-pad" delay={0.16}>
        <div className="section-head"><div><div className="eyebrow">Revenue topology</div><h2 style={{ marginTop: 5 }}>Where momentum is clustering</h2></div><ViewLink href="/agents" /></div>
        <GalaxyPanel />
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <div><div className="label">Signals today</div><b>184</b></div><div><div className="label">Motions running</div><b>16</b></div><div><div className="label">Human gates</div><MotionPulse tone="warning" label="3 waiting" /></div>
        </div>
      </MotionCard>
      <MotionCard className="card card-pad" delay={0.2}>
        <div className="section-head"><div><div className="eyebrow">Priority queue</div><h2 style={{ marginTop: 5 }}>Highest-leverage next moves</h2></div><MotionPulse label="Demo" /></div>
        <div className="stack">{opportunities.slice(0, 4).map((opportunity) => <Link href={`/opportunities/${opportunity.id}`} key={opportunity.id} className="priority-link"><div style={{ display: 'flex', justifyContent: 'space-between', gap: 9 }}><b>{opportunity.title}</b><ArrowUpRight size={15} /></div><div className="sub" style={{ marginTop: 5, fontSize: 12 }}>{money(opportunity.value)} potential · {opportunity.probability}% confidence</div></Link>)}</div>
      </MotionCard>
    </section>

    <section className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
      <MotionCard className="card card-pad" delay={0.24}><div className="section-head"><div><h2>Revenue trajectory</h2><p className="sub chart-note">Seeded example forecast in $k.</p></div><span className="positive">On plan</span></div><RevenueTrendChart data={revenueSeries} /></MotionCard>
      <MotionCard className="card card-pad" delay={0.28}><div className="section-head"><div><h2>Experiment performance</h2><p className="sub chart-note">Completion versus spend across active evidence work.</p></div><ViewLink href="/experiments" label="Open experiments" /></div><ExperimentPerformanceChart experiments={experiments} /></MotionCard>
    </section>

    <section className="card card-pad" style={{ marginTop: 14 }}><div className="section-head"><h2>Decision log</h2><ViewLink href="/intelligence" /></div>{events.map((event) => <div key={event.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><div style={{ display: 'flex', gap: 7 }}><span className={event.tone === 'warn' ? 'warning' : 'positive'}>●</span><b>{event.actor}</b><span className="sub">{event.time}</span></div><div className="sub" style={{ marginLeft: 14, fontSize: 12 }}>{event.action} · {event.detail}</div></div>)}</section>
  </>;
}
