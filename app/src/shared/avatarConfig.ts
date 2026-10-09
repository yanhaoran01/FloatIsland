/* FusionIsland - Copyright (C) 2026 contributors. GPL-3.0. */
/** @file avatarConfig.ts @description Versioned offline character preferences shared by both processes. @author 鸡哥 */
export const AVATAR_SHAPES = ['cercle','galet','squircle','capsule','triangle','hexagone','nuage','goutte'] as const;
export const AVATAR_EXPRESSIONS = ['neutre','attentif','surpris','excite','heureux','hilare','colere','triste','effraye','mefiant','confus','curieux','fier','timide','blase','somnolent'] as const;
export interface AvatarConfig { version: 1; shape: typeof AVATAR_SHAPES[number]; expression: typeof AVATAR_EXPRESSIONS[number]; }
export const DEFAULT_AVATAR: AvatarConfig = {version:1,shape:'cercle',expression:'neutre'};
/** Validates stored configuration without changing unrelated settings. */
export function validAvatar(value: unknown): value is AvatarConfig {
  if (!value || typeof value !== 'object') return false;
  const item=value as Partial<AvatarConfig>;
  return item.version===1 && AVATAR_SHAPES.some(id=>id===item.shape) && AVATAR_EXPRESSIONS.some(id=>id===item.expression);
}
/** Returns a fresh default when a saved version or identifier is unsupported. */
export function normalizeAvatar(value: unknown): AvatarConfig { return validAvatar(value) ? {...value} : {...DEFAULT_AVATAR}; }
