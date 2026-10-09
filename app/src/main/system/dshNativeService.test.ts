/*
 * FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors
 * Licensed under GPL-3.0. See LICENSE.
 */
/** @file dshNativeService.test.ts @description 原生会话同步、广播去重与请求生命周期回归。 @author 鸡哥 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDshNativeService } from './dshNativeService';

vi.mock('fs', () => ({ readFileSync: () => JSON.stringify({ endpoint: 'http://127.0.0.1:12345', token: 'a'.repeat(64) }) }));

const settle = () => new Promise(resolve => setTimeout(resolve, 75));
describe('DeepSeek Harness native synchronization', () => {
  let service: ReturnType<typeof createDshNativeService>;
  let changed: ReturnType<typeof vi.fn<() => void>>;
  let rows: any[];
  let frames: Map<string, ReadableStreamDefaultController<Uint8Array>>;
  let calls: any[];
  let listResult: (() => Promise<any>) | undefined;
  let speechCatalog: any;
  const emit = (path: string, frame: unknown) => frames.get(path)!.enqueue(new TextEncoder().encode(JSON.stringify(frame) + '\n'));
  const event = (id: string, seq: number, type: string, data = {}) => emit('/follow?sessionId=' + id, { type: 'event', event: { seq, type, data } });
  const chunk = (id: string, index: number, value: object) => emit('/follow?sessionId=' + id, { type: 'assistant-stream', frame: { type: 'chunk', attemptId: id, index, chunk: value } });

  beforeEach(async () => {
    rows = [{ sessionId: 'a', running: true, cwd: 'C:/a' }, { sessionId: 'b', running: true, cwd: 'C:/b' }];
    frames = new Map(); calls = []; listResult = undefined; changed = vi.fn(); speechCatalog = null;
    vi.stubGlobal('fetch', vi.fn(async (input: string, init: RequestInit) => {
      const url = new URL(input);
      expect((init.headers as any).authorization).toBe('Bearer ' + 'a'.repeat(64));
      if (url.pathname === '/rpc') {
        const body = JSON.parse(init.body as string); calls.push(body);
        return { ok: true, json: async () => ({ value: body.method === 'list' ? await (listResult?.() ?? Promise.resolve({ items: rows })) : body.method === 'speech/catalog' ? speechCatalog : {} }) };
      }
      return new Response(new ReadableStream<Uint8Array>({ start(controller) {
        frames.set(url.pathname + url.search, controller);
        init.signal!.addEventListener('abort', () => {
          // 断线用例可能已由服务端关闭模拟流。
          try { controller.close(); } catch { /* already closed */ }
        }, { once: true });
      } }));
    }));
    service = createDshNativeService(changed, 'fixture-connection.json');
    await service.loadSessions(); await settle(); changed.mockClear();
  });
  afterEach(async () => { await service.stop(); vi.unstubAllGlobals(); });

  it('does not broadcast unchanged discovery polls', async () => {
    for (let i = 0; i < 5; i++) { await service.loadSessions(); await settle(); }
    expect(changed).not.toHaveBeenCalled();
    rows[0].running = false;
    await service.loadSessions(); await settle();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(service.getSnapshot().sessionStates!.a.working).toBe(false);
  });

  it.each(['ready', 'standby'])('allows native voice when the provider is %s', async phase => {
    speechCatalog = { providers: [{ id: 'sensevoice-local', preparation: { phase } }], selection: { providerId: 'sensevoice-local', language: 'zh' } };
    expect(await service.speechStatus()).toMatchObject({ available: true, ready: true, providerId: 'sensevoice-local', language: 'zh' });
  });

  it('forwards the selected model only to its owned prompt session', async () => {
    rows[0].running = false;
    await service.resumeSession('a');
    await service.prompt('a', 'test prompt', { id: 'model', name: 'Model', provider: 'provider' });
    expect(calls.find(c => c.method === 'prompt').args).toMatchObject({ sessionId: 'a', text: 'test prompt', model: { id: 'model', provider: 'provider' } });
    await expect(service.prompt('b', 'not owned', { id: 'model', name: 'Model' })).rejects.toThrow('select-session-before-sending');
  });

  it.each(['unprepared', 'preparing', 'failed', 'cancelled'])('does not record when the provider is %s', async phase => {
    speechCatalog = { providers: [{ id: 'sensevoice-local', preparation: { phase } }], selection: { providerId: 'sensevoice-local' } };
    expect(await service.speechStatus()).toMatchObject({ available: true, ready: false, reason: phase });
  });

  it('ignores duplicate events and metadata without dropping later messages', async () => {
    event('a', 1, 'user/message', { id: 'u', content: 'hello' }); await settle(); changed.mockClear();
    event('a', 1, 'user/message', { id: 'u', content: 'duplicate' });
    for (let i = 2; i < 1002; i++) event('a', i, 'metadata');
    await settle(); expect(changed).not.toHaveBeenCalled();
    event('a', 1002, 'assistant/message', { id: 'r', content: 'reply' }); await settle();
    expect(service.getSnapshot().sessionStates!.a.messages.map(m => m.text)).toEqual(['hello', 'reply']);
  });

  it('coalesces a burst, keeps all text, isolates sessions and preserves tool order', async () => {
    for (const id of ['a', 'b']) emit('/follow?sessionId=' + id, { type: 'assistant-stream', frame: { type: 'start', attemptId: id } });
    chunk('a', 0, { type: 'text-delta', text: 'A' });
    chunk('a', 1, { type: 'tool-call-delta', id: 'tool', name: 'read', argumentsDelta: '{' });
    for (let i = 2; i < 502; i++) chunk('a', i, { type: 'text-delta', text: 'x' });
    chunk('b', 0, { type: 'text-delta', text: 'B' });
    await settle();
    expect(changed).toHaveBeenCalledTimes(1);
    const state = service.getSnapshot();
    expect(state.sessionStates!.a.messages.map(m => m.id)).toEqual(['stream:a', 'stream-tool:tool']);
    expect(state.sessionStates!.a.messages[0].text).toBe('A' + 'x'.repeat(500));
    expect(state.sessionStates!.b.messages[0].text).toBe('B');
    changed.mockClear();
    chunk('a', 502, { type: 'usage', tokens: 200 }); await settle();
    expect(changed).not.toHaveBeenCalled();
    state.sessionStates!.a.messages[0].text = 'mutated outside';
    expect(service.getSnapshot().sessionStates!.a.messages[0].text).toBe('A' + 'x'.repeat(500));
  });

  it('retains submitted approval until source confirmation and rejects duplicate answers', async () => {
    emit('/events', { type: 'ready', clientId: 'client' });
    emit('/events', { type: 'waterfall', event: 'approval/request', eventId: 'request', agentId: 'b', request: { tool: 'shell', reason: 'run command' } });
    await settle();
    await service.answerPermission('request', 'allowed-once');
    expect(service.getSnapshot().pendingRequests[0]).toMatchObject({ sessionId: 'b', submitted: true });
    await expect(service.answerPermission('request', 'allowed-once')).rejects.toThrow('request-already-submitted');
    expect(calls.filter(c => c.method === 'interaction/answer')).toHaveLength(1);
    emit('/events', { type: 'cancel', eventId: 'request' }); await settle();
    expect(service.getSnapshot().pendingRequests).toEqual([]);
    await expect(service.answerPermission('request', 'allowed-once')).rejects.toThrow('request-expired');
  });

  it('publishes an explicit session selection even when discovery has not changed', async () => {
    event('a', 1, 'user/message', { id: 'a1', content: 'session A' });
    event('b', 1, 'user/message', { id: 'b1', content: 'session B' });
    await settle(); changed.mockClear();
    await service.resumeSession('a'); await settle();
    expect(service.getSnapshot().messages[0].text).toBe('session A');
    await service.resumeSession('b'); await settle();
    expect(service.getSnapshot().messages[0].text).toBe('session B');
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('withdraws requests when the interaction stream disconnects', async () => {
    emit('/events', { type: 'ready', clientId: 'client' });
    emit('/events', { type: 'waterfall', event: 'user-questions/request', eventId: 'question', agentId: 'a', request: { questions: [{ id: 'q', question: 'where?' }] } });
    await settle(); expect(service.getSnapshot().pendingRequests).toHaveLength(1);
    frames.get('/events')!.close(); await settle();
    expect(service.getSnapshot().pendingRequests).toEqual([]);
    await expect(service.answerQuestions('question', {})).rejects.toThrow('request-expired');
  });

  it('does not resurrect a stopped service when an old list response finishes parsing', async () => {
    let release!: (value: any) => void;
    listResult = () => new Promise(resolve => { release = resolve; });
    const pending = service.loadSessions();
    await Promise.resolve(); await Promise.resolve();
    await service.stop(); changed.mockClear();
    release({ items: [{ sessionId: 'late', running: true }] });
    await pending; await settle();
    expect(service.getSnapshot().state).toBe('stopped');
    expect(service.getSnapshot().sessions.some(s => s.id === 'late')).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });
});
