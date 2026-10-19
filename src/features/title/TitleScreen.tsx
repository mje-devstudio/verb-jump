import { useEffect } from 'react';
import type { LevelDef } from '../../game/world';
import { loadGameFont } from '../../shared/lib/fonts';
import type { StageData } from '../../shared/stages/types';
import { loadBest } from '../result/bestRecord';
import { DotLoadingBar } from '../stage/DotLoadingBar';
import { useStage } from '../stage/useStage';
import { settings, useSettings } from '../settings/settings';

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="min-h-11 rounded border border-muted px-3 aria-checked:border-accent aria-checked:text-accent"
    >
      {label} {on ? '켜짐' : '꺼짐'}
    </button>
  );
}

/** S1 타이틀(F01): 스테이지를 불러오는 동안 도트 로딩 바, 실패하면 안내와 다시 시도. */
export function TitleScreen({
  stageId,
  onStart,
}: {
  stageId: string;
  onStart: (stage: StageData, level: LevelDef) => void;
}) {
  const { stage, level, status, error, retry } = useStage(stageId);
  const best = loadBest(stageId);
  const prefs = useSettings();
  // 게임 HUD 글꼴을 미리 받아 둔다(타이틀 자체는 쓰지 않아 첫 화면 속도에 영향이 적다)
  useEffect(() => {
    void loadGameFont();
  }, []);
  return (
    <section className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        버브 점프 <span className="text-base font-normal text-muted">(가제)</span>
      </h1>
      <div className="w-full rounded-md border border-muted/50 bg-panel p-4">
        <p className="text-lg font-bold">{stage?.title ?? 'STAGE 1'}</p>
        <p className="text-sm text-muted">
          8:57에 집을 나섰다. 9:00 전에 회사 문에 닿자. 동사 적을 밟으면 그 동사의 능력이 생긴다.
        </p>
        {best && (
          <p className="mt-2 text-sm">
            최고 기록 <strong>{best.score.toLocaleString()}점</strong> · {best.arrival} 도착
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Toggle label="효과음" on={prefs.sfx} onChange={(sfxOn) => settings.set({ sfx: sfxOn })} />
        <Toggle label="발음" on={prefs.speech} onChange={(speech) => settings.set({ speech })} />
      </div>
      {status === 'loading' && <DotLoadingBar />}
      {status === 'error' && (
        <div role="alert" className="flex flex-col items-center gap-2">
          <p>{error instanceof Error ? error.message : '스테이지를 불러오지 못했어요.'}</p>
          <button
            type="button"
            onClick={() => void retry()}
            className="min-h-11 rounded border border-accent px-4"
          >
            다시 시도
          </button>
        </div>
      )}
      {status === 'ready' && stage && level && (
        <button
          type="button"
          onClick={() => onStart(stage, level)}
          className="min-h-12 rounded-md bg-accent px-8 text-lg font-bold text-bg"
        >
          시작
        </button>
      )}
      <p className="text-sm text-muted">←→ 이동 · Space/Z 점프 · X 동사 능력 · Esc 일시정지</p>
    </section>
  );
}
