import test from 'node:test';
import assert from 'node:assert/strict';
import { ReadingError, readReadingResponse, requestReading } from '../lib/readingApi.mjs';

const encoder = new TextEncoder();
const sse = (text, chunkSize = 1) => {
    const bytes = encoder.encode(text);
    return new Response(new ReadableStream({
        start(controller) {
            for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize));
            controller.close();
        },
    }), { headers: { 'Content-Type': 'text/event-stream' } });
};
const success = () => sse('data: {"content":"기분이 좋으시군요. ✨"}\n\ndata: {"done":true}\n\n');

test('preserves Korean/emoji split at every byte, fragmented events and heartbeats', async () => {
    for (const size of [1, 2, 3, 7, 1024]) {
        const response = sse(': keepalive\r\n\r\ndata: {"content":"좋은 기분 ✨"}\r\n\r\n: keepalive\n\ndata: {"content":"을 이어가세요."}\n\ndata: {"done":true}\n\n', size);
        assert.equal(await readReadingResponse(response), '좋은 기분 ✨을 이어가세요.');
    }
});
test('supports a successful JSON response', async () => {
    assert.equal(await readReadingResponse(Response.json({success:true, interpretation:'해설입니다.'})), '해설입니다.');
});
test('rejects truncated and empty readings instead of accepting partial content', async () => {
    await assert.rejects(readReadingResponse(sse('data: {"content":"아직 미완성"}\n\n')), {code:'interrupted'});
    await assert.rejects(readReadingResponse(sse('data: {"done":true}\n\n')), {code:'interrupted'});
});
test('rejects malformed data and explicit provider errors', async () => {
    await assert.rejects(readReadingResponse(sse('data: {invalid}\n\n')), {code:'invalidResponse'});
    await assert.rejects(readReadingResponse(sse('data: {"content":"일부 해설"}\n\ndata: {"error":"실패","code":"busy","retryable":true}\n\n')), {code:'busy',retryable:true});
});
test('retries transient connection failure once using identical question/cards', async () => {
    const bodies = [];
    let retries = 0;
    const payload = {situation:'오늘 기분이 좋은데요.', allCards:[{id:19,isReversed:false}]};
    const text = await requestReading('/api/interpret-card', payload, {
        retryDelayMs:0, onRetry:()=>retries++, fetchImpl:async (_, options)=>{
            bodies.push(options.body);
            if (bodies.length === 1) throw new TypeError('Load failed');
            return success();
        },
    });
    assert.equal(text, '기분이 좋으시군요. ✨');
    assert.equal(retries, 1);
    assert.equal(bodies.length, 2);
    assert.equal(bodies[0], bodies[1]);
});
test('discards partial text before a retry', async () => {
    let count = 0;
    const text = await requestReading('/api/interpret-card', {}, {retryDelayMs:0,fetchImpl:async()=>
        ++count === 1 ? sse('data: {"content":"불완전한 해설"}\n\n') : success()});
    assert.equal(text, '기분이 좋으시군요. ✨');
});
test('does not retry HTTP 400 or configuration errors', async () => {
    for (const response of [new Response('bad input',{status:400}),Response.json({retryable:false},{status:503})]) {
        let count = 0;
        await assert.rejects(requestReading('/api/interpret-card', {}, {retryDelayMs:0,fetchImpl:async()=>{count++;return response;}}), ReadingError);
        assert.equal(count,1);
    }
});
test('retries HTTP 503 but stops after the configured limit', async () => {
    let count=0;
    await assert.rejects(requestReading('/api/interpret-card', {}, {retryDelayMs:0,fetchImpl:async()=>{
        count++;return new Response('unavailable',{status:503});
    }}), {code:'server'});
    assert.equal(count,2);
});
test('times out an unresponsive fetch and allows later manual retry', async () => {
    await assert.rejects(requestReading('/api/interpret-card', {}, {timeoutMs:10,retries:0,fetchImpl:(_, options)=>
        new Promise((_, reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError'))))
    }), {code:'timeout'});
    assert.equal(await requestReading('/api/interpret-card', {}, {fetchImpl:async()=>success()}), '기분이 좋으시군요. ✨');
});
test('cancels an active stream without retrying', async () => {
    const controller = new AbortController();
    let count=0;
    const promise = requestReading('/api/interpret-card', {}, {signal:controller.signal,fetchImpl:async (_,options)=>{
        count++;
        return new Response(new ReadableStream({start(stream){options.signal.addEventListener('abort',()=>stream.error(new DOMException('cancelled','AbortError')));}}), {headers:{'Content-Type':'text/event-stream'}});
    }});
    setTimeout(()=>controller.abort(),10);
    await assert.rejects(promise,{name:'AbortError'});
    assert.equal(count,1);
});
