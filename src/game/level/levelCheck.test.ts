import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../../shared/rules/tuning';
import { GRAYBOX_LEVEL } from './grayboxLevel';
import { findEdges, findPitLandings, simulateEdgeJump } from './levelCheck';
import { parseAsciiMap } from './tilemap';

const flat = (gapAt: number, gapLen: number, cols = 40) => {
  const ground = '#'.repeat(gapAt) + ' '.repeat(gapLen) + '#'.repeat(cols - gapAt - gapLen);
  return parseAsciiMap([
    '#' + ' '.repeat(cols - 2) + '#',
    '#P' + ' '.repeat(cols - 3) + '#',
    ground,
  ]).map;
};

describe('레벨 점검(달려 뛰기 시뮬레이션)', () => {
  it('평지 달려 뛰기 거리는 PRD 기준(약 51px) 근처다', () => {
    const map = flat(10, 3);
    const r = simulateEdgeJump(map, DEFAULT_TUNING, { col: 9, row: 2, dir: 1 });
    expect(r.distance).not.toBeNull();
    expect(r.distance ?? 0).toBeGreaterThan(45);
    expect(r.distance ?? 0).toBeLessThan(60);
  });

  it('높이 3칸 발판에서 뛰면 평지보다 멀리 간다', () => {
    const { map } = parseAsciiMap([
      '#                                      #',
      '#                                      #',
      '#                                      #',
      '#                                      #',
      '#P  ####                               #',
      '#   ####                               #',
      '#   ####                               #',
      '########################################',
    ]);
    const high = simulateEdgeJump(map, DEFAULT_TUNING, { col: 7, row: 4, dir: 1 });
    const low = simulateEdgeJump(flat(10, 3), DEFAULT_TUNING, { col: 9, row: 2, dir: 1 });
    expect(high.distance ?? 0).toBeGreaterThan(low.distance ?? 0);
  });

  it('달려 뛰어도 못 건너는 넓은 구멍은 경고로 잡힌다', () => {
    const pits = findPitLandings(flat(10, 8), DEFAULT_TUNING);
    expect(pits.length).toBeGreaterThan(0);
  });

  it('회색 상자 맵은 모든 발판 끝에서 앞뒤로 달려 뛰어도 구멍에 빠지지 않는다', () => {
    const { map } = parseAsciiMap(GRAYBOX_LEVEL);
    expect(findEdges(map).length).toBeGreaterThan(10);
    const pits = findPitLandings(map, DEFAULT_TUNING).map(
      (p) => `col ${p.col} row ${p.row} dir ${p.dir}`,
    );
    expect(pits).toEqual([]);
  });
});
