import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Liveness: o processo está de pé. */
export function GET() {
  return NextResponse.json({ status: 'ok', service: 'apoie-aqui', ts: new Date().toISOString() });
}
