/* FloatIsland - https://github.com/yanhaoran01/FloatIsland
 * Copyright (C) 2026 contributors. GPL-3.0.
 * Poke timing adapted from mortspace/feral-blob (MIT), pinned 3a5feee7.
 * See resources/licenses/character-interactions/ for upstream notices. */
/** @file avatarInteractions.ts @description Local, cancellable character gestures and shuffled reactions. @author 鸡哥 */
import type { StateId } from '../../vendor/bloub/states';

export const CLICK_ACTIONS: readonly StateId[] = ['wink', 'wide', 'notify', 'orbit', 'burst', 'comet'];
const POKE_WINDOW = 2.5, POKE_LIMIT = 6, WAKE_POKES = 3;
export interface GestureFrame { scale: number; rotation: number; }

/** Samples the upstream poke/shake gestures without another renderer or wall-clock timers. */
export class AvatarInteractions {
  private clicks: number[] = [];
  private sleepPokes = 0;
  private bag: StateId[] = [];
  private last: StateId | undefined;
  private gestureStart = -Infinity;
  private shake = false;
  constructor(private readonly random: () => number = Math.random) {}

  /** Records one accepted click. Returns whether a sleep preview should be released. */
  tap(now: number, sleeping: boolean): { wake: boolean; overpoke: boolean } {
    this.clicks = this.clicks.filter(time => now - time <= POKE_WINDOW);
    this.clicks.push(now);
    const overpoke = this.clicks.length >= POKE_LIMIT;
    this.gestureStart = now;
    this.shake = overpoke;
    if (overpoke) this.clicks = [];
    this.sleepPokes = sleeping ? this.sleepPokes + 1 : 0;
    const wake = sleeping && this.sleepPokes >= WAKE_POKES;
    if (wake) this.sleepPokes = 0;
    return { wake, overpoke };
  }

  /** Fisher–Yates bag; the first action of a fresh bag differs from the previous one. */
  nextAction(): StateId {
    if (!this.bag.length) {
      this.bag = [...CLICK_ACTIONS];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
      if (this.bag[this.bag.length - 1] === this.last) [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
    }
    this.last = this.bag.pop()!;
    return this.last;
  }

  /** Small transforms affect only the actor, with an exact neutral end frame. */
  sample(now: number, reduced = false): GestureFrame {
    const elapsed = now - this.gestureStart;
    if (reduced || elapsed < 0 || elapsed >= .48) return { scale: 1, rotation: 0 };
    const envelope = Math.sin(Math.PI * elapsed / .48);
    return { scale: 1 - .08 * envelope, rotation: (this.shake ? 8 : 4) * Math.sin(elapsed / .48 * Math.PI * (this.shake ? 6 : 2)) * envelope };
  }

  /** Drops old gestures at a session boundary or a higher-priority state. */
  clear(): void { this.clicks = []; this.sleepPokes = 0; this.gestureStart = -Infinity; this.shake = false; }
}
