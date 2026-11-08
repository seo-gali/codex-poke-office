# Codex Poké Office

로컬 Codex CLI 세션을 포켓몬 동료로 보여주는 도트 연구실입니다. 최근 활동 기록에 맞춰 동료가 반응하고, 클릭하면 세션 정보·도감을 확인할 수 있습니다.

## 실행

Windows 11 / PowerShell, Node.js 24.10 이상이 필요합니다.

```powershell
npm install
npm run dev
```

화면은 `http://127.0.0.1:5173`, API는 `http://127.0.0.1:4100`입니다. 이 앱은 Codex나 wmux를 실행하거나 설정하지 않습니다. 기존 터미널에서 작업을 이어가면 기록 변경이 반영됩니다.

`.env.example`에 포트·세션 위치·탐색 간격을 정의합니다. `.env` 없이 기본값으로 실행할 수 있습니다. `CODEX_HOME`이 없으면 사용자 홈의 `.codex/sessions`를 읽습니다. 로컬 서버는 `127.0.0.1`에만 바인딩합니다.

```powershell
npm run check
npm test
npm run build
npm start
```

`start`는 빌드한 캠프와 API를 `http://127.0.0.1:4100`에서 제공합니다.

## 현재 동작

| 기능 | 동작 |
| --- | --- |
| 연구 캠프 | 아이소메트릭 방에 선택한 내 트레이너와 세션 포켓몬·컴퓨터 작업대를 배치하고 옆에 연구 노트 표시 |
| 실제 기록 탐색 | 최근 24시간 수정된 JSONL을 재귀 탐색, 검증한 세션 ID로 구분 |
| 활동 반응 | 응답 시작·도구 호출·도구 결과·메시지·응답 완료 기록과 이번 응답의 도구 호출 수 표시 |
| 모션 | 사용 중이면서 최근 활동이 있는 동료는 GIF와 작업 반응. 완료·미사용·확인 불가는 정지 도트 |
| 접근성 | 모션 줄이기·비활성 탭에서는 반복 움직임 정지 |
| 트레이너 | 1–8세대 주인공 15명, 선택을 브라우저에 저장 |
| 랜덤 배정 | 트레이너를 바꿀 때마다 현재 세션의 해당 세대 포켓몬을 새로 배정 |
| 정보·도감 | 프로젝트 이름, 세션 ID·복사, 기록 시각, 한글 이름·타입·설명 |
| 놓아주기 | 미사용으로 확인된 세션만 별도 확인 후 원본 대화 JSONL 영구 삭제 |

탐험 탭·6개 지도·이동 기능은 연구 캠프 전환으로 제거했습니다. 많은 세션은 캠프 안에서 스크롤해 확인하며 페이지 자체는 화면 크기에 맞춥니다.

### 사용 여부와 활동

`사용 중`은 Windows Restart Manager로 Codex가 기록 파일을 열고 있는 것을 확인한 결과입니다. 파일을 여는 프로세스를 확인하지 못하면 `확인 불가`로 표시합니다. `최근 활동`은 최근 60초 안에 유효한 로그 시각이 관측됐다는 뜻입니다. 도구 호출·결과는 실행 기록이며 성공·승인 대기·현재 연산 상태를 추측하지 않습니다.

JSONL의 `task_started`, `task_complete`, `turn_aborted`, `function_call`, `custom_tool_call`, 결과·메시지 레코드를 해석합니다. 기록된 도구 이름을 정해진 활동 문구로 분류하며 도구 인수·결과·대화 본문은 화면에 보내지 않습니다. `exec`로 감싼 호출은 내부 명령을 추측하지 않고 `도구 호출`로 표시합니다. 부분 레코드는 다음 변경 때 이어 읽고 손상된 기록은 상태 미확인으로 표시합니다.

### 트레이너와 무작위 배정

레드·리프(1세대), 심향·크리스(2세대), 휘웅·봄이(3세대), 광휘(4세대), 투지·투희(5세대), 칼름·세레나(6세대), 영태·미월(7세대), 승재·우리(8세대)를 선택합니다. 32×32 트레이너도 기존 16×32 트레이너와 몸 크기가 비슷하게 표시합니다. 로딩 중에는 몬스터볼을, 실패하면 오류 표시를 사용합니다.

