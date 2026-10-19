# 버브 점프 (가제)

영어 동사를 단 적을 밟으면 그 동사의 능력이 생기는 횡스크롤 플랫포머. `climb`를 얻으면 벽을 오르고, `float`를 얻으면 공중에 뜬다. 틀린 동사(`sleep`·`dance`·`brake`)는 웃긴 능력으로 자기 뜻을 보여 준다. 8:57에 집을 나서 9:00 전에 회사 문에 닿자.

- 플레이: _배포 후 주소를 적는다(F13)_
- 기술: React 19 · TypeScript strict · PixiJS 8 · Vite · TanStack Query · Tailwind 4 · Vitest · MSW · Vercel Functions

> 이 README는 실행 방법 중심의 초안이다. 30초 플레이 영상, 공고 항목별 구현 포인트, 측정 결과, 이슈 기록, 작업 범위(직접 그린 도트·직접 쓴 코드·AI가 만든 뒤 검토한 코드)는 PRD "README·포트폴리오 구성"대로 1차 게이트 전에 채운다.

## 로컬 실행

```bash
npm ci
npm run dev        # http://localhost:5173 (로컬 /api도 같은 서버가 응답)
```

| 명령                                 | 하는 일                                                              |
| ------------------------------------ | -------------------------------------------------------------------- |
| `npm test`                           | 단위·시뮬레이션·컴포넌트·API 테스트(레벨 점검 포함)                  |
| `npm run typecheck` · `npm run lint` | 타입 검사 · 린트                                                     |
| `npm run build`                      | 배포 빌드(`dist/`)                                                   |
| `npm run map:commute`                | 1스테이지 맵 초안 다시 만들기(Tiled에서 다듬은 뒤에는 덮어쓰니 주의) |
| `npm run sprites:placeholder`        | 자리표시 스프라이트 다시 만들기                                      |
| `npm run sfx:gen`                    | 효과음 정의 다시 만들기                                              |

- 조작: ←→ 이동 · Space/Z 점프(길게 누르면 더 높이) · X 동사 능력 · Esc 일시정지. 휴대폰은 가로 화면 두 엄지.
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
docs/           진행표·작업 카드·이슈 기록·맵 규칙·도트 사양·배포 절차
```

## 문서

- [진행표](docs/TASKS.md) · [이슈 기록](docs/issues/) · [PRD 수정 요청](docs/prd-changes.md)
- [맵 규칙](docs/level-format.md) · [도트 리소스 사양](docs/sprite-spec.md) · [배포 절차](docs/deploy.md)
- [NOTICE(폰트·효과음 라이선스)](NOTICE.md)
