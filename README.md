# 버브 점프 (가제)

[![CI](https://github.com/mje-devstudio/verb-jump/actions/workflows/ci.yml/badge.svg)](https://github.com/mje-devstudio/verb-jump/actions/workflows/ci.yml)

**영어 동사를 단 적을 밟으면 그 동사의 능력이 생기는 횡스크롤 플랫포머.** `climb`를 얻으면 벽을 오르고, `float`를 얻으면 공중에 뜬다. 틀린 동사는 웃긴 능력으로 자기 뜻을 보여 준다. 8:57에 집을 나서 9:00 전에 회사 문에 닿으면 된다.

- **플레이**: https://verb-jump.vercel.app (PC 키보드 · 휴대폰 가로 화면)
- **저장소**: https://github.com/mje-devstudio/verb-jump
- **30초 플레이 영상**: 도트 그림을 넣은 뒤 찍어 올린다(break·brake 구간, 모바일 조작 장면). 지금 화면은 회색 상자와 자리표시 그림이다.

React 19 · TypeScript strict · PixiJS 8 · Vite · TanStack Query · Tailwind 4 · Vitest · React Testing Library · MSW · Vercel Functions

## 기획 의도 — 왜 퀴즈가 아니라 플랫포머인가

단어를 맞히면 점수를 주는 퀴즈는 뜻을 '고르는' 데서 끝난다. 버브 점프에서는 고른 동사의 뜻이 곧 조작이 된다. 높은 담장 앞에서 `climb`를 골라야 길이 열리고, `sleep`을 고르면 주인공이 꾸벅 졸고 시계가 3초 흐른다. 틀려도 감점 대신 그 단어의 뜻을 몸으로 한 번 더 보게 된다. 철자 코인(B·R·E·A·K)으로 철자를, 단어 카드로 발음과 뜻을 함께 익힌다.

## 게임 규칙 요약

| 항목      | 내용                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------- |
| 조작(PC)  | ←→ 이동 · Space/Z 점프(길게 누르면 더 높이) · X 동사 능력 · Esc 일시정지                                 |
| 조작(폰)  | 가로 화면. 왼쪽 엄지를 대면 생기는 이동 패드, 오른쪽 큰 점프 버튼과 지금 가진 동사 이름이 적힌 동사 버튼 |
| 동사 얻기 | 적을 위에서 밟으면 그 동사의 능력을 얻는다. 능력은 하나만 가지고, 새로 밟으면 바뀐다                     |
| 능력      | climb: 벽 앞에서 누르고 있으면 오르기 · float: 공중에서 천천히 내려오기 · break: 금 간 벽 부수기         |
| 오답 능력 | sleep: 2초 졸고 시계 3초 손해 · dance: 제자리 춤 · brake: 달리다 끼익 멈춤(break와 발음이 같다)          |
| 시계      | 8:57에서 실제 시간과 함께 흐른다. 9:00 전에 회사 문에 닿으면 정시 출근, 넘으면 지각 도장                 |
| 점수      | 보유 코인 × 10 + 철자 완성 500 + 정시 출근이면 남은 초 × 10                                              |

## 공고 항목별 구현 포인트

PRD의 공고 요구사항 추적표다. P1(2차, 면접 전)로 표시한 것은 아직 만들지 않았다.

| 구분      | 공고 항목                                     | 확인할 곳                                                                                                                                                                                                                                         |
| --------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 필수      | React(Hooks, 컴포넌트 설계, 렌더링 최적화)    | HUD 동기화 [`useGameStore`](src/features/hud/useGameStore.ts)·[`hudSync`](src/game/hudSync.ts)(F09), 게임 루프와 React 분리 [`GameCanvas`](src/game/GameCanvas.tsx)(F04), 능력 모듈 [`abilities/`](src/game/abilities/)(F07), 성능 개선 기록(F19) |
| 필수      | HTML·CSS·JavaScript / TypeScript              | 전체 TypeScript strict(any·ts-ignore 없음), 규칙 계산 순수 함수 [`shared/rules`](src/shared/rules/)                                                                                                                                               |
| 필수      | REST API 연동(비동기 흐름, 에러 처리)         | 스테이지 로딩·자동 재시도·응답 검증 [`features/stage`](src/features/stage/)(F01), 지연·실패 재현 [`api/_lib/http.ts`](api/_lib/http.ts)(F02), 기록 등록(F18, P1)                                                                                  |
| 필수      | 모던 CSS 반응형 레이아웃                      | Tailwind 메뉴·HUD·결과, 정수 배율 게임 화면 [`camera.ts`](src/game/render/camera.ts)(F03), 노치를 피한 모바일 조작 [`TouchControls`](src/features/controls/TouchControls.tsx)(F10)                                                                |
| 주요 업무 | 학습 서비스 웹 프론트엔드 설계·개발·운영      | [PRD 수정 기록](docs/prd-changes.md), 배포와 에러 바운더리 [`ErrorBoundary`](src/app/ErrorBoundary.tsx)(F13), [배포 기록](docs/deploy.md), 오류 모니터링(F22, P2)                                                                                 |
| 주요 업무 | 렌더링 성능·번들 크기 측정·개선               | 32칸 묶음 타일 컬링 [`grayboxRenderer.ts`](src/game/render/grayboxRenderer.ts)(F03), [측정 기록](docs/measurements.md), 게임 화면 지연 로딩·폰트 부분 집합 [F19 카드](docs/cards/F19.md)                                                          |
| 주요 업무 | PC·모바일·다양한 브라우저 UI 품질             | 점프 손맛 [`player.ts`](src/game/physics/player.ts)(F05), 한 방향 발판(F25), 모바일 조작·판정 완화(F10), 아래 호환성 표                                                                                                                           |
| 주요 업무 | 음성 인식·발음 평가 등 학습 인터랙션, 게임화  | 동사 얻기와 단어 카드·TTS(F06), 능력 모듈(F07), 코인과 철자 코인(F26·F27), 보스전 음성 인식(F15·F16, P1), 말하기 보너스(F28, P1)                                                                                                                  |
| 우대      | 에듀테크 등 학습 서비스 도메인                | 동사를 몸으로 익히는 게임 자체, [학습 콘텐츠 검수](docs/content-review.md)                                                                                                                                                                        |
| 우대      | 크로스 플랫폼(React Native, PWA, WebView)     | PWA(F21, P1), 카카오톡 인앱 브라우저 확인(호환성 표)                                                                                                                                                                                              |
| 우대      | 실시간 통신(WebSocket, SSE, WebRTC)           | 실시간 랭킹 SSE(F18, P1)                                                                                                                                                                                                                          |
| 우대      | 애니메이션·인터랙션(Canvas/WebGL, Pixi.js 등) | PixiJS 횡스크롤(F03·F04), 능력별 동작(F07), Aseprite 스프라이트 로더 [`sprites.ts`](src/game/render/sprites.ts)(F12)                                                                                                                              |
| 인재상    | 개발부터 배포·운영까지 전 과정                | PRD부터 Vercel 배포(F13)·운영 장애 대응([이슈 005](docs/issues/005-api-esm-extension.md))까지 혼자 진행                                                                                                                                           |
| 인재상    | 기획·디자인 요구사항을 웹으로 표현            | 게임 기획, 직접 그린 도트(F12, 진행 중), Tiled 맵 [`commute.tmj`](public/maps/commute.tmj)(F08)                                                                                                                                                   |
| 인재상    | MVP 먼저, 원인 추적과 재발 방지               | 회색 상자 프로토타입부터 시작, 레벨 점검 [`levelCheck.ts`](src/game/level/levelCheck.ts)(F29 선행), 아래 이슈 기록                                                                                                                                |
| 인재상    | 소규모 팀에서 스스로 방향을 잡고 실행         | [진행표](docs/TASKS.md)·[작업 카드](docs/cards/)·[수용 기준 대조표](docs/acceptance.md)                                                                                                                                                           |
| 업무 문화 | 데이터 기반 그로스 해킹                       | 학습 이벤트 기록(F20, P1)                                                                                                                                                                                                                         |
| 업무 문화 | AI를 OS로 활용                                | 아래 "작업 범위와 AI 활용"                                                                                                                                                                                                                        |

## 아키텍처

```
 React (useReducer: 화면 흐름 · TanStack Query: 스테이지)
   │  명령(시작·일시정지·세로 화면)          ▲ 바뀐 값만(생명·코인·철자·동사·시계)
   ▼                                        │ useSyncExternalStore
 GameController ──▶ 게임 루프(1/60초 고정) ──▶ GameStore
                      │ stepWorld(world, 입력)
                      ├─ 물리·충돌·밟기 판정 (순수 함수)
                      ├─ 능력 모듈 (registry → 지금 능력 하나)
                      └─ PixiJS 렌더러 (그리기만, 보간 alpha)
```

- **게임 루프와 React 분리**: 플레이어 위치·적·타일처럼 프레임마다 바뀌는 값은 React 밖 `world` 객체에 둔다. 루프는 그리기 프레임마다 [`syncHud`](src/game/hudSync.ts)를 부르지만, 사람이 읽는 값이 실제로 바뀔 때만 저장소에 알린다(시계는 초가 바뀔 때만). HUD는 항목별 selector로 구독해, 코인이 바뀌어도 시계는 다시 그리지 않는다(`Hud.test.tsx`).
- **능력 모듈**: 모든 능력은 같은 틀(`onGain` · `onVerbDown` · `onVerbUp` · `update` · `onLose`)을 따른다. `update`는 이번 프레임 물리에 줄 수정값(`frozen` · `holdVy` · `maxFall` · `keepVx`)만 돌려주고, 월드는 지금 능력이 무엇인지 모른다. 새 동사는 [`registry.ts`](src/game/abilities/registry.ts)에 모듈 하나와 스테이지 동사 데이터만 더하면 된다.
- **상태 네 층**

  | 상태 | 예시                             | 두는 곳                                    |
  | ---- | -------------------------------- | ------------------------------------------ |
  | 게임 | 위치·속도, 지금 능력, 적, 코인   | 게임 루프의 `world`(React 밖)              |
  | UI   | 지금 화면, 일시정지, 결과        | `useReducer`([`App.tsx`](src/app/App.tsx)) |
  | 서버 | 스테이지 맵·동사 데이터          | TanStack Query 캐시                        |
  | 저장 | 최고 기록, 효과음·발음 켜기/끄기 | `localStorage`(실패해도 동작)              |

- **손맛 수치는 한 곳**: [`tuning.ts`](src/shared/rules/tuning.ts). 바꾸면 레벨 점검 테스트가 맵 전체를 다시 시뮬레이션한다.
- **API**: Web 표준 `Request → Response` 핸들러([`api/stages/[id].ts`](api/stages/[id].ts)). 로컬에서는 Vite 미들웨어가 같은 핸들러를 실행해, 개발 서버와 운영이 같은 코드로 답한다.

## 측정 결과

자세한 조건과 원본 수치는 [측정 기록](docs/measurements.md). F19(성능 개선) 1차 전후 값이다. Lighthouse는 운영 주소, 모바일 기본 설정, 4회 중간값.

| 항목                           | PRD 기준     | 결과                                                                          |
| ------------------------------ | ------------ | ----------------------------------------------------------------------------- |
| 게임 화면 FPS, CPU 4배 감속    | 평균 55 이상 | **60fps**, 20ms 넘는 프레임 0개 (M1 Pro headless Chrome)                      |
| 모바일 Lighthouse 성능(타이틀) | 90 이상      | 97 → **100**                                                                  |
| LCP · CLS                      | 2.5초 · 0.1  | 2.12초 → **1.21초** · 0.003                                                   |
| 첫 화면 전송량                 | —            | 787KB → **328KB**                                                             |
| 접근성 · 모범 사례 · SEO       | —            | 100 · 100 · 100                                                               |
| 첫 화면 JS                     | —            | 591.39kB → **278.61kB** (gzip 179.66 → 87.88kB) — 게임 화면(PixiJS) 지연 로딩 |
| 게임 폰트(갈무리11)            | —            | 504.73kB → **48.62kB** — 쓰는 글자만 남긴 부분 집합                           |
| `shared/rules` 테스트 커버리지 | CI 90% 기준  | 100%                                                                          |

- **실제 휴대폰 FPS는 아직 재지 않았다.** 위 FPS는 빠른 Mac에서 잰 값이라 여유가 크다.
- INP는 실사용 입력이 있어야 나오는 지표라 아직 없다.
- F19 1차 내용과 발견한 버그는 [F19 카드](docs/cards/F19.md). 게임 화면 코드는 타이틀에서 미리 받으므로 페이지가 받는 JS 총량은 비슷하고, 첫 화면을 막는 양이 절반이 됐다.

## 호환성과 검수 결과

| 환경                                 | 결과                                                                |
| ------------------------------------ | ------------------------------------------------------------------- |
| Chrome 데스크톱                      | 확인 — 운영 주소에서 플레이, Lighthouse·FPS 측정                    |
| Chrome Android · iOS Safari          | **확인 전** — 데스크톱 모바일 흉내(`?touch`)와 포인터 테스트만 했다 |
| macOS Safari · 삼성 인터넷 · Firefox | 확인 전                                                             |
| 카카오톡 인앱 브라우저               | 확인 전                                                             |

- **수용 기준**: P0 16개 기능을 기준별로 나눈 [수용 기준 대조표](docs/acceptance.md). 실기기·실제 소리·도트 그림처럼 사람이 확인할 항목은 따로 표시했다.
- **테스트**: Vitest 28개 파일 · 195개 테스트(단위 · 1/60초 시뮬레이션 · 컴포넌트 · MSW · API). CI가 PR과 `main` 푸시마다 타입 검사 · 린트 · 포맷 · 테스트(커버리지 기준) · API Node ESM 실행 점검 · 빌드를 돌린다.
- 별도 리뷰 에이전트의 독립 코드 리뷰에서 13건을 지적받아 고쳤다([리뷰 기록](docs/reviews/2026-10-20-main-6280d87.md)). 사람 리뷰는 아직 없다.

## 이슈 기록

만들면서 겪은 버그를 원인 · 수정 · 재발 방지 순서로 적는다. 전체 기록은 [docs/issues](docs/issues/).

1. **높은 발판에서 달려 뛰면 틈에 빠진다** (점프 손맛 실험실)
   - 원인: 높은 곳에서 뛰면 떨어지는 시간이 길어 평지보다 멀리 간다(평지 51px → 3칸 위 60px → 6칸 위 67.5px). 평지 기준으로 틈을 띄우자 착지 지점이 틈 위에 놓였다.
   - 수정: 레벨 설계 규칙에 "높이별 착지 범위에는 틈을 두지 않는다"를 넣었다.
   - 재발 방지: [`levelCheck.ts`](src/game/level/levelCheck.ts)가 맵의 모든 발판 끝에서 앞뒤로 달려 뛰는 시뮬레이션을 돌린다. 테스트가 실제 맵에 이 점검을 돌려 구멍 착지가 하나라도 있으면 실패한다.
2. **착지 거리가 실험실보다 1프레임 길다** ([이슈 002](docs/issues/002-airtime-one-frame.md))
   - 원인: 최고 높이를 PRD 공식값(45px)에 맞추려 적분을 사다리꼴로 바꿨는데, 실험실은 semi-implicit Euler였다. 공식값과 1/60초 시뮬레이션 값은 원래 다르다.
   - 수정: 실험실 방식으로 되돌리고, 기준값을 시뮬레이션 값(42.75px, 51/60/67.5px)으로 PRD에 고쳐 달라고 기록했다.
   - 재발 방지: 거리·프레임 수를 실험실 값과 정확히 비교하는 테스트. 기준값엔 "공식인지 시뮬레이션인지"를 같이 적는다.
3. **옆에서 맞았는데 오답 동사를 얻는다** ([이슈 003](docs/issues/003-knockback-stomp.md))
   - 원인: 넉백 속도가 공중 감속에 0.1초 만에 사라져 3.6px만 밀렸고, 적은 계속 걸어와 떨어지는 주인공 밑으로 들어갔다.
   - 수정: 맞은 뒤 0.3초 동안 조작을 잠그고 넉백을 유지, 적은 친 뒤 돌아선다.
   - 재발 방지: 테스트 3개를 더하고, 수정을 하나씩 지우면 각각 실패하는 것을 확인했다.
4. **오답 적을 밟으면 더 진행할 수 없다** ([이슈 004](docs/issues/004-respawn-softlock.md), 플레이테스트 중 발견)
   - 원인: 밟힌 적은 '화면 밖일 때만' 다시 생기게 했는데, 고르기 구역이 화면 한 장 안에 들어가 맞는 적이 영영 돌아오지 않았다.
   - 수정: 원래 자리에서 3칸 넘게 떨어지면 5초 뒤 다시 생기고, 생긴 직후 1초는 닿아도 아무 일이 없다.
   - 재발 방지: 실제 맵의 구간 1~3마다 "맞는 적 → 오답 순으로 밟고 기다리면 맞는 적이 돌아온다" 테스트. 수정 전 코드에서 실패하는 것을 확인했다.
5. **운영 배포에서 API가 모두 500** ([이슈 005](docs/issues/005-api-esm-extension.md))
   - 원인: Vercel은 `api/`를 Node ESM으로 실행하는데, 상대 import에 `.js` 확장자가 없었다. Vite·Vitest는 확장자 없이도 찾아 줘서 로컬 테스트로는 드러나지 않았다.
   - 수정: 실행 경로의 import에 `.js`를 붙였다.
   - 재발 방지: `npm run check:api`가 `api/`를 변환해 Node로 직접 불러 응답 코드를 확인한다. CI에 넣었다.

## 작업 범위와 AI 활용

이 프로젝트는 PRD를 사람이 쓰고, 구현은 AI 코딩 에이전트(Claude Code)가 티켓 → 설계 → 브랜치 구현 → 검증 → 사람 승인 → 반영 순서로 진행했다.

| 구분                     | 내용                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 사람이 한 것             | PRD 작성, 점프 손맛 수치(실험실에서 직접 맞춤), 플레이테스트와 버그 발견(이슈 004), 설계 결정(적분 방식, 능력을 잃는 체크포인트, 저장소 공개), 매 `main` 반영 승인, Vercel 연결 |
| 직접 그린 도트           | **아직 없음** — 사양서([sprite-spec.md](docs/sprite-spec.md))대로 Aseprite로 그리는 중. 지금 화면은 스크립트로 만든 자리표시 그림                                               |
| 직접 작성한 코드         | **아직 없음** — HUD 동기화 훅과 능력 모듈 하나를 직접 다시 쓰고 비교 기록을 여기에 남긴다(PRD 리스크 대응)                                                                      |
| AI가 만든 뒤 검토한 코드 | 나머지 전부. 사람이 플레이하며 수치·동작을 확인하고, 에이전트는 매 작업마다 테스트를 먼저 쓰고 수정을 일부러 지워 테스트가 실패하는지 확인했다                                  |

**AI 작업 규칙**

- 측정 · 테스트 결과는 실제로 실행한 값만 적는다. 확인하지 않은 것은 "확인 전"으로 남긴다(위 호환성 표, [수용 기준 대조표](docs/acceptance.md)).
- PRD와 다르게 만든 것은 이유와 함께 [PRD 수정 요청](docs/prd-changes.md)에 모으고, 사람이 결정한다.
- `main` 푸시는 곧 운영 배포라 매번 사람이 승인한다. 작업마다 [작업 카드](docs/cards/)에 변경 · 검증 · 남은 것을 남겼다.

## 로컬 실행

```bash
npm ci
npm run dev        # http://localhost:5173 (로컬 /api도 같은 서버가 응답)
```

| 명령                                   | 하는 일                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| `npm test`                             | 단위·시뮬레이션·컴포넌트·API 테스트(레벨 점검 포함)                  |
| `npm run test:coverage`                | 테스트 + 커버리지(`shared/rules` 90% 미만이면 실패)                  |
| `npm run typecheck` · `npm run lint`   | 타입 검사 · 린트                                                     |
| `npm run check:api`                    | `api/`를 Node ESM으로 직접 실행해 응답 확인                          |
| `npm run build`                        | 배포 빌드(`dist/`)                                                   |
| `npm run measure:fps -- <주소> <감속>` | 게임 화면 FPS 측정(로컬 Chrome)                                      |
| `npm run map:commute`                  | 1스테이지 맵 초안 다시 만들기(Tiled에서 다듬은 뒤에는 덮어쓰니 주의) |
| `npm run sprites:placeholder`          | 자리표시 스프라이트 다시 만들기                                      |
| `npm run sfx:gen`                      | 효과음 정의 다시 만들기                                              |

- 주소에 `?dev`: API 지연·실패 재현 토글 · `?touch`: 데스크톱에서 모바일 조작 보기

## 구조

```
src/
  app/          화면 흐름(useReducer), 에러 바운더리
  game/         게임 루프·세계·물리·능력 모듈·레벨·렌더러(PixiJS) — React 밖
  features/     타이틀·HUD·모바일 조작·결과·설정·개발자 토글 — React
  shared/       규칙(손맛 수치·시계·점수·판정) 순수 함수, 스테이지 데이터
api/            Vercel Functions(Web 표준 핸들러)
test/api/       API 테스트(api/ 안에 두면 함수로 배포되므로 밖에)
public/         맵(.tmj)·스프라이트·대표 이미지
docs/           진행표·작업 카드·이슈 기록·맵 규칙·도트 사양·배포 절차·측정·수용 기준
```

## 문서

- [진행표](docs/TASKS.md) · [수용 기준 대조표](docs/acceptance.md) · [이슈 기록](docs/issues/) · [PRD 수정 요청](docs/prd-changes.md)
- [측정 기록](docs/measurements.md) · [학습 콘텐츠 검수](docs/content-review.md)
- [맵 규칙](docs/level-format.md) · [도트 리소스 사양](docs/sprite-spec.md) · [배포 절차](docs/deploy.md)
- [NOTICE(폰트·효과음 라이선스)](NOTICE.md)
