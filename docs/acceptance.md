# 1차(P0) 수용 기준 대조표

기준 버전: `main` fee7a4a(2026-10-19 운영 배포). PRD "기능 요구사항"의 수용 기준을 한 줄씩 나눠, 무엇으로 확인했는지 적는다.

**판정**

- **충족**: 테스트나 운영 확인 같은 증거가 있다.
- **부분**: 일부 기준만 증거가 있다. 빠진 부분은 "남은 것"에 적었다.
- **사람**: PRD가 사람이 직접 하도록 정한 일이다(도트 그림 등).
- **미확인**: 구현은 했지만 그 환경에서 아직 확인하지 않았다(실기기·실제 소리 등).

모든 검증은 같은 세션에서 만든 코드의 **자기 점검**이다. 독립 검증(다른 사람·다른 리뷰어)은 아직 하지 않았다.

| ID  | 수용 기준                                                                         | 판정 | 증거                                                                                                                    | 남은 것                                     |
| --- | --------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| F01 | `GET /api/stages/commute`로 맵과 동사 데이터를 받는다                             | 충족 | `test/api/stages.test.ts`, 운영 API 200([배포 기록](deploy.md#배포-기록))                                               |                                             |
|     | 도트 로딩 바, 실패하면 안내와 다시 시도, 자동 재시도 1회                          | 충족 | `TitleScreen.test.tsx`(MSW로 실패·재시도), `useStage.ts` `retry: 1`                                                     |                                             |
| F02 | 지연 0·1·3초, 실패 끄기·50%·항상을 화면에서 바꾼다                                | 충족 | `?dev` 개발자 토글(`DevPanel.tsx`), 브라우저에서 지연·실패 화면 확인. 화면 반응은 `TitleScreen.test.tsx`(MSW 지연·실패) | 토글 UI 자체의 자동 테스트는 없음           |
|     | 값을 `delay`·`fail` 쿼리로 서버리스 함수에 넘긴다                                 | 충족 | `api/_lib/http.ts` `readChaos`, `stages.test.ts`(지연·실패 응답)                                                        |                                             |
| F03 | 320×180 고정 해상도, 정수 배율, nearest, 레터박스                                 | 충족 | `camera.test.ts`(`integerScale`), `GameCanvas.tsx` `fit()`                                                              |                                             |
|     | 카메라가 캐릭터를 따라가고 화면 밖 타일은 그리지 않는다                           | 충족 | `camera.test.ts`, `grayboxRenderer.ts` 32칸 묶음 컬링                                                                   | 컬링 전후 수치는 F19                        |
| F04 | rAF 안에서 1/60초 고정 간격 갱신, 그리기 분리                                     | 충족 | `loop.test.ts`(`FixedStepLoop`, 큰 프레임 간격에서 따라잡기 상한)                                                       |                                             |
|     | 탭을 벗어나면 일시정지, 돌아오면 3초 뒤 재개                                      | 충족 | `loop.test.ts`(`pauseOnHidden`: hidden → resuming → running, 사유별 `PauseGate`)                                        | 실기기 확인                                 |
| F05 | 가속·감속, 가변 점프, 발판 끝 유예, 미리 누른 점프, 타일 충돌                     | 충족 | `player.test.ts`(최고 42.75px, 탭 6.3px, 달려 뛰기 51/60/67.5px, coyote·buffer 경계)                                    | 사람 플레이테스트로 손맛 확인               |
| F06 | 위에서 밟으면 능력 획득, 옆에 닿으면 피격                                         | 충족 | `stomp.test.ts`(4px 경계, 모바일 폭 ×1.2), `world.test.ts`                                                              |                                             |
|     | 단어 카드 1~2초, TTS 발음                                                         | 부분 | `WordCard.test.tsx`(1.6초 표시 뒤 사라짐, 새 동사면 다시 셈), `speechSynthesis` 호출까지                                | TTS 실제 소리를 귀로 확인                   |
| F07 | 공통 틀(얻을 때·매 프레임·버튼·잃을 때)의 능력 모듈 6개                           | 충족 | `src/game/abilities/*`, `abilities.test.ts`                                                                             |                                             |
|     | 새 동사는 데이터와 모듈 하나로 추가                                               | 충족 | 능력 등록 표 한 곳(`abilities/registry.ts`)과 스테이지 동사 데이터만 고치면 된다. 월드는 능력 종류를 모른다             | 실제로 7번째 동사를 더해 보진 않음(F14에서) |
| F08 | Tiled 맵, 구간마다 체크포인트, 회사 문에 닿으면 클리어                            | 충족 | `public/maps/commute.tmj`, `tiled.test.ts`, `commute.test.ts`(레벨 점검·철자 도달·문 클리어)                            | 사람이 한 판 끝까지 플레이                  |
| F09 | 바뀔 때만 알리고 HUD는 `useSyncExternalStore`로 바뀐 값만 다시 그린다             | 충족 | `hudSync.test.ts`(바뀐 값만 알림), `store.test.ts`, `Hud.test.tsx`(안 바뀐 값은 다시 그리지 않음)                       | HUD 렌더 횟수 실측 수치는 없음              |
| F10 | 가로 화면, 엄지 위치 패드, 큰 점프 버튼, 능력 있을 때만 보이는 동사 버튼          | 충족 | `TouchControls.test.tsx`, `touchInput.test.ts`                                                                          |                                             |
|     | 두 엄지 동시 입력, 스크롤·확대·길게 누르기 차단, 세로면 회전 안내, 노치 회피      | 부분 | 포인터 여러 개 테스트, `touch-action`·`contextmenu`·`safe-area` 적용, `RotateNotice`                                    | **실기기 미확인**(iOS·Android)              |
|     | 모바일 판정 완화(밟기 폭 +20%, 유예 0.15초)                                       | 충족 | `tuning.test.ts`(`mobileTuning`), `stomp.test.ts`                                                                       |                                             |
| F11 | 점수·출근 시각·정시/지각 도장·철자 단어·배운 동사·오답 복습                       | 충족 | `ResultScreen.test.tsx`, `result.test.ts`, `rules.test.ts`(1,080점, 8:59:59.9 정시·9:00:00.0 지각)                      | 실제 한 판 점수는 플레이테스트에서          |
|     | 다시 하기는 같은 스테이지로                                                       | 충족 | `ResultScreen.test.tsx`                                                                                                 |                                             |
| F12 | 직접 그린 주인공·적·코인·철자 코인·타일셋                                         | 사람 | 사양서 [sprite-spec.md](sprite-spec.md), Aseprite JSON 로더(`sprites.test.ts`), 실패 시 회색 상자                       | **그림은 사람이 그린다**. 지금은 자리표시   |
|     | 갈무리 폰트(OFL 라이선스 포함), jsfxr 효과음                                      | 부분 | `licenses/`, [NOTICE](../NOTICE.md), `soundFor.test.ts`                                                                 | 효과음 실제 소리를 귀로 확인                |
| F13 | Vercel 자동 배포                                                                  | 충족 | `main` 푸시마다 운영 배포, [배포 기록](deploy.md#배포-기록)                                                             |                                             |
|     | 링크 공유 미리보기(제목·설명·대표 이미지)                                         | 부분 | 운영 HTML의 `og:*` 절대 주소, `og.jpg` 1200×630 200                                                                     | 카카오톡·슬랙 실제 미리보기 크롤링 확인     |
|     | 렌더 오류가 나면 다시 시작 화면                                                   | 충족 | `ErrorBoundary.test.tsx`(렌더 오류 → 다시 시작), `loop.test.ts`(루프 오류를 멈추고 `onError`로 넘김)                    | 루프 오류 → 바운더리 연결은 코드로만 확인   |
| F25 | 공중 발판은 아래에서 뚫고 올라가고 위에서 내려올 때만 밟힌다                      | 충족 | `player.test.ts`(한 방향 발판)                                                                                          |                                             |
| F26 | 코인 10점, 피격 시 최대 10개 흘림·생명 유지, 2초 동안 다시 줍기, 0개면 생명 -1    | 충족 | `rules.test.ts`(`applyHit`), `progress.test.ts`(흘린 코인 줍기·사라짐)                                                  |                                             |
| F27 | 철자 다섯 개를 기술을 써야 닿는 곳에, HUD `B _ E _ K`, 완성 시 카드·생명 +1·500점 | 충족 | `commute.test.ts`(능력 없이는 닿지 않음), `Hud.test.tsx`, `rules.test.ts`                                               |                                             |

## 비기능 기준

| 기준                                     | 판정   | 증거                                                                    | 남은 것                      |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------- | ---------------------------- |
| 게임 화면 평균 55fps(CPU 4배 감속)       | 부분   | M1 Pro headless 60fps, 20ms 넘는 프레임 0([측정 기록](measurements.md)) | **실제 휴대폰 측정 없음**    |
| 모바일 Lighthouse 90점·LCP 2.5초·CLS 0.1 | 충족   | 중간값 97점·2.12초·0.003                                                |                              |
| INP 200ms                                | 미확인 | Lighthouse 탐색 측정으로는 나오지 않음(TBT 0ms)                         | 실사용 측정                  |
| 키보드만으로 끝까지 플레이               | 부분   | 모든 조작이 키보드(`input.ts`), Esc 일시정지                            | 사람이 끝까지 플레이         |
| `prefers-reduced-motion`이면 깜빡임 끄기 | 충족   | `grayboxRenderer.ts` 깜빡임 대신 반투명                                 | 화면 흔들림은 아직 없음      |
| TS strict, any·ts-ignore 없음, CI        | 충족   | `npm run typecheck`·`lint`, GitHub Actions                              |                              |
| 규칙 계산은 순수 함수 + 단위 테스트      | 충족   | `src/shared/rules` 커버리지 100%, CI 90% 기준                           |                              |
| 호환성 6개 환경                          | 미확인 | 데스크톱 Chrome만 확인                                                  | Safari·삼성·Firefox·카카오톡 |

## 1차 게이트 전에 사람이 할 일

1. 도트 그림(F12) — 받으면 타일셋을 게임에 반영하고 `og.jpg`를 다시 만든다.
2. 한 판 끝까지 플레이테스트(손맛, 클리어 시간, 첫 구간에서 서 있으면 적에게 맞는 문제).
3. 휴대폰 실기기(두 엄지, 노치, 소리·발음, FPS)와 링크 미리보기 확인.
4. 콘텐츠 표현 제안 4건 확인([콘텐츠 검수](content-review.md)).
