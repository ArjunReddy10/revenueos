export type AgentStatus = 'active' | 'paused' | 'dead';
export type OpportunityStage = 'signal' | 'qualified' | 'experimenting' | 'committed' | 'won' | 'lost';
export type Risk = 'low' | 'medium' | 'high';
export interface Agent { id:string; name:string; mandate:string; status:AgentStatus; score:number; budget:number; spent:number; revenue:number; generation:number; owner:string; lastHeartbeat:string; thesis:string; }
export interface Opportunity { id:string; title:string; segment:string; stage:OpportunityStage; value:number; probability:number; confidence:number; effort:number; risk:Risk; owner:string; agentId:string; createdAt:string; summary:string; x:number; y:number; }
export interface Experiment { id:string; name:string; opportunityId:string; status:'running'|'queued'|'complete'|'paused'; metric:string; target:string; progress:number; spend:number; verdict?:string; }
export interface Approval { id:string; title:string; type:'spend'|'launch'|'policy'; amount?:number; requestedBy:string; createdAt:string; urgency:'normal'|'high'; }
export interface Transaction { id:string; date:string; description:string; category:string; amount:number; direction:'in'|'out'; status:'posted'|'pending'; }
export interface Insight { id:string; title:string; body:string; source:string; confidence:number; tag:string; createdAt:string; }
export interface Event { id:string; time:string; actor:string; action:string; detail:string; tone:'good'|'warn'|'info'; }
export interface GraveyardAgent extends Agent { cause:string; postmortem:string; diedAt:string; }
