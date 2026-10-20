import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseAsciiMap } from '../../game/level/tilemap';
import { COMMUTE_VERBS } from '../../game/data/verbs';
import type { LevelDef } from '../../game/world';
import { levelWarnings, runLevelCheck } from './levelWarnings';

function level(lines: string[]): LevelDef {
  const { map, spawn } = parseAsciiMap(lines);
  return { map, spawn, enemies: [], checkpoints: [spawn], verbs: COMMUTE_VERBS };
}
const PIT = level([
  '#' + ' '.repeat(38) + '#',
  '#P' + ' '.repeat(37) + '#',
  '#'.repeat(10) + ' '.repeat(8) + '#'.repeat(22),
]);
const SAFE = level(['#' + ' '.repeat(38) + '#', '#P' + ' '.repeat(37) + '#', '#'.repeat(40)]);

afterEach(() => vi.restoreAllMocks());

describe('F29 맵을 불러올 때 레벨 점검(개발 모드)', () => {
  it('경고를 저장소와 콘솔에 남기고, 같은 맵은 다시 점검하지 않는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await runLevelCheck(PIT);
    const first = levelWarnings.get();
    expect(first.status).toBe('checked');
    expect(first.warnings.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[레벨 점검]'));
    await runLevelCheck(PIT);
    expect(levelWarnings.get()).toBe(first);
  });

  it('구멍 없는 맵이면 경고 0건', async () => {
    await runLevelCheck(SAFE);
    expect(levelWarnings.get()).toMatchObject({ status: 'checked', warnings: [] });
  });
});
