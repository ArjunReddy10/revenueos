import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SimulatedWallet } from '@/lib/wallet';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
function allowed(request: NextRequest, write = false) {
  if (process.env.REVENUEOS_LOCAL_SIMULATION !== 'true') return false;
  const host = request.headers.get('host') ?? '';
  if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return false;
  if (write && request.headers.get('origin') !== `http://${host}`) return false;
  return true;
}
function open() {
  const dir = join(process.cwd(), '.local'); mkdirSync(dir, { recursive: true });
  const wallet = new SimulatedWallet(join(dir, 'simulation.sqlite'));
  wallet.create('local'); return wallet;
}
function state(wallet: SimulatedWallet) {
  return { simulation: true, snapshot: wallet.snapshot('local'), ledger: wallet.ledger('local') };
}
export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: 'Wallet is available only in the local simulation server.' }, { status: 403 });
  const wallet = open();
  try { return NextResponse.json(state(wallet), { headers: { 'Cache-Control': 'no-store' } }); }
  finally { wallet.close(); }
}
export async function POST(request: NextRequest) {
  if (!allowed(request, true)) return NextResponse.json({ error: 'Local same-origin simulation access required.' }, { status: 403 });
  const wallet = open();
  try {
    const command = await request.json();
    // No caller-specified wallet identity, policy, or direct balance writes.
    wallet.post('local', command);
    return NextResponse.json(state(wallet), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid operation' }, { status: 400 }); }
  finally { wallet.close(); }
}
