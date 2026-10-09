/*
 * FusionIsland - A private Windows companion for local coding agents.
 * Copyright (C) 2026 FusionIsland contributors
 * Licensed under GPL-3.0. See the project license for details.
 */

/**
 * @file echoCodexSessionCache.test.ts
 * @description Tests encrypted, age-limited recovery of external Codex session summaries.
 * @author 鸡哥
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createEchoCodexSessionCache } from '../echoCodexSessionCache';

const NOW = Date.parse('2026-10-06T00:00:00.000Z');
const session = {
  sessionId: 'thread-123',
  source: 'codex',
  cwd: 'C:\\Projects\\demo',
  projectName: 'demo',
  model: 'gpt-5',
  status: 'Processing',
  currentTool: 'shell',
  lastUserPrompt: 'private prompt text',
  lastAssistantMessage: 'private answer text',
  lastActivity: '2026-10-05T23:55:00.000Z',
  windowTitle: 'Codex',
};

describe('createEchoCodexSessionCache', () => {
  let root = '';
  let filePath = '';

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fusion-echo-cache-'));
    filePath = join(root, 'nested', 'sessions.bin');
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('encrypts live summaries and restores them with a non-live state', () => {
    const cache = createEchoCodexSessionCache({
      getFilePath: () => filePath,
      isEncryptionAvailable: () => true,
      encryptString: (value) => Buffer.from(value, 'utf8').toString('base64'),
      decryptString: (value) => Buffer.from(value, 'base64').toString('utf8'),
      now: () => NOW,
    });

    cache.save({ state: 'ready', updatedAt: '2026-10-05T23:56:00.000Z', sessions: [session] });

    const encrypted = readFileSync(filePath, 'utf8');
    expect(encrypted).not.toContain('private prompt text');
    expect(encrypted).not.toContain('private answer text');
    expect(cache.load()).toEqual({
      state: 'restored',
      updatedAt: '2026-10-05T23:56:00.000Z',
      sessions: [session],
    });
  });

  it('does not restore summaries older than fourteen days', () => {
    const encrypt = (value: string): string => Buffer.from(value, 'utf8').toString('base64');
    const decrypt = (value: string): string => Buffer.from(value, 'base64').toString('utf8');
    const recent = createEchoCodexSessionCache({
      getFilePath: () => filePath,
      isEncryptionAvailable: () => true,
      encryptString: encrypt,
      decryptString: decrypt,
      now: () => NOW,
    });
    recent.save({ state: 'ready', updatedAt: '2026-10-05T23:56:00.000Z', sessions: [session] });

    const expired = createEchoCodexSessionCache({
      getFilePath: () => filePath,
      isEncryptionAvailable: () => true,
      encryptString: encrypt,
      decryptString: decrypt,
      now: () => NOW + 15 * 24 * 60 * 60 * 1000,
    });

    expect(expired.load()).toBeNull();
  });

  it('skips disk access when OS encryption is unavailable', () => {
    const cache = createEchoCodexSessionCache({
      getFilePath: () => filePath,
      isEncryptionAvailable: () => false,
      encryptString: (value) => value,
      decryptString: (value) => value,
      now: () => NOW,
    });

    cache.save({ state: 'ready', updatedAt: new Date(NOW).toISOString(), sessions: [session] });

    expect(existsSync(filePath)).toBe(false);
    expect(cache.load()).toBeNull();
  });
});
