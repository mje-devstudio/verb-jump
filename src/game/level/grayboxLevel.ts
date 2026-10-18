import { COMMUTE_VERBS } from '../data/verbs';
import type { LevelDef } from '../world';
import { parseAsciiMap } from './tilemap';

/**
 * 회색 상자 손맛·능력 확인용 맵(화면 높이 180px, 타일 10px). Tiled 맵(F08) 전까지 쓴다.
 * 낮은 담장 → 구멍 → 한 방향 발판 → 천장 → 언덕 → 발판 딛고 벽 넘기
 * → [climb·sleep] 7칸 벽 → [float·dance] 9칸 넓은 틈 → [break·brake] 금 간 벽 → 끝.
 * '#' 벽·땅, '-' 한 방향 발판, 'X' 금 간 벽, 'P' 시작 위치.
 */
export const GRAYBOX_LEVEL: readonly string[] = [
  '#                                                                                                                                                                                             #',
  '#                                                                                                                                                                                             #',
  '#                                                                                                                                                                                             #',
  '#                                                                                                                                                                                             #',
  '#                                                                                                                                                                                             #',
  '#                                                                                                                                                                                             #',
  '#                                                                                                                                                                                             #',
  '#                                                                                                                                                                                             #',
  '#                                                                                                                                                                                             #',
  '#                                                                                                                               ##                                        XX                  #',
  '#                                       ----                                                                                    ##                                        XX                  #',
  '#                                               ######                                                                          ##                                        XX                  #',
  '#                                                                                         ##                                    ##                                        XX                  #',
  '#                                 ----                                ######           -- ##                                    ##                                        XX                  #',
  '#       ##                                                            ######              ##                                    ##                                        XX                  #',
  '#  P    ##                                                            ######              ##                                    ##                                        XX                  #',
  '####################   ##############################################################   #########################################################         #####################################',
  '####################   ##############################################################   #########################################################         #####################################',
];

/** 능력이 있어야 건너는 틈(F29 점검에서 '구멍 착지'로 경고하지 않는다). */
export const GRAYBOX_ABILITY_GAPS: readonly [number, number][] = [[145, 153]];

const T = 10;
const at = (col: number, row: number) => ({ x: col * T, y: row * T });

export function grayboxLevel(): LevelDef {
  const { map, spawn } = parseAsciiMap(GRAYBOX_LEVEL);
  return {
    map,
    spawn,
    verbs: COMMUTE_VERBS,
    checkpoints: [spawn, at(96, 15), at(131, 15), at(156, 15), at(173, 15)],
    enemies: [
      { verb: 'climb', col: 108, row: 15 },
      { verb: 'sleep', col: 118, row: 15 },
      { verb: 'float', col: 136, row: 15 },
      { verb: 'dance', col: 140, row: 15 },
      { verb: 'break', col: 160, row: 15 },
      { verb: 'brake', col: 165, row: 15 },
    ],
  };
}
