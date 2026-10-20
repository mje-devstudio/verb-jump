import { DELAY_OPTIONS, devSettings, FAIL_OPTIONS, useDevSettings } from './devSettings';
import { useLevelWarnings } from './levelWarnings';

const delayLabel = (ms: number) => (ms === 0 ? '없음' : `${ms / 1000}초`);
const failLabel = (r: number) => (r === 0 ? '끄기' : r === 1 ? '항상' : `${r * 100}%`);

/** 개발자 토글: F02 API 상황 재현, F29 레벨 점검 결과. 개발 빌드나 ?dev 주소에서만 보인다. */
export function DevPanel() {
  const s = useDevSettings();
  const check = useLevelWarnings();
  return (
    <details className="fixed left-[max(8px,env(safe-area-inset-left))] top-16 z-50 rounded-md border border-muted/50 bg-panel/95 px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none">개발자 토글</summary>
      <fieldset className="mt-2">
        <legend className="text-muted">API 지연</legend>
        <div className="flex gap-1">
          {DELAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={s.delayMs === d}
              onClick={() => devSettings.set({ delayMs: d })}
              className="min-h-11 rounded border border-muted px-2 aria-pressed:bg-accent aria-pressed:text-bg"
            >
              {delayLabel(d)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-2">
        <legend className="text-muted">API 실패</legend>
        <div className="flex gap-1">
          {FAIL_OPTIONS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={s.failRate === f}
              onClick={() => devSettings.set({ failRate: f })}
              className="min-h-11 rounded border border-muted px-2 aria-pressed:bg-accent aria-pressed:text-bg"
            >
              {failLabel(f)}
            </button>
          ))}
        </div>
      </fieldset>
      <section className="mt-2 max-w-72" aria-labelledby="level-check">
        <h2 id="level-check" className="text-muted">
          레벨 점검
        </h2>
        {check.status === 'idle' && <p>맵을 불러오면 점검해요</p>}
        {check.status === 'failed' && (
          <p className="text-late">점검을 돌리지 못했어요(콘솔 확인)</p>
        )}
        {check.status === 'checked' && (
          <>
            <p className={check.warnings.length ? 'text-late' : 'text-ok'}>
              경고 {check.warnings.length}건 · {check.ms}ms
            </p>
            {check.warnings.length > 0 && (
              <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-4 text-xs">
                {check.warnings.map((w) => (
                  <li key={`${w.kind}-${w.x}-${w.y}-${w.message}`}>{w.message}</li>
                ))}
              </ul>
            )}
          </>
        )}
        <label className="mt-1 flex min-h-11 items-center gap-2">
          <input
            type="checkbox"
            checked={s.showLevelMarks}
            onChange={(e) => devSettings.set({ showLevelMarks: e.target.checked })}
          />
          게임 화면에 경고 자리 표시
        </label>
      </section>
    </details>
  );
}
