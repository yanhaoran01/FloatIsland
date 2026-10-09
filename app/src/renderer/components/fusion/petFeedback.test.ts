/* FusionIsland - https://github.com/JNTMTMTM/eIsland
 * Copyright (C) 2026 FusionIsland contributors. GPL-3.0. */
/** @file petFeedback.test.ts @description 内容反馈排除代码引用、优先级与动画连续性回归。 @author 鸡哥 */
import { describe,it,expect } from 'vitest';
import { contentReaction } from './petFeedback';
import { BotEngine } from '../../vendor/bloub/engine';
describe('offline content feedback',()=>{
  it('does not interpret quoted or executable content as a reaction',()=>{expect(contentReaction('```js\n// 请注意？ 谢谢\n```\n> wow?\n普通回复。')).toBe('idle');expect(contentReaction('`warning`\n    thanks?\n完成。')).toBe('idle');});
  it('uses reminders before questions and thanks',()=>{expect(contentReaction('请注意：需要检查。你想继续吗？谢谢。')).toBe('warning');expect(contentReaction('你希望选择哪一种？')).toBe('curious');expect(contentReaction('Thank you for the details.')).toBe('thanks');expect(contentReaction('哇，这个效果太棒了！')).toBe('surprised');});
  it('keeps ordinary responses neutral',()=>{expect(contentReaction('结果已经写入文件。')).toBe('idle');expect(contentReaction('')).toBe('idle');});
});
describe('pinned avatar engine',()=>{
  it('switches rapidly without jumping to an unrelated starting silhouette',()=>{const bot=new BotEngine();bot.setState('wide',0);const before=bot.sample(.1);bot.setState('idle',.1);const after=bot.sample(.1);expect(after.bodyPath).toBe(before.bodyPath);expect(after.eyes.length).toBe(before.eyes.length);});
  it('renders the same paused frame and rejects invalid pointer targets',()=>{const bot=new BotEngine();bot.setState('thinking',0);const frame=bot.sample(1);expect(bot.sample(1)).toEqual(frame);bot.setLook({yaw:NaN,pitch:0,mix:1,spin:0,wander:0},1);expect(bot.sample(1)).toEqual(frame);});
});
