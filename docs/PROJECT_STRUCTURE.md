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
│       ├── components/           # 사파리·이동·고정 심볼·인카운터·삭제 확인
│       └── styles/               # 전역 스타일·디자인 토큰
├── server/                       # Node.js · TypeScript
│   └── src/
│       ├── api/                  # 기존 빈 폴더, API는 index.ts에 구현
│       ├── codex/                # 탐색·JSONL 파싱·파일 사용 조회·안전한 삭제
│       └── storage/              # 배정 JSON·포켓몬 캐시
├── shared/                       # 클라이언트/서버의 공통 타입
├── tests/
│   └── fixtures/                 # 합성 JSONL 테스트 데이터
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
- `GET /api/events` — 같은 응답의 변경 알림 SSE, 최초 연결 시 현재 상태 전달
- `DELETE /api/sessions/:sessionId` — 동일 Origin과 `X-Confirm-Session` 헤더 확인, 미사용 세션 JSONL 삭제. 성공 `{ ok: true }`, 사용 중·확인 불가·검증 실패는 409

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
  }>;
  lastObservedAt: string | null;
  lastFileModifiedAt: string | null;
  observation: 'recent-event' | 'turn-complete' | 'quiet' | 'unknown';
  usage: 'active' | 'inactive' | 'unknown';
}
```

`observation`은 실제 프로세스 실행 상태가 아니라 관측 결과입니다. API는 캐릭터별 포켓몬을 전달하고 프런트엔드는 선택한 캐릭터의 `pokemon` 하나를 `SessionView`로 표시합니다. 배정 ID는 API 장애에도 유지하며, 조회 실패 시 `name`은 `포켓몬 #번호`, `spriteUrl`은 `null`입니다. 확정 타입은 `shared/session.ts`, `TrainerId`·13개 캐릭터·세대별 GIF 후보는 `shared/trainers.ts`를 기준으로 합니다. 열린 에리어 개수는 브라우저에 저장하고 `safari.ts`가 그 개수 안에서만 세션을 분산합니다.

## 구현 파일

API·SSE·탐색 주기는 `server/src/index.ts`에서 연결하며, 별도 라우터·감시 프레임워크를 추가하지 않습니다. 사용하지 않는 빈 폴더는 그대로 둡니다.

```text
client/src/main.tsx
client/public/maps/               # 새로 제작한 인물 없는 6개 도트 지형
client/src/app/App.tsx
client/src/components/HabitatScene.tsx
client/src/components/safari.ts
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
tests/safari.browser.js
docs/map-prompts.json
vite.config.ts
tsconfig.json
package.json
package-lock.json
```

파일 이름보다 책임 경계와 데이터 노출 제한을 우선합니다.
