import { ABILITIES } from '../../game/abilities/registry';
import type { VerbEntry } from '../../game/data/verbs';
import { speak } from '../../shared/lib/tts';
import { useMetVerbs } from './metVerbs';
import { settings } from '../settings/settings';

/**
 * F17 동사 도감. 스테이지 동사를 데이터 순서로 보여 주고, 만난 동사는 뜻·발음·예문을 다시 본다.
 * 아직 만나지 않은 동사는 가려 둔다(직접 밟아 보게).
 */
export function VerbBook({ verbs }: { verbs: Readonly<Record<string, VerbEntry>> }) {
  const met = useMetVerbs();
  const names = Object.keys(verbs);
  const metCount = names.filter((v) => met.includes(v)).length;
  return (
    <section aria-labelledby="verb-book-title" className="text-left">
      <h2 id="verb-book-title" className="text-lg font-bold">
        동사 도감{' '}
        <span className="text-sm font-normal text-muted">
          {metCount} / {names.length}
        </span>
      </h2>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {names.map((verb) => {
          const entry = verbs[verb];
          if (!entry) return null;
          if (!met.includes(verb)) {
            return (
              <li
                key={verb}
                className="rounded border border-dashed border-muted/60 px-3 py-2 text-muted"
              >
                ??? <span className="text-xs">· 아직 만나지 않은 동사</span>
              </li>
            );
          }
          const correct = ABILITIES[entry.ability].correct;
          return (
            <li
              key={verb}
              className={`rounded border px-3 py-2 ${correct ? 'border-accent' : 'border-dashed border-joke'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p>
                  <strong className="text-lg">{verb}</strong>{' '}
                  <span className="text-sm text-muted">{entry.phonetic}</span>
                </p>
                <button
                  type="button"
                  onClick={() => speak(verb, { volume: settings.get().speechVolume })}
                  aria-label={`${verb} 발음 듣기`}
                  className="min-h-11 min-w-11 rounded border border-muted px-2 text-sm hover:bg-white/10"
                >
                  듣기
                </button>
              </div>
              <p>
                {entry.meaning}
                {!correct && <span className="ml-1 text-xs text-joke">(오답 동사)</span>}
              </p>
              {entry.alsoMeans && <p className="text-sm text-muted">다른 뜻: {entry.alsoMeans}</p>}
              <p className="text-sm italic text-slate-300">{entry.example}</p>
              {entry.confusedWith && (
                <p className="text-[13px] text-amber-400">
                  {entry.confusedWith}와(과) 발음이 같아요
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
