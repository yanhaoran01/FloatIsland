/** @file avatarController.test.ts @description All pinned poses and interruptible actions regression. @author 鸡哥 */
import { describe, it, expect } from 'vitest';
import { AvatarController, actionDuration } from './avatarController';
import { BotEngine } from '../../vendor/bloub/engine';
import { STATES, POSES } from '../../vendor/bloub/states';
import { SHAPE_BY_ID } from '../../vendor/bloub/skins';
import { EXPRESSION_BY_ID } from '../../vendor/bloub/expressions';
import { AVATAR_SHAPES, AVATAR_EXPRESSIONS, normalizeAvatar, DEFAULT_AVATAR } from '../../../shared/avatarConfig';
describe('complete local character', () => {
 it('samples all eight shapes and sixteen expressions without invalid SVG geometry', () => {
  expect(AVATAR_SHAPES).toHaveLength(8);expect(AVATAR_EXPRESSIONS).toHaveLength(16);
  for(const shape of AVATAR_SHAPES)for(const expression of AVATAR_EXPRESSIONS){const engine=new BotEngine(100);engine.setShape(SHAPE_BY_ID.get(shape)!.radii,-10);engine.setExpression(EXPRESSION_BY_ID.get(expression)!,-10);const frame=engine.sample(0);expect(frame.bodyPath).not.toMatch(/NaN|Infinity/);expect(frame.eyes).toHaveLength(2);}
 });
 it.each(STATES.map(state=>[state.id] as const))('completes %s once, then returns to idle', id => {
  const controller=new AvatarController();const first=controller.sync('idle',id,1,0);expect(first.state).toBe(id);
  const duration=actionDuration(id);expect(controller.sample(duration-.001).id).toBe(first.id);expect(controller.sample(duration).state).toBe('idle');expect(controller.sync('idle',id,1,duration+1).source).toBe('idle');
  const engine=new BotEngine(100);engine.reset(id,0);for(const time of [0,POSES[id],duration/2,duration]){expect(engine.sample(time).bodyPath).not.toMatch(/NaN|Infinity/);}
 });
 it('preempts previews with real status and does not restart it for irrelevant preview changes',()=>{
  const controller=new AvatarController();controller.sync('idle','comet',1,0);const error=controller.sync('error','comet',1,.2);expect(error.source).toBe('status');expect(error.state).toBe('exclaim');expect(controller.sync('error','burst',2,.3).id).toBe(error.id);
  expect(controller.sync('listening','burst',2,.4).source).toBe('status');expect(controller.sync('thinking',undefined,3,.5).state).toBe('thinking');controller.cancel(.6);expect(controller.sample(.6).state).toBe('idle');
 });
 it('rejects corrupt configuration and preserves valid choices',()=>{expect(normalizeAvatar({version:99,shape:'evil'})).toEqual(DEFAULT_AVATAR);expect(normalizeAvatar({version:1,shape:'nuage',expression:'curieux'})).toEqual({version:1,shape:'nuage',expression:'curieux'});});
});
