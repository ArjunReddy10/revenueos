/** Local, server-only simulated accounting. All monetary values are integer cents.
 * No payment connections or LLM calls. Do not expose without authenticated access.
 */
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';

export type EventType = 'DEPOSIT' | 'RESERVE' | 'RELEASE' | 'EXPERIMENT_SPEND' | 'REVENUE' | 'REFUND' | 'LOSS' | 'WITHDRAWAL';
export interface LedgerEvent {
  id: string; walletId: string; type: EventType; amount: number;
  experimentId: string | null; referenceId: string | null;
  evidence: string; requestKey: string; createdAt: string;
}
export interface WalletSnapshot {
  startingCapital: number; currentValue: number; availableCapital: number;
  reservedCapital: number; totalSpent: number; totalRevenue: number;
  totalRefunds: number; totalLosses: number; realizedProfit: number;
  spendableCapital: number; roi: number | null;
}
interface Command {
  type: EventType; amount: number; experimentId?: string; referenceId?: string;
  evidence: string; requestKey: string;
}
const POLICY = { reserve: 2500, experiment: 300, daily: 500 } as const;
function cents(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100_000_000) throw new Error('Amount must be positive integer cents, at most $1,000,000.');
}
function required(value: string, field: string) {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) throw new Error(`${field} is required (max 2000 characters).`);
}
function outstanding(events: LedgerEvent[]) {
  const closed = new Set(events.filter(e => e.type === 'RELEASE' || e.type === 'EXPERIMENT_SPEND').map(e => e.referenceId));
  return events.filter(e => e.type === 'RESERVE' && !closed.has(e.id));
}
function totals(events: LedgerEvent[], initial: number): WalletSnapshot {
  const sum = (type: EventType) => events.filter(e => e.type === type).reduce((n, e) => n + e.amount, 0);
  const totalSpent = sum('EXPERIMENT_SPEND'), totalRevenue = sum('REVENUE');
  const totalRefunds = sum('REFUND'), totalLosses = sum('LOSS');
  const realizedProfit = totalRevenue + totalRefunds - totalSpent - totalLosses;
  const currentValue = sum('DEPOSIT') - sum('WITHDRAWAL') + realizedProfit;
  const reservedCapital = outstanding(events).reduce((n, e) => n + e.amount, 0);
  return { startingCapital: initial, currentValue, availableCapital: currentValue - reservedCapital,
    reservedCapital, totalSpent, totalRevenue, totalRefunds, totalLosses, realizedProfit,
    spendableCapital: Math.max(0, currentValue - reservedCapital - POLICY.reserve),
    roi: totalSpent > 0 ? realizedProfit / totalSpent : null };
}

