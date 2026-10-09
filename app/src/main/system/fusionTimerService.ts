/*
 * FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors
 * Licensed under GPL-3.0. See LICENSE.
 */

/** @file fusionTimerService.ts @description Main-owned persistent countdown shared by both windows. @author 鸡哥 */
import { app, ipcMain, Notification } from 'electron';
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs';
import { join } from 'path';
import type { FusionTimer } from '../../preload/types/fusionWorkspace';
import { broadcastFusion, isFusionView } from './fusionWindows';

/** Uses a wall-clock deadline so hiding windows and sleeping cannot pause the timer. */
export function registerFusionTimer(): void {
  const directory = join(app.getPath('userData'), 'fusion-workspace');
  const file = join(directory, 'timer.json');
  let state: FusionTimer = { state: 'idle', duration: 300, remaining: 300, deadline: null };
  try {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    if (['idle', 'running', 'paused', 'finished'].includes(saved.state) &&
        Number.isFinite(saved.remaining) && Number.isFinite(saved.duration) &&
        (saved.deadline === null || Number.isFinite(saved.deadline))) state = saved;
  } catch { /* initial timer */ }
  const persist = (): void => {
    mkdirSync(directory, { recursive: true });
    writeFileSync(file + '.tmp', JSON.stringify(state)); renameSync(file + '.tmp', file);
  };
  const publish = (): void => broadcastFusion('fusion:timer:updated', state);
  const tick = (): void => {
    if (state.state !== 'running' || state.deadline === null) return;
    const remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    if (remaining === state.remaining && remaining > 0) return;
    state = { ...state, remaining };
    if (!remaining) {
      state = { ...state, state: 'finished', deadline: null }; persist();
      let preferences: { muted?: boolean; completionReminders?: boolean } = {};
      try { preferences = JSON.parse(readFileSync(join(app.getPath('userData'), 'eIsland_store/fusion-preferences.json'), 'utf8')); } catch {}
      if (preferences.completionReminders !== false && Notification.isSupported()) {
        let english = false;
        try { english = JSON.parse(readFileSync(join(app.getPath('userData'), 'eIsland_store/i18n-language.json'), 'utf8')) === 'en-US'; } catch {}
        new Notification({ title: 'FusionIsland', body: english ? 'Your countdown has finished.' : '倒计时已结束。', silent: preferences.muted === true }).show();
      }
    }
    publish();
  };
  ipcMain.handle('fusion:timer:get', event => {
    if (!isFusionView(event.sender)) throw new Error('untrusted-view');
    tick(); return state;
  });
  ipcMain.handle('fusion:timer:control', (event, action: string, seconds?: number) => {
    if (!isFusionView(event.sender)) throw new Error('untrusted-view');
    tick();
    if (action === 'start') {
      if (!Number.isInteger(seconds) || seconds! < 1 || seconds! > 359999) throw new Error('invalid-timer-duration');
      state = { state: 'running', duration: seconds!, remaining: seconds!, deadline: Date.now() + seconds! * 1000 };
    } else if (action === 'pause' && state.state === 'running') state = { ...state, state: 'paused', deadline: null };
    else if (action === 'resume' && state.state === 'paused') state = { ...state, state: 'running', deadline: Date.now() + state.remaining * 1000 };
    else if (action === 'reset') state = { ...state, state: 'idle', remaining: state.duration, deadline: null };
    else throw new Error('invalid-timer-action');
    persist(); publish(); return state;
  });
  const interval = setInterval(tick, 1000);
  app.once('before-quit', () => { clearInterval(interval); persist(); });
  tick();
}
