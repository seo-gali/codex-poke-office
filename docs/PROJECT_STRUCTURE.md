# PROJECT_STRUCTURE.md

## 로컬 경로

```text
D:\01_Programming\08_AI\Agent\codex-poke-office
```

프로젝트는 AI 에이전트 도구이므로 기존 `08_AI/Agent` 분류에 둡니다.

## 디렉터리 책임

```text
codex-poke-office/
├── README.md                     # 기능 범위·현황·실행 방법
├── AGENTS.md                     # Codex 구현 규칙
├── DESIGN.md                     # 화면·상호작용 설계
├── CODEX_TASK.md                 # 첫 구현 작업 지시
├── .editorconfig                 # 편집기 기본 설정
├── .env.example                  # 환경 변수 견본
├── .gitignore                    # 런타임 파일 제외
├── docs/
│   └── PROJECT_STRUCTURE.md      # 디렉터리 책임
├── client/                       # React · Vite · TypeScript
│   └── src/
│       ├── app/                  # 앱 진입점·상태 연결
│       ├── components/           # 연구소·자유 이동·트레이너·도감·활동 볼·삭제 확인
│       └── styles/               # 전역 스타일·디자인 토큰
├── server/                       # Node.js · TypeScript
│   └── src/
│       ├── codex/                # 탐색·JSONL 파싱·파일 사용 조회·안전한 삭제
│       └── storage/              # 배정 JSON·포켓몬 캐시
├── shared/                       # 클라이언트/서버의 공통 타입
├── tests/
│   ├── sessions.test.ts          # 임시 폴더에서 합성 JSONL·HTTP/SSE 검증
│   ├── browser-fixture.ts        # 합성 세션 브라우저 서버
│   └── camp.browser.js           # 실제 브라우저 조작 검증
└── data/                         # 로컬 상태 데이터(버전 관리 제외)
```

**현재 상태:** React·Vite·TypeScript 화면, Node.js·TypeScript 로컬 서버, HTTP/SSE 통합 검증을 구현했습니다. `data/`의 실행 상태와 검증 화면, `dist/`의 빌드 결과는 Git에서 제외합니다.

## 의도한 의존 방향

```text
client ──HTTP/SSE──> server ──read / confirmed release──> Codex JSONL
                         │
                         ├── local JSON assignments / cache
                         └── GET / PokéAPI

shared ──> client, server (타입 정의만)
```

- 프런트엔드는 Codex 파일을 직접 읽지 않습니다.
- 서버는 로그를 디스크에 복사하거나 세션 원문을 저장하지 않습니다.
- 세션 매핑은 검증된 세션 ID를 키로 사용합니다.
- 포켓몬 데이터 요청과 배정 저장을 분리해 API 장애에도 기존 배정 정보가 소실되지 않게 합니다.
- SSE는 서버에서 클라이언트로 상태 변화만 전송합니다.

## 최소 API 계약

- `GET /api/health` — 서버 연결 상태 확인
- `GET /api/sessions` — `{ sessions: SessionView[], error: string | null }` 조회
- `GET /api/events?trainer=brendan` — 최초 상태와 변경 알림 SSE, 선택한 트레이너의 미조회 포켓몬 정보만 후속 갱신
- `DELETE /api/sessions/:sessionId` — 동일 Origin과 `X-Confirm-Session` 헤더 확인, 미사용 세션 JSONL 삭제. 성공 `{ ok: true }`, 사용 중·확인 불가·검증 실패는 409
- `POST /api/trainers/:trainer/shuffle` — 동일 Origin과 `X-Shuffle-Trainer` 확인, 현재 세션의 해당 캐릭터 포켓몬을 재배정하고 최신 Snapshot 반환. 원본 Codex 기록은 변경하지 않음

`health`는 `{ ok: boolean, error: string | null }`을 반환합니다. 세션 읽기 문제가 있을 때에도 정제된 나머지 세션은 계속 전달합니다.

응답 모델은 반드시 다음 정보로 제한합니다.

