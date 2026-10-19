/** 세로 화면 회전 안내(F10). iOS는 화면 방향을 고정할 수 없어서 안내로 대신한다. */
export function RotateNotice() {
  return (
    <div
      role="alert"
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-bg/95 px-6 text-center"
    >
      <p aria-hidden className="text-5xl">
        ⟳
      </p>
      <p className="text-lg font-bold">휴대폰을 가로로 돌려 주세요</p>
      <p className="text-sm text-muted">두 엄지로 하는 게임이에요. 돌리면 이어서 할 수 있어요.</p>
    </div>
  );
}
