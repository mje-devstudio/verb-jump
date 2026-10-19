import { DELAY_OPTIONS, devSettings, FAIL_OPTIONS, useDevSettings } from './devSettings';

const delayLabel = (ms: number) => (ms === 0 ? '없음' : `${ms / 1000}초`);
const failLabel = (r: number) => (r === 0 ? '끄기' : r === 1 ? '항상' : `${r * 100}%`);

/** F02 API 상황 재현 토글. 개발 빌드나 ?dev 주소에서만 보인다. */
export function DevPanel() {
  const s = useDevSettings();
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
    </details>
  );
}
