import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING, TILE } from '../../shared/rules/tuning';
import { GRAYBOX_ABILITY_GAPS, GRAYBOX_LEVEL } from './grayboxLevel';
import {
  checkLevel,
  describePit,
  findEdges,
  findPitLandings,
  groundRow,
  simulateEdgeJump,
} from './levelCheck';
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
  /** 땅 위 h칸 발판 끝에서 오른쪽으로 달려 뛰는 맵. */
  const ledge = (h: number) => {
    const rows = ['P' + ' '.repeat(39)];
    for (let r = 1; r <= 12; r++) {
      rows.push(r >= 13 - h ? '#   #####' + ' '.repeat(30) + '#' : '#' + ' '.repeat(38) + '#');
    }
    rows.push('#'.repeat(40));
    return { map: parseAsciiMap(rows).map, edge: { col: 8, row: 13 - h, dir: 1 as const } };
  };

  // 실험실 1/60초 시뮬레이션과 같은 값이어야 한다(PRD 레벨 설계 규칙의 거리).
  it.each([
    [0, 51.0, 34],
    [3, 60.0, 40],
    [6, 67.5, 45],
  ])('땅에서 %i칸 높이에서 달려 뛰면 %fpx, %i프레임', (h, dist, frames) => {
    const { map, edge } = ledge(h);
    const r = simulateEdgeJump(map, DEFAULT_TUNING, edge);
    expect(r.heightTiles).toBe(h);
    expect(r.distance).toBeCloseTo(dist, 5);
    expect(r.frames).toBe(frames);
  });

  it('높이는 맵 바닥이 아니라 땅 윗면부터 센다', () => {
    const { map } = parseAsciiMap([
      '#          #',
      '#          #',
      '#P  ###    #',
      '#   ###    #',
      '#   ###    #',
      '############',
      '############',
    ]);
    expect(groundRow(map)).toBe(5);
    const r = simulateEdgeJump(map, DEFAULT_TUNING, { col: 6, row: 2, dir: 1 });
    expect(r.heightTiles).toBe(3);
    expect(describePit({ ...r, landX: null })).toContain('땅에서 3칸');
  });

  it('능력용 틈은 따로 표시하지 않으면 경고로 잡히고, 표시하면 빠진다', () => {
    const { map } = parseAsciiMap(GRAYBOX_LEVEL);
    expect(findPitLandings(map, DEFAULT_TUNING).length).toBeGreaterThan(0);
    expect(findPitLandings(map, DEFAULT_TUNING, GRAYBOX_ABILITY_GAPS)).toEqual([]);
  });

  it('달려 뛰어도 못 건너는 넓은 구멍은 경고로 잡힌다', () => {
    const pits = findPitLandings(flat(10, 8), DEFAULT_TUNING);
    expect(pits.length).toBeGreaterThan(0);
  });

  it('회색 상자 맵은 모든 발판 끝에서 앞뒤로 달려 뛰어도 구멍에 빠지지 않는다', () => {
    const { map } = parseAsciiMap(GRAYBOX_LEVEL);
    expect(findEdges(map).length).toBeGreaterThan(10);
    const pits = findPitLandings(map, DEFAULT_TUNING, GRAYBOX_ABILITY_GAPS).map(
      (p) => `col ${p.col} row ${p.row} dir ${p.dir}`,
    );
    expect(pits).toEqual([]);
  });
});

describe('F29 맵을 불러올 때의 점검 결과(checkLevel)', () => {
  it('구멍 착지와 닿을 수 없는 철자 코인을 자리와 함께 경고한다', () => {
    // 8칸(80px) 구멍(달려 뛰어도 못 건넘)과, 땅에서 10칸 위 공중의 철자 코인(점프 최고 높이 약 4칸)
    const rows = ['#' + ' '.repeat(38) + '#'];
    for (let r = 1; r < 11; r++)
      rows.push(r === 10 ? '#P' + ' '.repeat(37) + '#' : (rows[0] ?? ''));
    rows.push('#'.repeat(10) + ' '.repeat(8) + '#'.repeat(22));
    const map = parseAsciiMap(rows).map;
    const warnings = checkLevel(
      { map, letters: [{ char: 'Q', x: 30 * TILE, y: 0, ability: 'none' }] },
      DEFAULT_TUNING,
    );
    const pits = warnings.filter((w) => w.kind === 'pit');
    expect(pits.length).toBeGreaterThan(0);
    expect(pits.every((w) => w.message.includes('구멍'))).toBe(true);
    expect(pits.some((w) => w.x === 9 * TILE)).toBe(true); // 구멍 왼쪽 끝 칸
    expect(warnings.filter((w) => w.kind === 'letter')).toEqual([
      expect.objectContaining({ x: 30 * TILE, y: 0, message: expect.stringContaining('Q') }),
    ]);
  });

  it('능력용 틈으로 표시한 구멍은 경고하지 않는다', () => {
    const map = flat(10, 8);
    expect(checkLevel({ map, abilityGaps: [[10, 17]] }, DEFAULT_TUNING)).toEqual([]);
  });
});
