/**
 * W3C Trace Context-aware fetch wrapper.
 * Generates a traceparent header per the W3C Trace Context spec
 * (https://www.w3.org/TR/trace-context/) and injects it into every request.
 * The Next.js proxy routes extract and forward this header to the backend,
 * where FastAPIInstrumentor continues the trace automatically.
 */
export function tracedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const traceId = crypto.randomUUID().replace(/-/g, '');
  const spanId = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  const traceparent = `00-${traceId}-${spanId}-01`;
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      traceparent,
    },
  });
}
