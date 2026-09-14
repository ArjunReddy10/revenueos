import {z} from 'zod';
export const AgentSchema=z.object({id:z.string(),name:z.string().min(1),status:z.enum(['active','paused','dead']),budget:z.number().nonnegative(),spent:z.number().nonnegative(),revenue:z.number().nonnegative(),score:z.number().int().min(0).max(100)});
export const ApprovalRequestSchema=z.object({agentId:z.string().uuid().optional(),type:z.enum(['spend','launch','policy']),title:z.string().min(3),amount:z.number().nonnegative().optional()});
