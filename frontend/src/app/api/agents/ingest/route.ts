import { type NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// When BACKEND_URL is set, proxy to the FastAPI backend.
// Otherwise fall back to the mock implementation (dev / no-backend mode).
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request: NextRequest) {
  if (BACKEND_URL) {
    const formData = await request.formData();
    const upstream = await fetch(`${BACKEND_URL}/api/agents/ingest`, {
      method: 'POST',
      body: formData,
      signal: request.signal,
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  return mockResponse(request);
}

// ---------------------------------------------------------------------------
// Mock — used when BACKEND_URL is not configured
// ---------------------------------------------------------------------------

const DELAY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonLine(msg: object): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg) + '\n');
}

type IngestionStep = 'upload' | 'parsing' | 'chunking' | 'embedding' | 'storing';
type StepStatus = 'idle' | 'in_progress' | 'done' | 'error';

function step(s: IngestionStep, status: StepStatus, message: string) {
  return jsonLine({ step: s, status, message });
}

function mockResponse(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const fileName = file?.name ?? 'document';
        const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : '?';

        controller.enqueue(step('upload', 'done', `${fileName} received (${fileSizeMB} MB)`));
        await delay(DELAY_MS);

        controller.enqueue(step('parsing', 'in_progress', 'Extracting text...'));
        await delay(DELAY_MS);
        controller.enqueue(step('parsing', 'done', 'Text extracted'));
        await delay(DELAY_MS);

        controller.enqueue(step('chunking', 'in_progress', 'Splitting into chunks...'));
        await delay(DELAY_MS);
        controller.enqueue(step('chunking', 'done', '14 chunks created'));
        await delay(DELAY_MS);

        controller.enqueue(step('embedding', 'in_progress', 'Generating embeddings...'));
        await delay(DELAY_MS * 2);
        controller.enqueue(step('embedding', 'done', '14 vectors generated'));
        await delay(DELAY_MS);

        controller.enqueue(step('storing', 'in_progress', 'Writing to vector store...'));
        await delay(DELAY_MS);
        controller.enqueue(step('storing', 'done', 'Stored in pgvector'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