```typescript
interface SessionRecord {
  sessionId: string;
  shortId: string;
  projectName: string | null;
  pokemon: Record<TrainerId, {
    id: number;
    name: string;
    spriteUrl: string | null;
    types: string[];
    description: string | null;
    heightDm: number | null;
  }>;
  lastObservedAt: string | null;
  lastFileModifiedAt: string | null;
  observation: 'recent-event' | 'turn-complete' | 'quiet' | 'unknown';
  usage: 'active' | 'inactive' | 'unknown';
  activity: { kind: string; label: string; at: string | null; toolCalls: number; records: number };
}
```

`observation`은 실제 프로세스 실행 상태가 아니라 관측 결과입니다. `activity`는 로그에서 확인한 종류·정해진 문구·시각·도구 호출 수와 누적 기록 수만 포함합니다. API는 캐릭터별 포켓몬을 전달하고 프런트엔드는 선택한 캐릭터의 `pokemon` 하나를 `SessionView`로 표시합니다. 캐릭터 선택 변경 시 재배정하고 일반 갱신·새로고침에서는 마지막 배정을 유지합니다. 조회 전·실패 시 `name`은 `포켓몬 #번호`이며 번호로 확인할 수 있는 PNG·GIF는 먼저 표시합니다. `heightDm`은 PokéAPI의 실제 키이며 미조회 시 null입니다. 기존 캐시의 이름을 지우지 않고 키를 후속 조회합니다. 확정 타입은 `shared/session.ts`, `TrainerId`·15개 캐릭터·세대 번호 범위·PNG/GIF URL는 `shared/trainers.ts`를 기준으로 합니다.

`ResearchCamp`는 사용 중인 세션만 바닥에서 이동시키며 나머지는 벽의 휴식 구역에 정지시킵니다. 내 트레이너는 회복 장치 앞 발판에 표시합니다. `PokemonAgent`는 이미지의 투명 여백을 제외하고 키 기준 60–96px 크기를 적용하며 키가 없으면 68px로 먼저 표시합니다. `pokemonDrawSize`를 연구소와 도감이 공유하며 도감은 기본 3배로 확대하고 좁은 틀에서는 비율을 유지하며 줄입니다. GIF 실패 대체와 모션 감소는 이 컴포넌트에서 처리합니다. `ActivityBall`의 한 표로 누적 기록에 따른 11종 볼을 선택합니다.

`pokemonCache`는 키·타입과 한국어 이름·설명의 캐시 완성 여부를 따로 확인합니다. 누락된 엔드포인트만 요청하고 같은 번호의 진행 중 요청은 공유합니다. 검증된 각 응답은 `refreshPokemon`으로 즉시 반영하며 다른 종·다른 엔드포인트를 기다리지 않습니다. 두 응답 처리가 끝나면 디스크 캐시를 저장하고 실패한 엔드포인트만 재시도합니다.

## 구현 파일

API·SSE·탐색 주기는 `server/src/index.ts`에서 연결하며, 별도 라우터·감시 프레임워크를 추가하지 않습니다. 미사용 `api/`, `tests/fixtures/` 자리표시 파일은 제거했습니다. 합성 JSONL은 검증할 때 임시 폴더에 생성합니다.

```text
client/src/main.tsx
client/public/lab/                # 사용자 승인으로 제작한 연구소 배경
client/src/app/App.tsx
client/src/components/ResearchCamp.tsx
client/src/components/ActivityBall.tsx
client/src/components/Trainer.tsx
client/src/components/PokemonAgent.tsx
client/src/components/SessionDetails.tsx
client/src/components/ReleaseDialog.tsx
client/src/styles/index.css
server/src/index.ts
server/src/config.ts
server/src/codex/discover.ts
server/src/codex/parse.ts
server/src/codex/usage.ts
server/src/codex/file-usage.ps1
server/src/storage/assignments.ts
server/src/storage/pokemon.ts
shared/session.ts
shared/trainers.ts
tests/sessions.test.ts
tests/browser-fixture.ts
tests/camp.browser.js
vite.config.ts
tsconfig.json
package.json
package-lock.json
```

파일 이름보다 책임 경계와 데이터 노출 제한을 우선합니다.
