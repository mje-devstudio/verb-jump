# 배포 절차 (F13, Vercel)

배포 준비(설정·CI·공유 미리보기·에러 바운더리)는 끝났다. 아래 1~3은 **사람이 결정·실행**한다(계정·공개 범위·운영 반영).

## 1. GitHub 저장소 (사람)

- 공개 여부를 정한다(PRD 열린 질문 "저장소를 공개로 둘지"). 포트폴리오 링크로 쓰려면 공개가 필요하다.
- 만든 뒤 `main`을 올린다. `.env`에는 비밀값이 없다(`VITE_SITE_URL`만, 비어 있음).

```bash
git remote add origin <저장소 주소>
```

```bash
git push -u origin main
```

- PR마다 `.github/workflows/ci.yml`이 타입 검사·린트·포맷·테스트·빌드를 돌린다.

## 2. Vercel 프로젝트 (사람)

- Vercel에서 GitHub 저장소를 Import. Framework는 `vercel.json`의 `vite`, 빌드 `npm run build`, 출력 `dist`, Node 22(`package.json` engines).
- 첫 배포 뒤 받은 주소(예: `https://<프로젝트>.vercel.app`)를 프로젝트 환경 변수 `VITE_SITE_URL`에 넣고(끝에 `/` 없이) 다시 배포한다. 링크 미리보기의 `og:image`가 절대 주소가 된다.
- Git 연결이면 `main`에 합칠 때마다 운영 배포, PR마다 미리보기 배포가 된다.

## 3. 배포 뒤 확인 (명령이 끝났다고 성공이 아니다)

| 확인                             | 기대                                                                      |
| -------------------------------- | ------------------------------------------------------------------------- |
| `/`                              | 타이틀이 뜨고 스테이지를 불러와 "시작" 버튼                               |
| `/api/stages/commute`            | 200, `{"id":"commute",...}`                                               |
| `/api/stages/commute?fail=1`     | 500 `STAGE_UNAVAILABLE`                                                   |
| `/api/stages/commute?delay=3000` | 약 3초 뒤 200                                                             |
| `/?dev`                          | 개발자 토글 보임                                                          |
| 링크 미리보기                    | 카카오톡 공유 디버거·Slack·페이스북 공유 디버거에서 제목·설명·대표 이미지 |
| 휴대폰 실기기                    | 가로 화면 두 엄지 조작, 세로 회전 안내, 소리·발음(첫 탭 뒤)               |

## 되돌리기

Vercel 대시보드 Deployments에서 이전 배포를 Promote(즉시 되돌리기). 코드로는 문제 커밋을 `git revert` 후 `main`에 합친다.

## 로컬에서 확인한 것 / 못 한 것

- 확인: `npm run build` 성공, `dist/index.html`의 공유 미리보기 메타, 로컬 `/api`(같은 핸들러), 에러 바운더리(브라우저에서 게임 루프 오류 → 다시 시작 화면).
- 못 함: Vercel에서 실제 함수 실행(Web 표준 `GET` 핸들러는 Vercel 문서에서 지원 확인), Vercel의 `[id].ts` 동적 경로, 실제 링크 미리보기 크롤링. 배포 뒤 위 표로 확인한다.
