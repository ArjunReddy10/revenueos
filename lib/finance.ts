import type { Transaction } from './types';
export function financeTotals(transactions:Transaction[]){
 const posted=transactions.filter(t=>t.status==='posted');
 const inflow=posted.filter(t=>t.direction==='in').reduce((n,t)=>n+t.amount,0);
 const outflow=posted.filter(t=>t.direction==='out').reduce((n,t)=>n+t.amount,0);
 const pending=transactions.filter(t=>t.status==='pending').reduce((n,t)=>n+(t.direction==='out'?-t.amount:t.amount),0);
 return { inflow, outflow, net: inflow-outflow, pending, count:posted.length };
}
export const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
