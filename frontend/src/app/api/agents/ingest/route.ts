import { type NextRequest } from 'next/server';

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

export async function POST(request: NextRequest) {
  // Auth guard — require a Bearer token (real OAuth/SAML wired in Phase 2 backend)
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const fileName = file?.name ?? 'document';
  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : '?';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Upload received
        controller.enqueue(step('upload', 'done', `${fileName} received (${fileSizeMB} MB)`));
        await delay(DELAY_MS);

        // Parsing
        controller.enqueue(step('parsing', 'in_progress', 'Extracting text...'));
        await delay(DELAY_MS);
        controller.enqueue(step('parsing', 'done', 'Text extracted'));
        await delay(DELAY_MS);

        // Chunking
        controller.enqueue(step('chunking', 'in_progress', 'Splitting into chunks...'));
        await delay(DELAY_MS);
        controller.enqueue(step('chunking', 'done', '14 chunks created'));
        await delay(DELAY_MS);

        // Embedding
        controller.enqueue(step('embedding', 'in_progress', 'Generating embeddings...'));
        await delay(DELAY_MS * 2);
        controller.enqueue(step('embedding', 'done', '14 vectors generated'));
        await delay(DELAY_MS);

        // Storing
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
