export interface SurvivalInput { revenue:number; spend:number; confidence:number; heartbeatHours:number; violations:number; }
/** Transparent 0–100 score; a decision aid, never an autonomous kill switch. */
export function survivalScore(input: SurvivalInput): number {
 const efficiency=input.revenue/Math.max(input.spend,1);
 const economics=Math.min(42, Math.max(0, efficiency*21));
 const evidence=Math.min(32, Math.max(0,input.confidence*32));
 const recency=Math.max(0,18-(input.heartbeatHours*0.75));
 const penalty=Math.min(24,input.violations*8);
 return Math.round(Math.min(100,Math.max(0,economics+evidence+recency+8-penalty)));
}
export function scoreLabel(score:number){ return score>=75?'Thriving':score>=50?'Watch':score>=30?'At risk':'Sunset review'; }
