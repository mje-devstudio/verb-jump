import galmuri11Url from 'galmuri/dist/Galmuri11.woff2?url';

/**
 * 한글 픽셀 폰트 갈무리11(OFL-1.1, licenses/galmuri-OFL.md). 파일이 약 500KB라
 * 타이틀·결과(첫 화면 성능 대상)에는 쓰지 않고 게임 HUD에만 쓴다. 타이틀에서 미리 받아 둔다.
 */
let loading: Promise<void> | null = null;

export function loadGameFont(): Promise<void> {
  if (loading) return loading;
  if (
    typeof document === 'undefined' ||
    !('fonts' in document) ||
    typeof FontFace === 'undefined'
  ) {
    return Promise.resolve();
  }
  const face = new FontFace('Galmuri11', `url(${galmuri11Url}) format('woff2')`, {
    display: 'swap',
  });
  document.fonts.add(face);
  loading = face.load().then(
    () => undefined,
    () => undefined, // 못 받아도 기본 글꼴로 계속한다
  );
  return loading;
}
