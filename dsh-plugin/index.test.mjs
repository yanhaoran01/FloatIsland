/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file index.test.mjs @description 验证插件模型选择顺序及原生语音透传。 @author 鸡哥 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { startBridge } from './index.mjs';

test('native model catalog, selection-before-prompt and speech routing', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'fusion-plugin-test-'));
  const calls = [];
  let rejectSelection = false;
  const services = {
    sessionController: {
      modelCatalog: () => ({ groups: [{ id: 'provider', models: [{ id: 'model' }] }] }),
      selectModel: async request => { calls.push(['model', request]); if (rejectSelection) throw Error('model unavailable'); },
      prompt: async request => { calls.push(['prompt', request]); return { accepted: true }; },
    },
    speechController: {
      catalog: () => ({ selection: { providerId: 'native' } }),
      transcribe: async request => { calls.push(['speech', request]); return { text: 'native result' }; },
    },
  };
  const bridge = await startBridge({ get: name => services[name] }, { connectionFile: join(directory, 'bridge.json') });
  const rpc = async (method, args = {}) => (await fetch(bridge.endpoint + '/rpc', {
    method: 'POST', headers: { authorization: 'Bearer ' + bridge.token, 'content-type': 'application/json' },
    body: JSON.stringify({ method, args, requestId: randomUUID() }),
  })).json();
  try {
    assert.equal((await rpc('models')).value.groups[0].models[0].id, 'model');
    assert.equal(calls.length, 0, 'catalog must not create or resume a session');
    await rpc('prompt', { sessionId: 'test', requestId: 'request', text: 'message', model: { id: 'model', provider: 'provider' } });
    assert.deepEqual(calls.map(c => c[0]), ['model', 'prompt']);
    assert.deepEqual(calls[0][1], { sessionId: 'test', provider: 'provider', model: 'model' });
    rejectSelection = true;
    assert.match((await rpc('prompt', { sessionId: 'test', text: 'must not run', model: { id: 'bad', provider: 'provider' } })).error, /unavailable/);
    assert.equal(calls.filter(c => c[0] === 'prompt').length, 1);
    assert.equal((await rpc('speech/catalog')).value.selection.providerId, 'native');
    assert.equal((await rpc('speech/transcribe', { audioBase64: 'fixture', providerId: 'native', language: 'zh' })).value.text, 'native result');
    assert.deepEqual(calls.at(-1)[1], { audioBase64: 'fixture', providerId: 'native', language: 'zh' });
  } finally { await bridge.close(); rmdirSync(directory); }
});