후보는 [PokéAPI GIF 목록](https://github.com/PokeAPI/sprites/tree/master/sprites/pokemon/versions/generation-v/black-white/animated)에서 확인한 종입니다. 1–5세대 전체, 6세대 54종, 7세대 74종, 8세대 62종을 사용합니다. GIF가 없는 종은 배정하지 않습니다.

트레이너 변경 시 이전 종을 피하고 후보가 충분하면 세션끼리 중복되지 않게 뽑습니다. 작업대 배치도 세션·포켓몬 조합으로 섞습니다. 필터를 바꿔도 각 자리는 유지합니다. 선택을 유지한 동안 일반 갱신·새로고침·서버 재시작에서는 마지막 배정을 유지합니다. 배정은 `data/assignments.json`, 포켓몬 정보는 `data/pokemon-cache.json`에 저장합니다. 원본 Codex 기록은 재배정 때문에 변경하지 않습니다.

### 놓아주기

포켓몬 클릭 → `포켓몬 놓아주기` → 원본 기록 삭제 확인 순서입니다. 사용 중·확인 불가는 버튼이 비활성화됩니다. 삭제 직전 원본 ID·탐색 루트·파일 사용 여부를 재확인합니다. 같은 ID의 JSONL만 삭제하며 다른 세션과 공유 색인·DB·설정·프로세스는 변경하지 않습니다. 삭제 후 Codex 목록 메타데이터가 남을 수 있습니다.

## 트레이너 출처

트레이너 그림은 기존 공개 자료를 외부 로딩합니다. 직접 생성한 트레이너 그림은 사용하지 않습니다. 세레나·영태·미월·승재·우리는 사용자 선택에 따라 풀컬러 정면 배틀 그림을, 나머지는 확인된 풀컬러 뒷모습을 표시합니다. 원본 프레임을 비율에 맞춰 64×64 표시 공간에 맞춥니다.

| 자료 | 제공처·크레딧 |
| --- | --- |
| 1·3세대 기본 트레이너 | [pret/pokeemerald](https://github.com/pret/pokeemerald/tree/master/graphics/object_events/pics/people) · Game Freak |
| 심향·광휘 캠프 도트 | [심향](https://pokengine.org/trainers/01f3plll/Ethan), [광휘](https://pokengine.org/trainers/012pha2i/Lucas) · Jext |
| 크리스·투지·투희 캠프 도트 | [크리스](https://pokengine.org/trainers/01xid4wg/Kris), [투지](https://pokengine.org/trainers/0133xp9e/Hilbert), [투희](https://pokengine.org/trainers/01uhbo4g/Hilda) · DiegoWT, Jext, Kyledove · 크리스는 Thewritingchild 의뢰 |
| 칼름·세레나 | [칼름](https://pokengine.org/trainers/01jw8ze2/Calem), [세레나](https://pokengine.org/trainers/014qszl8/Serena) · Kyledove |
| 영태·미월 | [영태](https://pokengine.org/trainers/01qbqk2v/Elio), [미월](https://pokengine.org/trainers/01fnklmw/Selene) · DiegoWT, Kyledove · 영태는 roguewind22 의뢰 |
| 승재·우리 | [승재](https://pokengine.org/trainers/01p5eh81/Victor), [우리](https://pokengine.org/trainers/01arym2u/Gloria) · DiegoWT, Kyledove · Gavin Torem 의뢰 |
| 심향·광휘·투지·칼름 뒷모습 | [Team Aqua 공개 자료](https://github.com/Pawkkie/Team-Aquas-Asset-Repo/tree/main/Trainer%20Back%20Sprites) · hyo, Lhea, kwenio |
| 크리스 뒷모습 | [HGSS sprites 공개 자료와 원본 크레딧](https://github.com/LucianoNeo/gen1recomp-mods/blob/master/hgss_sprites/README.md) |
| 투희 뒷모습 | [Pokémon Essentials 자료](https://github.com/LaosyLucy/pokemon-xomni) · Game Freak 및 제공처의 스프라이트 크레딧 |

Pokéngine 자료는 각 페이지의 `Free to use with credit` 조건과 제작자 표기를 확인했습니다. 포켓몬·관련 캐릭터의 권리는 원 권리자에게 있으며, 외부 이미지 표시는 상업적 이용 허가와 별개입니다. 포켓몬·트레이너 원본 파일은 저장소에 넣지 않으며 인터넷 연결이 필요합니다.

연구실의 바닥·벽·책상·모니터·책장 도트는 [uris (@imaghuris)의 Back to School 공개 데모](https://just-uris.itch.io/free-demo-back-to-school-pack)입니다. 생성형 AI를 사용하지 않은 자료이며 개인·상업 프로젝트 사용과 수정이 허용됩니다. 앱 공간에 필요한 11개 그림만 사용하고 화면·README에 크레딧을 표시합니다. 원본 자산의 [이용 조건](./client/public/lab/LICENSE.txt)은 앱 코드와 별개이며 자산 팩으로 재배포할 수 없습니다. SVG로 타일을 배치하고 바닥 일부에 색조를 적용했습니다. 인카운터 배경은 [Pokémon Showdown](https://play.pokemonshowdown.com/fx/), 포켓몬 도트는 [PokéAPI sprites](https://github.com/PokeAPI/sprites)에서 로딩합니다. 사용자 제공 [마삼의 자료](https://www.postype.com/@rudco-214/post/22967701)는 스타일 참고용이며 복제하지 않았습니다.

## 검증 결과

2026-11-09 Windows / PowerShell, Node.js 24.22.1 환경에서 확인했습니다.

- `npm run check`, `npm run build`, `npm test` 모두 종료 코드 0으로 통과했습니다.
- 실제 로컬 Codex 세션에서 아이소메트릭 방·사용 중과 미사용 모션 차이·실제 도구 호출 수 갱신을 확인했습니다. 원본 기록을 삭제하지 않았습니다.
- 합성 브라우저에서 15명 트레이너와 배틀 그림의 풀컬러·투명 배경, 7세대, 로딩·실패 표시를 확인했습니다.
- 트레이너를 바꿨다가 돌아오면 종이 새로 배정되고, 같은 선택으로 새로고침하면 배정·배치가 유지됐습니다.
- 390×844 / 320×480 / 844×390 / 568×320에서 페이지 넘침 없이 캠프·상세를 표시했습니다. 좁은 화면에서는 연구실 내부를 가로·세로 스크롤해 동료를 확인합니다.
- 정보·ID 복사·도감·필터·모션 감소·놓아주기 취소·합성 미사용 기록 삭제를 확인했습니다.
- 네이티브 HTTP/SSE 검증에서 활동 집계·증분 처리·손상 격리·재시작·재배정 보호·저장 실패 시 배정 보존과 경로 비노출·열린 파일 보호·다른 세션 보존·비공개 본문 비노출을 확인했습니다.

합성 브라우저의 사용 중 UI 사례는 Codex 프로세스를 새로 실행하지 않기 위해 정제된 SSE 상태를 주입합니다. 실제 사용 여부·실제 기록 반영은 별도 실제 캠프 화면에서 확인했습니다.

검증 화면은 Git에서 제외하는 `data/camp-real-desktop.png`, `data/camp-real-390x844.png`, `data/camp-trainer-portraits.png`, `data/camp-trainer-loading.png`, `data/camp-trainer-error.png`에 있습니다.

```powershell
npm run build
node tests/browser-fixture.ts
```

합성 서버 `http://127.0.0.1:4191`을 연 뒤 Playwright MCP `browser_run_code_unsafe`에 `filename: tests/camp.browser.js`를 전달하면 다시 검증할 수 있습니다. 놓아주기는 합성 기록에서만 시험합니다. Windows 파일 조회가 제한되면 확인 불가로 표시하고 삭제를 막습니다.

실물 휴대기기와 실제 `codex resume` 실행은 시험하지 않았습니다. 동일 ID 복원은 합성 기록으로 확인했으며 Codex·wmux 설정과 프로세스는 변경하지 않았습니다.

## 구현 완료 기준

- 실제 세션과 최근 활동을 원문 노출 없이 캠프에 반영합니다.
- 트레이너 변경 시 세대에 맞는 종을 새로 뽑고, 선택 유지 시 마지막 배정을 보존합니다.
- 사용 여부와 최근 활동의 의미를 구분합니다.
- 손상·부분 JSONL·API 장애·누락된 이미지가 전체 앱을 중단시키지 않습니다.
- 놓아주기는 확인한 미사용 세션만 삭제하며 다른 세션을 보존합니다.
- Codex·wmux 환경은 유지합니다.