export class SimulatedWallet {
  private db: DatabaseSync;
  private clock: () => Date;
  constructor(path: string, clock: () => Date = () => new Date()) {
    this.clock = clock;
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS simulation_wallets(id TEXT PRIMARY KEY, initial INTEGER NOT NULL CHECK(initial>0));
      CREATE TABLE IF NOT EXISTS simulation_ledger(
        id TEXT PRIMARY KEY, walletId TEXT NOT NULL REFERENCES simulation_wallets(id),
        type TEXT NOT NULL CHECK(type IN ('DEPOSIT','RESERVE','RELEASE','EXPERIMENT_SPEND','REVENUE','REFUND','LOSS','WITHDRAWAL')),
        amount INTEGER NOT NULL CHECK(amount>0), experimentId TEXT, referenceId TEXT,
        evidence TEXT NOT NULL, requestKey TEXT NOT NULL, fingerprint TEXT NOT NULL, createdAt TEXT NOT NULL,
        UNIQUE(walletId,requestKey));
      CREATE INDEX IF NOT EXISTS simulation_wallet_events ON simulation_ledger(walletId);
      CREATE TRIGGER IF NOT EXISTS simulation_ledger_no_update BEFORE UPDATE ON simulation_ledger BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS simulation_ledger_no_delete BEFORE DELETE ON simulation_ledger BEGIN SELECT RAISE(ABORT,'Ledger is append-only'); END;
      CREATE TRIGGER IF NOT EXISTS simulation_wallet_no_update BEFORE UPDATE ON simulation_wallets BEGIN SELECT RAISE(ABORT,'Wallet configuration is immutable'); END;`);
  }
  close() { this.db.close(); }
  private atomic<T>(work: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  private initial(walletId: string) {
    const row = this.db.prepare('SELECT initial FROM simulation_wallets WHERE id=?').get(walletId);
    if (!row) throw new Error('Wallet not found');
    return Number(row.initial);
  }
  ledger(walletId: string): LedgerEvent[] {
    this.initial(walletId);
    return this.db.prepare('SELECT id,walletId,type,amount,experimentId,referenceId,evidence,requestKey,createdAt FROM simulation_ledger WHERE walletId=? ORDER BY rowid').all(walletId).map(row => ({ ...row })) as unknown as LedgerEvent[];
  }
  snapshot(walletId: string) { return totals(this.ledger(walletId), this.initial(walletId)); }
  create(walletId: string, startingCapital = 5000) {
    required(walletId, 'Wallet ID'); cents(startingCapital);
    return this.atomic(() => {
      const old = this.db.prepare('SELECT initial FROM simulation_wallets WHERE id=?').get(walletId);
      if (old) {
        if (Number(old.initial) !== startingCapital) throw new Error('Wallet already exists with different starting capital');
        return this.snapshot(walletId);
      }
      this.db.prepare('INSERT INTO simulation_wallets VALUES(?,?)').run(walletId, startingCapital);
      this.insert(walletId, { type: 'DEPOSIT', amount: startingCapital, evidence: 'Initial simulated capital', requestKey: '__initial__' }, 'initial');
      return this.snapshot(walletId);
    });
  }
  private insert(walletId: string, cmd: Command, fingerprint: string): LedgerEvent {
    const event: LedgerEvent = { id: randomUUID(), walletId, type: cmd.type, amount: cmd.amount,
      experimentId: cmd.experimentId ?? null, referenceId: cmd.referenceId ?? null,
      evidence: cmd.evidence, requestKey: cmd.requestKey, createdAt: this.clock().toISOString() };
    this.db.prepare('INSERT INTO simulation_ledger VALUES(?,?,?,?,?,?,?,?,?,?)').run(event.id, walletId, event.type, event.amount, event.experimentId, event.referenceId, event.evidence, event.requestKey, fingerprint, event.createdAt);
    return event;
  }
  /** Trusted operator entry point only. Approval is not inferred from LLM text. */
  post(walletId: string, cmd: Command): LedgerEvent {
    cents(cmd.amount); required(cmd.evidence, 'Audit evidence'); required(cmd.requestKey, 'Idempotency key');
    if (cmd.requestKey.startsWith('__')) throw new Error('Reserved request key');
    const fingerprint = createHash('sha256').update(JSON.stringify([cmd.type, cmd.amount, cmd.experimentId ?? null, cmd.referenceId ?? null, cmd.evidence])).digest('hex');
    return this.atomic(() => {
      const events = this.ledger(walletId);
      const old = this.db.prepare('SELECT fingerprint FROM simulation_ledger WHERE walletId=? AND requestKey=?').get(walletId, cmd.requestKey);
      if (old) {
        if (old.fingerprint !== fingerprint) throw new Error('Idempotency key reused with different payload');
        return events.find(e => e.requestKey === cmd.requestKey)!;
      }
      const balance = totals(events, this.initial(walletId));
      const reservations = outstanding(events);
      const reference = events.find(e => e.id === cmd.referenceId);
      const day = this.clock().toISOString().slice(0, 10);
      const today = events.filter(e => e.type === 'EXPERIMENT_SPEND' && e.createdAt.startsWith(day)).reduce((n, e) => n + e.amount, 0);
      if (['RESERVE','EXPERIMENT_SPEND','REVENUE','REFUND','RELEASE'].includes(cmd.type)) required(cmd.experimentId ?? '', 'Experiment ID');
      switch (cmd.type) {
        case 'DEPOSIT': break;
        case 'RESERVE':
          if (events.some(e => e.experimentId === cmd.experimentId && ['RESERVE','EXPERIMENT_SPEND'].includes(e.type))) throw new Error('Experiment already allocated; use a new experiment ID');
          if (cmd.amount > POLICY.experiment) throw new Error('Maximum initial experiment budget is $3');
          if (cmd.amount > balance.spendableCapital) throw new Error('Protected $25 reserve or available capital exceeded');
          if (today + balance.reservedCapital + cmd.amount > POLICY.daily) throw new Error('Daily experimental budget exceeds $5');
          break;
        case 'EXPERIMENT_SPEND':
        case 'RELEASE':
          if (!reference || !reservations.some(e => e.id === reference.id) || reference.experimentId !== cmd.experimentId) throw new Error('Open reservation for this experiment required');
          if (cmd.amount > reference.amount || (cmd.type === 'RELEASE' && cmd.amount !== reference.amount)) throw new Error('Invalid reservation settlement');
          if (cmd.type === 'EXPERIMENT_SPEND' && balance.currentValue - cmd.amount - (balance.reservedCapital - reference.amount) < POLICY.reserve) throw new Error('Protected $25 reserve must remain at settlement');
          if (cmd.type === 'EXPERIMENT_SPEND' && today + cmd.amount > POLICY.daily) throw new Error('Daily experimental spend exceeds $5');
          // A settlement closes the reservation; unused capital becomes available.
          break;
        case 'REVENUE':
          if (!events.some(e => e.type === 'EXPERIMENT_SPEND' && e.experimentId === cmd.experimentId)) throw new Error('Revenue requires a funded experiment');
          break;
        case 'REFUND': {
          if (!reference || reference.type !== 'EXPERIMENT_SPEND' || reference.experimentId !== cmd.experimentId) throw new Error('Refund must reference its experiment spend');
          const refunded = events.filter(e => e.type === 'REFUND' && e.referenceId === reference.id).reduce((n,e) => n+e.amount,0);
          if (refunded + cmd.amount > reference.amount) throw new Error('Refund exceeds original spend');
          break;
        }
        case 'LOSS':
        case 'WITHDRAWAL':
          if (cmd.amount > balance.availableCapital) throw new Error('Cannot remove reserved or unavailable capital');
          break;
        default: throw new Error('Unsupported ledger event');
      }
      return this.insert(walletId, cmd, fingerprint);
    });
  }
}
