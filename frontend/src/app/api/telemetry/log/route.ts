import { NextRequest, NextResponse } from 'next/server';
import { _toOtlp } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const { logs } = await req.json();
    if (!Array.isArray(logs) || logs.length === 0) return new NextResponse(null, { status: 204 });

    const collectorUrl = process.env.OTEL_COLLECTOR_URL;
    if (collectorUrl) {
      await fetch(`${collectorUrl}/v1/logs`, {
        method: 'POST',
        body: JSON.stringify(_toOtlp(logs)),
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // Observability must never break the app
  }
  return new NextResponse(null, { status: 204 });
}
