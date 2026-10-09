/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file sound.test.ts @description Recording silence preserves mute preferences and stops active cues. @author 鸡哥 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('companion recording silence', () => {
  const playing: { play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn> }[] = [];
  beforeEach(() => {
    vi.resetModules(); playing.length = 0;
    vi.stubGlobal('document', { hidden: false, baseURI: 'file:///app/index.html' });
    vi.stubGlobal('Audio', class {
      volume = 0;
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      addEventListener = vi.fn();
      constructor() { playing.push(this); }
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('stops already playing sounds and suppresses every cue until recording releases', async () => {
    const { Sound } = await import('./sound');
    Sound.setActive(true); Sound.play('greet');
    expect(playing).toHaveLength(1);
    Sound.setSuppressed('recording', true); Sound.play('slap'); Sound.play('think');
    expect(playing[0].pause).toHaveBeenCalledOnce(); expect(playing).toHaveLength(1);
    Sound.setSuppressed('recording', false); Sound.play('finish');
    expect(playing).toHaveLength(2);
  });

  it('keeps user mute enabled after suppression is released', async () => {
    const { Sound } = await import('./sound');
    Sound.setActive(true); Sound.setEnabled(false);
    Sound.setSuppressed('recording', true); Sound.setSuppressed('recording', false); Sound.play('greet');
    expect(playing).toHaveLength(0);
  });

  it('requires all recording owners to release before cues resume', async () => {
    const { Sound } = await import('./sound');
    Sound.setActive(true); Sound.setSuppressed('a', true); Sound.setSuppressed('b', true);
    Sound.setSuppressed('a', false); Sound.play('work'); expect(playing).toHaveLength(0);
    Sound.setSuppressed('b', false); Sound.play('work'); expect(playing).toHaveLength(1);
  });
});
