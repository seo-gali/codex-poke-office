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
│       ├── components/           # 사무실·포켓몬·세션 공통 UI
│       └── styles/               # 전역 스타일·디자인 토큰
├── server/                       # Node.js · TypeScript
│   └── src/
│       ├── api/                  # 세션 조회·SSE 응답
│       ├── codex/                # 세션 탐색·JSONL 파싱·감시
│       └── storage/              # 배정 JSON·포켓몬 캐시
├── shared/                       # 클라이언트/서버의 공통 타입
├── tests/
│   └── fixtures/                 # 합성 JSONL 테스트 데이터
└── data/                         # 로컬 상태 데이터(버전 관리 제외)
```

**현재 상태:** 문서, 설정 예제, 빈 폴더(`.gitkeep`)만 생성되어 있습니다. `package.json`, 앱 코드, 실제 데이터 파일은 Codex가 구현할 대상입니다.

## 의도한 의존 방향

```text
client ──HTTP/SSE──> server ──read only──> Codex JSONL
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

## 최소 API 계약 (구현 시 확정)

- `GET /api/health` — 서버 연결 상태 확인
- `GET /api/sessions` — 정제된 세션 목록 조회
- `GET /api/events` — 세션 변경 알림 SSE

응답 모델은 반드시 다음 정보로 제한합니다.

```typescript
interface SessionView {
  sessionId: string;
  shortId: string;
  projectName: string | null;
  pokemon: {
    id: number;
    name: string;
    spriteUrl: string | null;
  } | null;
  lastObservedAt: string | null;
  lastFileModifiedAt: string | null;
  observation: 'recent-event' | 'turn-complete' | 'quiet' | 'unknown';
}
```

`observation`은 실제 프로세스 실행 상태가 아니라 관측 결과입니다. 내부 구현 타입은 실제 로그 구조 조사 후 확정하며, 위 타입은 API 초안입니다.

## 구현 시 만들 파일

아래 파일은 구조 제안이며 **현재 ZIP에는 포함되지 않습니다.** 기능 구현 시 책임에 맞게 생성합니다.

```text
client/src/main.tsx
client/src/app/App.tsx
client/src/components/OfficeScene.tsx
client/src/components/PokemonAgent.tsx
client/src/components/SessionDetails.tsx
client/src/styles/index.css
server/src/index.ts
server/src/api/routes.ts
server/src/codex/discover.ts
server/src/codex/parse.ts
server/src/codex/watch.ts
server/src/storage/assignments.ts
server/src/storage/pokemon.ts
shared/session.ts
```

파일 이름보다 책임 경계와 데이터 노출 제한을 우선합니다.
