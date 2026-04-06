import { type NextRequest } from 'next/server';

const CATALOG_ID = 'stub'; // must match the catalog ID registered in MessageProcessorProvider
const SURFACE_ID = 'qa-result';
const DELAY_MS = 350;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonLine(msg: object): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg) + '\n');
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') ?? '(no query)';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Message 1: Create the surface
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

        // Message 2: Define all components with static data
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
                  text: `This is a mock answer for: "${query}". In production this comes from a LangChain RAG agent querying your knowledge base via pgvector.`,
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
                    },
                    {
                      id: 's2',
                      title: 'Vector Database Architecture',
                      excerpt:
                        'Vector databases store high-dimensional embeddings that enable semantic similarity search over large document collections using approximate nearest-neighbour algorithms.',
                      score: 0.87,
                    },
                    {
                      id: 's3',
                      title: 'LangChain Retrieval Chains',
                      excerpt:
                        'LangChain provides composable retrieval chains that orchestrate document loading, embedding, vector store retrieval, and LLM generation in a single pipeline.',
                      score: 0.79,
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
