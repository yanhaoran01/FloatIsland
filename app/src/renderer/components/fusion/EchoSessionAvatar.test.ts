/**
 * @file EchoSessionAvatar.test.ts
 * @description Checks original sprite timing and makes sure restored sessions cannot look active.
 * @author 鸡哥
 */
import { describe, expect, it } from 'vitest';
import { resolveEchoPose } from './EchoSessionAvatar';
import manifest from '../../public/echoisland/mascot/pet.json';

describe('EchoIsland sprite resource mapping', () => {
  it('keeps restored and unavailable snapshots asleep even if the saved status says processing', () => {
    expect(resolveEchoPose('Processing', true)).toBe('sleepy');
    expect(resolveEchoPose('Finished', true)).toBe('sleepy');
  });
  it('uses different upstream rows for running, approval, question, completion and errors', () => {
    expect(resolveEchoPose('Processing', false)).toBe('running');
    expect(resolveEchoPose('WaitingApproval', false)).toBe('approval');
    expect(resolveEchoPose('Question', false)).toBe('question');
    expect(resolveEchoPose('Finished', false)).toBe('complete');
    expect(resolveEchoPose('Failed', false)).toBe('wake_angry');
    expect(resolveEchoPose('Idle', false)).toBe('idle');
  });
  it('uses only valid sprite rows and preserves the pinned timing manifest', () => {
    expect(manifest.sprite.columns * manifest.sprite.rows).toBe(80);
    expect(manifest.animations.running.frame_ms).toBe(100);
    for (const animation of Object.values(manifest.animations)) {
      expect(animation.row).toBeLessThan(manifest.sprite.rows);
      expect(animation.frames).toBeLessThanOrEqual(manifest.sprite.columns);
      expect(animation.frame_ms).toBeGreaterThan(0);
    }
  });
});
