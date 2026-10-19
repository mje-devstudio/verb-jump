/**
 * 링크 공유 미리보기 대표 이미지(1200×630) 만들기 — 개발 서버 전용.
 * 게임을 시작해 원하는 장면에서 멈춘 뒤 콘솔에서 `await __verbJumpSaveOg()` → public/og.jpg에 저장.
 * 도트 그림이 바뀌면 다시 만든다. 배포 빌드에는 들어가지 않는다(import.meta.env.DEV 안에서만 불러옴).
 */
export async function saveOgImage(game: HTMLCanvasElement): Promise<number> {
  const W = 1200;
  const H = 630;
  const k = 3; // 320×180 → 960×540, 정수 배율
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D 캔버스를 만들지 못했습니다');
  g.fillStyle = '#0b0d12';
  g.fillRect(0, 0, W, H);
  g.imageSmoothingEnabled = false;
  g.drawImage(
    game,
    (W - game.width * k) / 2,
    H - game.height * k - 18,
    game.width * k,
    game.height * k,
  );
  g.textBaseline = 'top';
  g.fillStyle = '#e5e7eb';
  g.font = 'bold 34px system-ui, "Apple SD Gothic Neo", sans-serif';
  g.fillText('버브 점프', 120, 22);
  g.fillStyle = '#facc15';
  g.font = '24px system-ui, "Apple SD Gothic Neo", sans-serif';
  g.fillText('동사를 밟으면 그 동사의 능력이 생긴다', 300, 30);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.85));
  if (!blob) throw new Error('이미지를 만들지 못했습니다');
  const res = await fetch('/__dev/save-og', { method: 'POST', body: blob });
  if (!res.ok) throw new Error(`저장 실패: ${res.status}`);
  return blob.size;
}
