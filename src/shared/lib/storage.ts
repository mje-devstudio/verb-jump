/**
 * localStorage 래퍼. 사파리 비공개 모드·저장 공간 차단에서 예외가 나도 게임은 계속된다.
 * 저장 상태(최고 기록·설정·만난 동사)만 둔다.
 */
export function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장하지 못해도 플레이는 계속한다
  }
}
