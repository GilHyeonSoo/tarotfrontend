export class ReadingError extends Error {
    constructor(code, retryable = false, retryAfterMs = 0) {
        super(code);
        this.name = 'ReadingError';
        this.code = code;
        this.retryable = retryable;
        this.retryAfterMs = retryAfterMs;
    }
}

const abortError = () => new DOMException('Reading cancelled', 'AbortError');

// Fetch chunks are arbitrary byte boundaries, not SSE messages or UTF-8 boundaries.
export async function readReadingResponse(response) {
    if (!response.ok) {
        let retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        if ((response.headers.get('content-type') || '').includes('application/json')) {
            const data = await response.json().catch(() => null);
            if (data?.retryable === false) retryable = false;
        }
        const retryAfter = Number(response.headers.get('retry-after'));
        throw new ReadingError(response.status === 429 ? 'busy' : 'server', retryable,
            Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 5000) : 0);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.success && typeof data.interpretation === 'string' && data.interpretation.trim()) {
            return data.interpretation;
        }
        throw new ReadingError('server', data.retryable === true);
    }
    if (!contentType.includes('text/event-stream') || !response.body?.getReader) {
        throw new ReadingError('invalidResponse', true);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let complete = false;

    const processEvent = (event) => {
        const payload = event.split(/\r\n|\r|\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).replace(/^ /, ''))
            .join('\n');
        if (!payload) return; // comments/heartbeats
        let data;
        try {
            data = JSON.parse(payload);
        } catch {
            throw new ReadingError('invalidResponse', true);
        }
        if (data.error) throw new ReadingError(data.code || 'server', data.retryable === true);
        if (typeof data.content === 'string') text += data.content;
        if (data.done === true) complete = true;
    };

    try {
        while (!complete) {
            const { value, done } = await reader.read();
            buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
            let boundary;
            while ((boundary = /\r\n\r\n|\n\n|\r\r/.exec(buffer))) {
                const event = buffer.slice(0, boundary.index);
                buffer = buffer.slice(boundary.index + boundary[0].length);
                processEvent(event);
                if (complete) break;
            }
            if (done) break;
        }
        // EOF without a completion event is an interrupted reading, never a success.
        if (!complete || !text.trim()) throw new ReadingError('interrupted', true);
        return text;
    } finally {
        await reader.cancel().catch(() => {});
        reader.releaseLock();
    }
}

const waitToRetry = (ms, signal) => new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const cancelled = () => {
        clearTimeout(timer);
        reject(abortError());
    };
    const timer = setTimeout(() => {
        signal?.removeEventListener('abort', cancelled);
        resolve();
    }, ms);
    signal?.addEventListener('abort', cancelled, { once: true });
});

export async function requestReading(url, payload, {
    signal,
    onRetry = () => {},
    fetchImpl = fetch,
    timeoutMs = 110000,
    retries = 1,
    retryDelayMs = 1000,
} = {}) {
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        if (signal?.aborted) throw abortError();
        const controller = new AbortController();
        let timedOut = false;
        const cancel = () => controller.abort();
        signal?.addEventListener('abort', cancel, { once: true });
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, timeoutMs);
        let failure;
        try {
            const response = await fetchImpl(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
                body: JSON.stringify(payload),
                cache: 'no-store',
                signal: controller.signal,
            });
            const text = await readReadingResponse(response);
            if (signal?.aborted) throw abortError();
            return text;
        } catch (error) {
            if (signal?.aborted) throw abortError();
            failure = timedOut ? new ReadingError('timeout', true)
                : error instanceof ReadingError ? error : new ReadingError('connection', true);
        } finally {
            clearTimeout(timer);
            signal?.removeEventListener('abort', cancel);
        }
        if (!failure.retryable || attempt === retries) throw failure;
        onRetry();
        await waitToRetry(Math.max(retryDelayMs, failure.retryAfterMs), signal);
    }
}
