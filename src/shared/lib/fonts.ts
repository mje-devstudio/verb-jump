// F19: 게임에서 쓰는 글자만 남긴 부분 집합(npm run font:subset, 약 43KB). 원본은 약 500KB
import galmuri11Url from '../../assets/fonts/Galmuri11-subset.woff2?url';

/**
 * 한글 픽셀 폰트 갈무리11(OFL-1.1, licenses/galmuri-OFL.md). 타이틀·결과(첫 화면 성능 대상)에는
 * 쓰지 않고 게임 HUD에만 쓴다. 타이틀에서 미리 받아 둔다. 담긴 글자는 fontCharset.ts.
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
