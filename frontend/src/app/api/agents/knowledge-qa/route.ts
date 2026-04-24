import { type NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('fe.api.knowledge-qa');

// ---------------------------------------------------------------------------
// When BACKEND_URL is set, proxy to the FastAPI backend.
// Otherwise fall back to the mock implementation (dev / no-backend mode).
// ---------------------------------------------------------------------------

const BACKEND_URL = process.env.BACKEND_URL; // e.g. http://localhost:8000

export async function POST(request: NextRequest) {
  if (BACKEND_URL) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') ?? '';
    const traceparent = request.headers.get('traceparent');
    const targetUrl = `${BACKEND_URL}/api/agents/knowledge-qa?${searchParams.toString()}`;

    log.info('query_proxy', { query: query.slice(0, 100), traceparent: traceparent ?? 'none' });

    const upstream = await fetch(targetUrl, {
      method: 'POST',
      signal: request.signal,
      headers: traceparent ? { traceparent } : {},
    });

    const backendTraceId = upstream.headers.get('X-Trace-ID');
    log.info('query_proxy_response', { status: upstream.status, trace_id: backendTraceId ?? '' });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store',
        'X-Accel-Buffering': 'no',
        ...(backendTraceId ? { 'X-Trace-ID': backendTraceId } : {}),
      },
    });
  }

  log.info('query_mock', {});
  return mockResponse(request);
}

// ---------------------------------------------------------------------------
// Mock — used when BACKEND_URL is not configured
// ---------------------------------------------------------------------------

const CATALOG_ID = 'stub';
const SURFACE_ID = 'qa-result';
const DELAY_MS = 350;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonLine(msg: object): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg) + '\n');
}

function mockResponse(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') ?? '(no query)';
  const category = searchParams.get('category') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  const filterNote = [
    category ? `category: ${category}` : '',
    dateFrom || dateTo ? `date: ${dateFrom || '*'} → ${dateTo || '*'}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          jsonLine({
            version: 'v0.9',
            createSurface: {
              surfaceId: SURFACE_ID,
              catalogId: CATALOG_ID,
            },
          })
        );

        await delay(DELAY_MS);

        controller.enqueue(
          jsonLine({
            version: 'v0.9',
            updateComponents: {
              surfaceId: SURFACE_ID,
              components: [
                {
                  component: 'Text',
                  id: 'answer-label',
                  text: 'Answer',
                  usageHint: 'h2',
                },
                {
                  component: 'Text',
                  id: 'answer-body',
                  text: `This is a mock answer for: "${query}".${filterNote ? ` (Filters applied — ${filterNote}.)` : ''} In production this comes from a LangChain RAG agent querying your knowledge base via pgvector.`,
                  usageHint: 'body',
                },
                {
                  component: 'Text',
                  id: 'sources-label',
                  text: 'Sources',
                  usageHint: 'h3',
                },
                {
                  component: 'SourceList',
                  id: 'sources-list',
                  sources: [
                    {
                      id: 's1',
                      title: 'Introduction to Retrieval-Augmented Generation',
                      excerpt:
                        'RAG combines the power of large language models with external knowledge retrieval, allowing models to access up-to-date information beyond their training data.',
                      score: 0.94,
                      document: 'ai-fundamentals.pdf',
                      section: 'Chapter 3: Retrieval Methods',
                      date: '2025-11-15',
                      category: 'AI/ML',
                    },
                    {
                      id: 's2',
                      title: 'Vector Database Architecture',
                      excerpt:
                        'Vector databases store high-dimensional embeddings that enable semantic similarity search over large document collections using approximate nearest-neighbour algorithms.',
                      score: 0.87,
                      document: 'infrastructure-guide.pdf',
                      section: 'Section 5: Storage Backends',
                      date: '2025-09-03',
                      category: 'Architecture',
                    },
                    {
                      id: 's3',
                      title: 'LangChain Retrieval Chains',
                      excerpt:
                        'LangChain provides composable retrieval chains that orchestrate document loading, embedding, vector store retrieval, and LLM generation in a single pipeline.',
                      score: 0.79,
                      document: 'langchain-cookbook.pdf',
                      section: 'Part II: Chains',
                      date: '2026-01-22',
                      category: 'AI/ML',
                    },
                  ],
                },
              ],
            },
          })
        );
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
