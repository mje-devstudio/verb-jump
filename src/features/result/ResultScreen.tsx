import { useEffect, useRef } from 'react';
import type { ResultData, VerbReview } from '../../game/result';

function VerbRow({ verb, entry, wrong }: VerbReview & { wrong?: boolean }) {
  return (
    <li className="rounded border border-muted/40 px-3 py-2">
      <p>
        <strong className={wrong ? 'text-joke' : 'text-accent'}>{verb}</strong>{' '}
        <span className="text-sm text-muted">{entry.phonetic}</span> · {entry.meaning}
      </p>
      <p className="text-sm italic text-slate-300">{entry.example}</p>
      {entry.alsoMeans && <p className="text-sm">다른 뜻: {entry.alsoMeans}</p>}
      {entry.confusedWith && (
        <p className="text-sm text-amber-400">
          {entry.confusedWith}와(과) 발음이 같아요 — 철자로 구분해요
        </p>
      )}
    </li>
  );
}

/**
 * S4 결과(F11): 점수(코인·철자·시간), 출근 시각, 정시·지각 도장, 완성한 철자 단어, 배운 동사, 잘못 쓴 동사 복습.
 * 이니셜 입력·랭킹은 F18.
 */
export function ResultScreen({
  result,
  newBest,
  onRetry,
  onTitle,
}: {
  result: ResultData;
  newBest: boolean;
  onRetry: () => void;
  onTitle: () => void;
}) {
  const { score } = result;
  const heading = useRef<HTMLHeadingElement>(null);
  // 화면이 바뀌면 키보드·스크린 리더 사용자가 결과부터 읽도록 제목에 포커스를 옮긴다
  useEffect(() => heading.current?.focus(), []);

  // 결과 화면은 문서처럼 읽히므로 게임 화면의 스크롤 막기를 풀어 준다
  return (
    <section className="mx-auto flex h-full max-w-lg flex-col gap-4 overflow-y-auto px-4 py-6 [touch-action:pan-y]">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold outline-none">
            {result.arrival} 출근
          </h1>
          {newBest && <p className="text-sm text-ok">이 기기 최고 기록!</p>}
        </div>
        <p
          aria-label={score.onTime ? '정시 도장' : '지각 도장'}
          className={`-rotate-12 rounded-full border-4 px-3 py-1 text-xl font-black ${
            score.onTime ? 'border-ok text-ok' : 'border-late text-late'
          }`}
        >
          {score.onTime ? '정시' : '지각'}
        </p>
      </header>

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md bg-panel p-4">
        <dt>코인 {result.coins}개 × 10</dt>
        <dd className="text-right font-mono">{score.coin.toLocaleString()}</dd>
        <dt>철자 {result.wordComplete ? `${result.word} 완성` : `미완성 (${result.spell})`}</dt>
        <dd className="text-right font-mono">{score.word.toLocaleString()}</dd>
        <dt>{score.onTime ? '9:00까지 남은 초 × 10' : '시간 보너스(지각)'}</dt>
        <dd className="text-right font-mono">{score.time.toLocaleString()}</dd>
        <dt className="border-t border-muted/40 pt-1 font-bold">합계</dt>
        <dd className="border-t border-muted/40 pt-1 text-right font-mono text-lg font-bold">
          {score.total.toLocaleString()}점
        </dd>
      </dl>

      {result.learned.length > 0 && (
        <section aria-labelledby="learned">
          <h2 id="learned" className="mb-2 font-bold">
            배운 동사
          </h2>
          <ul className="flex flex-col gap-2">
            {result.learned.map((r) => (
              <VerbRow key={r.verb} {...r} />
            ))}
          </ul>
        </section>
      )}

      {result.wrong.length > 0 && (
        <section aria-labelledby="wrong">
          <h2 id="wrong" className="mb-2 font-bold">
            잘못 쓴 동사 복습
          </h2>
          <ul className="flex flex-col gap-2">
            {result.wrong.map((r) => (
              <VerbRow key={r.verb} {...r} wrong />
            ))}
          </ul>
        </section>
      )}

      <div className="mt-auto flex gap-3 pt-2">
        <button
          type="button"
          onClick={onRetry}
          className="min-h-12 flex-1 rounded-md bg-accent font-bold text-bg"
        >
          다시 하기
        </button>
        <button
          type="button"
          onClick={onTitle}
          className="min-h-12 rounded-md border border-muted px-4"
        >
          타이틀로
        </button>
      </div>
    </section>
  );
}
