/** 도트 로딩 바(F01). 진행률을 모르므로 칸이 차례로 켜지는 표시. 움직임 줄이기면 깜빡이지 않는다. */
export function DotLoadingBar({ label = '스테이지를 불러오는 중' }: { label?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-busy="true"
      className="flex flex-col items-center gap-2"
    >
      <div className="flex gap-1">
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className="size-3 bg-accent motion-safe:animate-pulse"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <p className="text-sm text-muted">{label}…</p>
    </div>
  );
}
