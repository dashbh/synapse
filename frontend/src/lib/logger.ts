export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  session_id?: string | null;
  trace_id?: string | null;
  [key: string]: unknown;
}

interface LogRecord {
  timestamp: string;
  level: LogLevel;
  namespace: string;
  message: string;
  service_name: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, ctx?: LogContext): void;
  info(message: string, ctx?: LogContext): void;
  warn(message: string, ctx?: LogContext): void;
  error(message: string, ctx?: LogContext): void;
  child(extraCtx: LogContext): Logger;
}

const SERVICE_NAME = 'synapse-frontend';
const SEVERITY: Record<LogLevel, number> = { debug: 5, info: 9, warn: 13, error: 17 };

// Browser: buffer logs and flush via sendBeacon to /api/telemetry/log
const _buffer: LogRecord[] = [];
let _flushScheduled = false;

function _flush() {
  _flushScheduled = false;
  if (_buffer.length === 0) return;
  const batch = _buffer.splice(0);
  const body = JSON.stringify({ logs: batch });
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/telemetry/log', body);
    if (!sent) {
      // sendBeacon failed (>64KB or other), fall back to fetch
      fetch('/api/telemetry/log', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
    }
  }
}

function _enqueue(record: LogRecord) {
  _buffer.push(record);
  if (!_flushScheduled) {
    _flushScheduled = true;
    setTimeout(_flush, 0);
  }
}

function _emit(record: LogRecord) {
  if (typeof window === 'undefined') {
    // Server-side (Next.js API routes): write JSON to stdout
    process.stdout.write(JSON.stringify(record) + '\n');

    // Also forward directly to OTel Collector if URL is configured
    const collectorUrl = process.env.OTEL_COLLECTOR_URL;
    if (collectorUrl) {
      const otlpBody = _toOtlp([record]);
      fetch(`${collectorUrl}/v1/logs`, {
        method: 'POST',
        body: JSON.stringify(otlpBody),
        headers: { 'Content-Type': 'application/json' },
      }).catch(() => {});
    }
  } else {
    // Browser: print to DevTools console and enqueue for batch forwarding
    const consoleMethod = record.level === 'debug' ? 'debug'
      : record.level === 'info' ? 'info'
      : record.level === 'warn' ? 'warn'
      : 'error';
    const { timestamp: _ts, level: _lv, namespace, message, service_name: _sn, ...rest } = record;
    void _ts; void _lv; void _sn;
    console[consoleMethod](`[${namespace}] ${message}`, Object.keys(rest).length ? rest : '');
    _enqueue(record);
  }
}

function _toOtlp(records: LogRecord[]) {
  return {
    resourceLogs: [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: SERVICE_NAME } },
        ],
      },
      scopeLogs: [{
        scope: { name: 'fe.logger' },
        logRecords: records.map((r) => {
          const { timestamp, level, namespace, message, service_name: _sn, ...attrs } = r;
          void _sn;
          return {
            timeUnixNano: String(new Date(timestamp).getTime() * 1_000_000),
            severityNumber: SEVERITY[level],
            severityText: level.toUpperCase(),
            body: { stringValue: message },
            attributes: [
              { key: 'namespace', value: { stringValue: namespace } },
              ...Object.entries(attrs).map(([k, v]) => ({
                key: k,
                value: { stringValue: String(v ?? '') },
              })),
            ],
          };
        }),
      }],
    }],
  };
}

export { _toOtlp };

export function createLogger(namespace: string, defaultCtx: LogContext = {}): Logger {
  function log(level: LogLevel, message: string, ctx: LogContext = {}) {
    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      namespace,
      message,
      service_name: SERVICE_NAME,
      ...defaultCtx,
      ...ctx,
    };
    _emit(record);
  }

  return {
    debug: (msg, ctx) => log('debug', msg, ctx),
    info: (msg, ctx) => log('info', msg, ctx),
    warn: (msg, ctx) => log('warn', msg, ctx),
    error: (msg, ctx) => log('error', msg, ctx),
    child: (extraCtx) => createLogger(namespace, { ...defaultCtx, ...extraCtx }),
  };
}
