'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { EventType, LedgerEvent, WalletSnapshot } from '@/lib/wallet';
import { money } from '@/lib/finance';
interface State { snapshot: WalletSnapshot; ledger: LedgerEvent[] }
const actions: EventType[] = ['RESERVE','EXPERIMENT_SPEND','REVENUE','RELEASE','REFUND','DEPOSIT','WITHDRAWAL','LOSS'];
export function WalletPanel({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<State | null>(null);
  const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy,setBusy]=useState(false);
  const [type,setType]=useState<EventType>('RESERVE');const [amount,setAmount]=useState('3.00');
  const [experiment,setExperiment]=useState('');const [reference,setReference]=useState('');const [evidence,setEvidence]=useState('');
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const refresh = useCallback(async()=>{
    try { const response=await fetch('/api/wallet',{cache:'no-store'});const body=await response.json();if(!response.ok)throw new Error(body.error);setData(body);setError(''); }
    catch(e){setError(e instanceof Error?e.message:'Wallet unavailable');}
  },[]);
  useEffect(()=>{
    let active=true;
    fetch('/api/wallet',{cache:'no-store'}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error);if(active)setData(body)}).catch(e=>{if(active)setError(e.message)});
    const listener=()=>{void refresh()};window.addEventListener('focus',listener);
    return()=>{active=false;window.removeEventListener('focus',listener)};
  },[refresh]);
  const usesExperiment=['RESERVE','EXPERIMENT_SPEND','REVENUE','RELEASE','REFUND'].includes(type);
  const usesReference=['EXPERIMENT_SPEND','RELEASE','REFUND'].includes(type);
  const closed=new Set(data?.ledger.filter(e=>['EXPERIMENT_SPEND','RELEASE'].includes(e.type)).map(e=>e.referenceId));
  const references=data?.ledger.filter(e=> type==='REFUND'?e.type==='EXPERIMENT_SPEND':e.type==='RESERVE'&&!closed.has(e.id))??[];
  async function submit(event: React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setError('');setNotice('');
    if(!/^\d+(\.\d{1,2})?$/.test(amount)){setError('Enter dollars with at most two decimal places.');return;}
    const payload=JSON.stringify({type,amount:Math.round(Number(amount)*100),evidence, ...(usesExperiment?{experimentId:experiment}:{}),...(usesReference?{referenceId:reference}:{})});
    if(retry.current?.payload!==payload)retry.current={payload,key:crypto.randomUUID()};
    setBusy(true);
    try {const response=await fetch('/api/wallet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...JSON.parse(payload),requestKey:retry.current.key})});const body=await response.json();if(!response.ok)throw new Error(body.error);setData(body);retry.current=null;setNotice('Simulated event recorded.');setEvidence('');setReference('');}
    catch(e){setError(e instanceof Error?e.message:'Request failed. Retry safely; it will not double-charge.');}
    finally{setBusy(false);}
  }
  return <section aria-label="Simulated wallet">
    <p className="sub">Simulated USD only · $25 protected reserve · $3 per experiment · $5 daily spend (UTC). No real money moves.</p>
    {error&&<p role="alert" className="warning">{error}</p>}
    {!data?<button onClick={()=>void refresh()}>Reload wallet</button>:<>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))'}}>
        {([['Current value',data.snapshot.currentValue],['Realized profit',data.snapshot.realizedProfit],['Total revenue',data.snapshot.totalRevenue],['Total spend',data.snapshot.totalSpent],...(!compact?[['Available capital',data.snapshot.availableCapital],['Reserved capital',data.snapshot.reservedCapital],['Spendable capital',data.snapshot.spendableCapital]]:[])] as [string,number][]).map(([label,value])=><div className="card kpi" key={label}><div className="label">{label}</div><div className={`value ${value<0?'warning':''}`}>{money(value/100)}</div></div>)}
      </div>
      {!compact&&<>
        <form className="card card-pad" onSubmit={submit} style={{marginTop:16}}>
          <h2 style={{fontSize:17}}>Record a simulated event</h2>
          <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
            <label>Action<select value={type} onChange={e=>{setType(e.target.value as EventType);setReference('');setNotice('')}}>{actions.map(a=><option key={a}>{a}</option>)}</select></label>
            <label>Amount (USD)<input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="3.00" /></label>
            {usesReference&&<label>{type==='REFUND'?'Original spend':'Open reservation'}<select required value={reference} onChange={e=>{setReference(e.target.value);const r=references.find(x=>x.id===e.target.value);if(r){setExperiment(r.experimentId??'');setAmount((r.amount/100).toFixed(2))}}}><option value="">Select event</option>{references.map(r=><option key={r.id} value={r.id}>{r.experimentId} · {money(r.amount/100)} · {r.id.slice(0,8)}</option>)}</select></label>}
            {usesExperiment&&<label>Experiment ID<input required readOnly={usesReference} value={experiment} onChange={e=>setExperiment(e.target.value)} placeholder="experiment-1" /></label>}
            <label>Audit note / evidence<input required maxLength={2000} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="Describe this simulated result" /></label>
          </div>
          <p className="sub">Reserve a budget before spending. Settlement releases unused budget. Deposits and withdrawals do not count as profit.</p>
          <button className="primary" disabled={busy}>{busy?'Recording…':'Record simulated event'}</button>
          {notice&&<p role="status" className="positive">{notice}</p>}
        </form>
        <div className="card card-pad scroll" style={{marginTop:16}}><h2 style={{fontSize:17}}>Persistent simulation ledger</h2><table><thead><tr><th>UTC time</th><th>Event</th><th>Amount</th><th>Experiment</th><th>Evidence</th><th>Event ID</th></tr></thead><tbody>{data.ledger.slice().reverse().map(e=><tr key={e.id}><td>{e.createdAt}</td><td>{e.type}</td><td>{money(e.amount/100)}</td><td>{e.experimentId??'—'}</td><td style={{whiteSpace:'normal'}}>{e.evidence}</td><td title={e.id}>{e.id.slice(0,8)}</td></tr>)}</tbody></table></div>
      </>}
    </>}
  </section>;
}
