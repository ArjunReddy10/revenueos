import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {SimulatedWallet} from '../lib/wallet.ts';
const date=()=>new Date('2026-09-14T12:00:00Z');
function setup(t){const dir=mkdtempSync(join(tmpdir(),'revenue-wallet-'));const path=join(dir,'wallet.db');const w=new SimulatedWallet(path,date);t.after(()=>{w.close();rmSync(dir,{recursive:true,force:true})});w.create('demo');return {w,path};}
function post(w,type,amount,requestKey,extra={}){return w.post('demo',{type,amount,requestKey,evidence:'Simulated operator test',...extra});}
test('$50 -> $3 cost -> $8 revenue = $55 balance and $5 profit, survives restart',t=>{
 const {w,path}=setup(t);const r=post(w,'RESERVE',300,'r',{experimentId:'e1'});
 assert.equal(w.snapshot('demo').availableCapital,4700);
 post(w,'EXPERIMENT_SPEND',300,'s',{experimentId:'e1',referenceId:r.id});
 post(w,'REVENUE',800,'income',{experimentId:'e1'});
 const state=w.snapshot('demo');assert.equal(state.currentValue,5500);assert.equal(state.realizedProfit,500);assert.equal(state.reservedCapital,0);
 const second=new SimulatedWallet(path,date);assert.deepEqual(second.snapshot('demo'),state);second.close();
});
test('deposits/withdrawals are capital, not profit; cents preserved',t=>{const {w}=setup(t);post(w,'DEPOSIT',123,'deposit');post(w,'WITHDRAWAL',100,'withdraw');assert.equal(w.snapshot('demo').currentValue,5023);assert.equal(w.snapshot('demo').realizedProfit,0);});
test('experiment and daily caps include outstanding reservations',t=>{const {w}=setup(t);assert.throws(()=>post(w,'RESERVE',301,'big',{experimentId:'big'}),/\$3/);post(w,'RESERVE',300,'r1',{experimentId:'e1'});post(w,'RESERVE',200,'r2',{experimentId:'e2'});assert.throws(()=>post(w,'RESERVE',1,'r3',{experimentId:'e3'}),/\$5/);});
test('reserve blocks spending; withdrawals cannot consume allocated money',t=>{const {w}=setup(t);post(w,'WITHDRAWAL',2400,'withdraw');assert.throws(()=>post(w,'RESERVE',101,'r',{experimentId:'e'}),/reserve/);const r=post(w,'RESERVE',100,'ok',{experimentId:'e'});assert.throws(()=>post(w,'WITHDRAWAL',2501,'bad'),/reserved/);post(w,'RELEASE',100,'release',{experimentId:'e',referenceId:r.id});assert.equal(w.snapshot('demo').reservedCapital,0);});
test('idempotency, payload conflicts and double settlement',t=>{const {w}=setup(t);const r=post(w,'RESERVE',300,'r',{experimentId:'e'});assert.deepEqual(post(w,'RESERVE',300,'r',{experimentId:'e'}),r);assert.throws(()=>post(w,'RESERVE',200,'r',{experimentId:'e'}),/different payload/);post(w,'EXPERIMENT_SPEND',200,'s',{experimentId:'e',referenceId:r.id});assert.equal(w.snapshot('demo').reservedCapital,0);assert.throws(()=>post(w,'EXPERIMENT_SPEND',100,'s2',{experimentId:'e',referenceId:r.id}),/Open reservation/);});
test('refund is bounded and tied to original spend',t=>{const {w}=setup(t);const r=post(w,'RESERVE',300,'r',{experimentId:'e'});const s=post(w,'EXPERIMENT_SPEND',300,'s',{experimentId:'e',referenceId:r.id});post(w,'REFUND',200,'refund',{experimentId:'e',referenceId:s.id});assert.throws(()=>post(w,'REFUND',101,'bad',{experimentId:'e',referenceId:s.id}),/exceeds/);assert.equal(w.snapshot('demo').realizedProfit,-100);});
test('invalid amounts, evidence, revenue and manual adjustments are rejected',t=>{const {w}=setup(t);for(const amount of [-1,0,1.2,NaN,Infinity])assert.throws(()=>post(w,'DEPOSIT',amount,'bad'));assert.throws(()=>w.post('demo',{type:'DEPOSIT',amount:10,requestKey:'x',evidence:''}));assert.throws(()=>post(w,'REVENUE',50,'income',{experimentId:'none'}));assert.throws(()=>post(w,'ADJUSTMENT',50,'adjust'));});
test('ledger update/delete forbidden and second connection sees committed budget',t=>{const {w,path}=setup(t);const db=new DatabaseSync(path);assert.throws(()=>db.exec('DELETE FROM simulation_ledger'),/append-only/);assert.throws(()=>db.exec('UPDATE simulation_ledger SET amount=1'),/append-only/);db.close();const other=new SimulatedWallet(path,date);post(w,'RESERVE',300,'r',{experimentId:'e1'});assert.throws(()=>post(other,'RESERVE',300,'r2',{experimentId:'e2'}),/\$5/);other.close();});
test('UTC rollover retains reservations and charges actual settlement day',t=>{const {w,path}=setup(t);const r=post(w,'RESERVE',300,'r',{experimentId:'e1'});const next=new SimulatedWallet(path,()=>new Date('2026-09-15T01:00:00Z'));post(next,'RESERVE',200,'r2',{experimentId:'e2'});assert.throws(()=>post(next,'RESERVE',1,'r3',{experimentId:'e3'}));post(next,'EXPERIMENT_SPEND',300,'s',{experimentId:'e1',referenceId:r.id});assert.throws(()=>post(next,'RESERVE',1,'r4',{experimentId:'e4'}));next.close();});
test('wallet isolation, configurable starting capital, loss stops new spending',t=>{const {w}=setup(t);w.create('small',2000);assert.equal(w.snapshot('small').spendableCapital,0);assert.equal(w.create('demo').currentValue,5000);assert.throws(()=>w.create('demo',6000));post(w,'LOSS',2600,'loss');assert.equal(w.snapshot('demo').realizedProfit,-2600);assert.throws(()=>post(w,'RESERVE',100,'r',{experimentId:'e'}),/reserve/);assert.equal(w.snapshot('small').currentValue,2000);});
test('withdrawing the reserve after allocation blocks settlement',t=>{const {w}=setup(t);const r=post(w,'RESERVE',300,'r',{experimentId:'e'});post(w,'WITHDRAWAL',4700,'withdraw');assert.throws(()=>post(w,'EXPERIMENT_SPEND',300,'s',{experimentId:'e',referenceId:r.id}),/reserve/);assert.equal(w.snapshot('demo').totalSpent,0);});
test('simultaneous writers cannot over-allocate daily budget',async t=>{
 const {path}=setup(t);const {Worker}=await import('node:worker_threads');
 const moduleUrl=new URL('../lib/wallet.ts',import.meta.url).href;
 const run=id=>new Promise((resolve,reject)=>{const worker=new Worker(`
 const {parentPort,workerData}=require('node:worker_threads');
 (async()=>{const {SimulatedWallet}=await import(workerData.moduleUrl);const w=new SimulatedWallet(workerData.path,()=>new Date('2026-09-14T12:00:00Z'));try{w.post('demo',{type:'RESERVE',amount:300,requestKey:workerData.id,experimentId:workerData.id,evidence:'Concurrent test'});parentPort.postMessage('ok')}catch(e){parentPort.postMessage(e.message)}finally{w.close()}})().catch(e=>{throw e});`,{eval:true,workerData:{path,moduleUrl,id}});worker.on('message',resolve);worker.on('error',reject);});
 const results=await Promise.all([run('writer1'),run('writer2')]);assert.equal(results.filter(x=>x==='ok').length,1);assert.equal(results.filter(x=>/\$5/.test(x)).length,1);
});
