// 효과음 정의를 jsfxr 프리셋으로 한 번 만들어 고정한다(프리셋은 매번 무작위라 그대로 쓰면 소리가 판마다 바뀐다).
// 실행: npm run sfx:gen → src/game/audio/sfxDefs.ts. 마음에 드는 소리는 https://sfxr.me 에서 고쳐 JSON을 붙여 넣는다.
import { writeFileSync } from 'node:fs';
import { sfxr } from 'jsfxr';

const PLAN = {
  jump: 'jump', // 점프
  coin: 'pickupCoin', // 코인
  letter: 'pickupCoin', // 철자 코인(조금 낮게)
  verb: 'powerUp', // 맞는 동사 얻기
  joke: 'blipSelect', // 오답 동사 얻기·쓰기(웃긴 소리)
  ability: 'laserShoot', // 능력 쓰기 성공
  breakWall: 'explosion', // 금 간 벽 부수기
  hurt: 'hitHurt', // 맞기
  fall: 'hitHurt', // 구멍에 빠지기
  clear: 'powerUp', // 회사 문
};

const defs = {};
for (const [name, preset] of Object.entries(PLAN)) {
  const d = sfxr.generate(preset);
  d.sound_vol = 0.2;
  if (name === 'letter') d.p_base_freq *= 0.8;
  if (name === 'clear') d.p_env_sustain = Math.min(1, d.p_env_sustain * 2);
  if (name === 'joke') d.p_base_freq *= 0.6;
  defs[name] = d;
}

const body = `// scripts/gen-sfx.mjs로 만든 jsfxr 소리 정의(Unlicense). 손으로 고쳐도 된다.
import type { SfxrDef } from 'jsfxr';

export const SFX_DEFS = ${JSON.stringify(defs, null, 2)} satisfies Record<string, SfxrDef>;

export type SfxName = keyof typeof SFX_DEFS;
`;
writeFileSync(new URL('../src/game/audio/sfxDefs.ts', import.meta.url), body);
console.log('sfx:', Object.keys(defs).join(', '));
