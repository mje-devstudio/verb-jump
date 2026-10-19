# 이슈 005 — 운영 배포에서 API가 모두 500 (FUNCTION_INVOCATION_FAILED)

- 발견: 2026-10-19, 첫 운영 배포(https://verb-jump.vercel.app) 확인표 점검
- 영향: 스테이지를 불러오지 못해 게임을 시작할 수 없음. 정적 페이지·맵·스프라이트는 정상

## 재현

| 요청                                           | 기대            | 실제                                                                                    |
| ---------------------------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `GET /api/stages/commute`                      | 200             | 500 `FUNCTION_INVOCATION_FAILED`                                                        |
| `?fail=1` · `?delay=3000` · `/api/stages/moon` | 500 · 200 · 404 | 모두 500 `FUNCTION_INVOCATION_FAILED`(약 0.4초, 지연도 안 걸림 → 핸들러 실행 전에 죽음) |

로컬 재현: `tsconfig.api.json`으로 `api/`를 그대로 변환한 뒤 Node로 불러오면 같은 오류가 난다.

```
ERR_MODULE_NOT_FOUND Cannot find module '.../src/shared/stages/commute' imported from .../api/stages/[id].js
```

## 원인

`package.json`이 `"type": "module"`이라 Vercel은 `api/`를 Node ESM으로 실행한다. Node ESM은 상대 import에 확장자(`.js`)가 꼭 있어야 하는데, API 코드는 `'../../src/shared/stages/commute'`처럼 확장자 없이 import했다.

로컬 개발 서버(Vite `ssrLoadModule`)와 테스트(Vitest)는 확장자 없이도 파일을 찾아 주기 때문에 이 차이가 드러나지 않았다. F01 카드에 "실제 Vercel 실행은 F13에서 확인(미검증)"으로 남겨 둔 바로 그 부분이다.

## 수정

- API 실행 경로의 상대 import에 `.js`를 붙였다(`api/stages/[id].ts`, `api/_lib/http.ts`, `src/shared/stages/commute.ts`, `src/shared/stages/types.ts`). TypeScript·Vite는 `.js`로 적어도 `.ts` 파일을 찾는다.

## 재발 방지

- `npm run check:api`(`scripts/check-api-esm.mjs`): `tsc`로 `api/`를 변환해 Node ESM으로 직접 불러 각 핸들러가 기대한 상태 코드로 답하는지 확인한다. CI에 추가했다.
- 실행 경로에 있는 import의 확장자를 일부러 빼면 이 점검이 실패하는 것을 확인했다. 타입으로만 쓰는 import는 변환하면 사라져 실행에 영향이 없다(점검도 통과, 정상).
