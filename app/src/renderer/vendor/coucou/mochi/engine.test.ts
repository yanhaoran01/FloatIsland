/**
 * @file engine.test.ts
 * @description Verifies reused Coucou interactions and FusionIsland's animation lifecycle boundary.
 * @author 鸡哥
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BotEngine, BOT_STATES } from './engine';
import { Sound } from '../core/sound';
import type { BotStateName } from '../core/layout';

vi.mock('../core/sound', () => ({ Sound: { play: vi.fn() } }));

describe('Coucou engine integration', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

  it('cancels delayed greeting sounds when the component is disposed', () => {
    const engine = new BotEngine();
    engine.greet();
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    engine.dispose();
    vi.runAllTimers();
    expect(Sound.play).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('preserves the original three-click dizzy interaction', () => {
    const engine = new BotEngine();
    const dizzy = vi.fn();
    engine.onDizzy = dizzy;
    engine.slap(); engine.slap(); engine.slap();
    expect(dizzy).toHaveBeenCalledTimes(1);
    expect(Sound.play).toHaveBeenCalledWith('slap');
    engine.dispose();
    vi.runAllTimers();
    expect(Sound.play).not.toHaveBeenCalledWith('annoyed');
  });

  it('cancels nested swallowing callbacks and releases animation state', () => {
    const engine = new BotEngine();
    engine.gulp();
    vi.advanceTimersByTime(460);
    expect(engine.isChewing).toBe(true);
    engine.settle();
    expect(engine.isChewing).toBe(false);
    expect(engine.slotH).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('renders all original state presets as stable reduced-motion frames', () => {
    const engine = new BotEngine();
    for (const name of Object.keys(BOT_STATES) as BotStateName[]) {
      engine.setState(name);
      engine.settle();
      expect(engine.state).toBe(name);
      expect(engine.badge).toBe(BOT_STATES[name].badge);
      expect(engine.col).toEqual(BOT_STATES[name].color);
      expect(engine.roll).toBe(0);
      expect(vi.getTimerCount()).toBe(0);
    }
    engine.dispose();
  });

  it('drops an earlier morph tween before swallowing a newly attached file', () => {
    const engine = new BotEngine();
    engine.animateMorph(0);
    engine.resetMorph();
    engine.morph = 1;
    engine.gulp();
    engine.settle();
    expect(engine.morph).toBe(1);
    engine.animateMorph(0);
    engine.settle();
    expect(engine.morph).toBe(0);
    engine.dispose();
  });
});
