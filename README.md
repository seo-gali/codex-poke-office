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
| 연구 캠프 | 회복 장치·몬스터볼 연구대·나무 바닥이 있는 입체 연구소에 내 트레이너와 세션 포켓몬 배치 |
| 실제 기록 탐색 | 최근 24시간 수정된 JSONL을 재귀 탐색, 검증한 세션 ID로 구분 |
| 활동 반응 | 세션 전체 누적 활동과 이번 응답의 도구 호출 수를 별도로 표시 |
| 모션 | 사용 중인 동료만 GIF 재생·자동 이동. 나머지는 벽 쪽에서 정지하며 드래그·방향키로 위치 조정 |
| 크기 | 실제 키를 바탕으로 몸체를 60–96px로 표시, 투명 여백 제거·비율 유지. 도감은 기본 3배 확대하며 좁은 화면의 틀에 맞춤 |
| 접근성 | 모션 줄이기·비활성 탭에서는 반복 움직임 정지 |
| 트레이너 | 회복 장치 앞 발판에 1–8세대 주인공 15명 표시, 선택을 브라우저에 저장 |
| 랜덤 배정 | 트레이너를 바꿀 때마다 현재 세션의 해당 세대 포켓몬을 새로 배정 |
| 정보·도감 | 트레이너 없는 붉은 도감 기기 화면에 움직이는 포켓몬·이름·타입·설명·활동 표시 |
| 놓아주기 | 미사용으로 확인된 세션만 별도 확인 후 원본 대화 JSONL 영구 삭제 |

탐험 탭·6개 지도·플레이어 이동 기능은 제거했습니다. 사용 중인 포켓몬은 바닥에 분산 배치하고 천천히 돌아다닙니다. 드래그 또는 방향키로 옮기면 10초간 그 자리에 머뭅니다. 사용 안 함·확인 불가는 세 벽 쪽 휴식 구역에서 움직이지 않으며, 수동 이동도 벽을 따라 제한합니다. 클릭·Enter로 도감을 엽니다. 좁은 화면은 연구소 안에서 스크롤하며 페이지 자체는 화면 크기에 맞춥니다.

### 사용 여부와 활동

`사용 중`은 Windows Restart Manager로 Codex가 기록 파일을 열고 있는 것을 확인한 결과입니다. 파일을 여는 프로세스를 확인하지 못하면 `확인 불가`로 표시합니다. `최근 활동`은 최근 60초 안에 유효한 로그 시각이 관측됐다는 뜻입니다. 도구 호출·결과는 실행 기록이며 성공·승인 대기·현재 연산 상태를 추측하지 않습니다.

JSONL의 `task_started`, `task_complete`, `turn_aborted`, `function_call`, `custom_tool_call`, 결과·메시지 레코드를 해석합니다. 기록된 도구 이름을 정해진 활동 문구로 분류하며 도구 인수·결과·대화 본문은 화면에 보내지 않습니다. `exec`로 감싼 호출은 내부 명령을 추측하지 않고 `도구 호출`로 표시합니다. 부분 레코드는 다음 변경 때 이어 읽고 손상된 기록은 상태 미확인으로 표시합니다.

### 누적 활동과 볼 등급

인식한 시작·도구 호출·결과·메시지·완료·중단 레코드 수를 원본 파일에서 누적 집계합니다. 메타데이터·토큰 사용량 레코드는 세지 않으며 새 응답에서도 초기화하지 않습니다. 이번 응답의 도구 호출 수와는 별도입니다.

| 누적 활동 | 볼 |
| --- | --- |
| 0회 | 몬스터볼 |
| 1–9회 | 프레미어볼 |
| 10–19회 | 슈퍼볼 |
| 20–49회 | 네트볼 |
| 50–99회 | 다크볼 |
| 100–199회 | 하이퍼볼 |
| 200–399회 | 리피트볼 |
| 400–699회 | 타이머볼 |
| 700–999회 | 퀵볼 |
| 1,000–1,999회 | 럭셔리볼 |
| 2,000회 이상 | 마스터볼 |

사용자가 승인한 화면 등급 기준이며 파일 사용 여부를 뜻하지 않습니다. 볼 이미지는 [PokeAPI 아이템 원본](https://github.com/PokeAPI/sprites/tree/master/sprites/items)을 외부 로딩합니다.

### 트레이너와 무작위 배정

레드·리프(1세대), 심향·크리스(2세대), 휘웅·봄이(3세대), 광휘(4세대), 투지·투희(5세대), 칼름·세레나(6세대), 영태·미월(7세대), 승재·우리(8세대)를 선택합니다. 32×32 트레이너도 기존 16×32 트레이너와 몸 크기가 비슷하게 표시합니다. 로딩 중에는 몬스터볼을, 실패하면 오류 표시를 사용합니다.

세대 전체 번호 범위에서 세션 수만큼 먼저 추첨합니다. 범위는 1세대 1–151, 2세대 152–251, 3세대 252–386, 4세대 387–493, 5세대 494–649, 6세대 650–721, 7세대 722–809, 8세대 810–905입니다. [PKHeX의 세대 경계 자료](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Legality/Legal.cs)와 [한글 종 이름](https://github.com/kwsch/PKHeX/blob/master/PKHeX.Core/Resources/text/other/ko/text_Species_ko.txt)을 대조했습니다. PKHeX 실행 파일이나 코드는 포함하지 않습니다. [PokeAPI/sprites](https://github.com/PokeAPI/sprites)의 기존 도트 GIF를 우선 사용하고 없는 종은 Showdown GIF를 사용합니다. 사용 중인 포켓몬은 로딩 실패 시 다른 GIF를 재시도하고, 모두 실패하면 원본 PNG와 작은 대기 모션을 표시합니다. 쉬는 포켓몬은 도감에서도 PNG로 정지합니다.

[PokéAPI의 키](https://pokeapi.co/docs/v2#pokemon)는 데시미터 단위로 캐시하고 도감에서는 미터로 표시합니다. 너무 작거나 큰 종도 알아볼 수 있도록 연구소 크기는 압축한 범위를 사용합니다. 키를 아직 가져오지 못했으면 68px로 먼저 표시하며 도감의 키는 미확인으로 남깁니다. 기존 캐시의 이름·타입·설명은 보존한 채 키만 후속 조회합니다.

트레이너 변경 시 이전 종을 피하고 후보가 충분하면 세션끼리 중복되지 않게 뽑습니다. 포켓몬의 시작 위치도 세션·포켓몬 조합으로 섞습니다. 필터를 바꿔도 좌표가 초기화되지 않습니다. 새로고침하면 시작 위치로 돌아갑니다. 선택을 유지한 동안 일반 갱신·새로고침·서버 재시작에서는 마지막 배정을 유지합니다. 배정은 `data/assignments.json`, 포켓몬 정보는 `data/pokemon-cache.json`에 저장합니다. 원본 Codex 기록은 재배정 때문에 변경하지 않습니다. 전환 요청은 번호와 이미지를 먼저 반환하며 외부 API·Windows 파일 사용 검사를 기다리지 않습니다.

현재 선택한 트레이너의 미조회 번호만 병렬 조회합니다. 키·타입은 `/pokemon`, 한국어 이름·설명은 `/pokemon-species`에서 필요한 쪽만 가져옵니다. 각각 도착하는 즉시 해당 포켓몬을 SSE로 갱신해 느린 종이나 설명을 기다리지 않습니다. 같은 번호의 진행 중 요청은 공유하고 완료한 정보는 디스크 캐시에서 재사용합니다. 키만 없으면 이름·설명을 다시 요청하지 않으며 실패한 항목만 60초 후 재시도합니다. 저장 실패는 원본 경로 없이 서버 로그에 알립니다. 조회 전·실패 시에는 번호와 현재 확인된 정보만 표시합니다.

### 놓아주기

포켓몬 클릭 → `포켓몬 놓아주기` → 원본 기록 삭제 확인 순서입니다. 사용 중·확인 불가는 버튼이 비활성화됩니다. 삭제 직전 원본 ID·탐색 루트·파일 사용 여부를 재확인합니다. 같은 ID의 JSONL만 삭제하며 다른 세션과 공유 색인·DB·설정·프로세스는 변경하지 않습니다. 삭제 후 Codex 목록 메타데이터가 남을 수 있습니다.

## 트레이너 출처

트레이너 그림은 연구소에서만 기존 공개 자료를 외부 로딩합니다. 도감에는 트레이너나 배틀 배경을 표시하지 않습니다. 사용하지 않는 배틀용 그림·설정·표시 코드는 제거했습니다.

| 자료 | 제공처·크레딧 |
| --- | --- |
| 1·3세대 기본 트레이너 | [pret/pokeemerald](https://github.com/pret/pokeemerald/tree/master/graphics/object_events/pics/people) · Game Freak |
| 심향·광휘 캠프 도트 | [심향](https://pokengine.org/trainers/01f3plll/Ethan), [광휘](https://pokengine.org/trainers/012pha2i/Lucas) · Jext |
| 크리스·투지·투희 캠프 도트 | [크리스](https://pokengine.org/trainers/01xid4wg/Kris), [투지](https://pokengine.org/trainers/0133xp9e/Hilbert), [투희](https://pokengine.org/trainers/01uhbo4g/Hilda) · DiegoWT, Jext, Kyledove · 크리스는 Thewritingchild 의뢰 |
| 칼름·세레나 | [칼름](https://pokengine.org/trainers/01jw8ze2/Calem), [세레나](https://pokengine.org/trainers/014qszl8/Serena) · Kyledove |
| 영태·미월 | [영태](https://pokengine.org/trainers/01qbqk2v/Elio), [미월](https://pokengine.org/trainers/01fnklmw/Selene) · DiegoWT, Kyledove · 영태는 roguewind22 의뢰 |
| 승재·우리 | [승재](https://pokengine.org/trainers/01p5eh81/Victor), [우리](https://pokengine.org/trainers/01arym2u/Gloria) · DiegoWT, Kyledove · Gavin Torem 의뢰 |

Pokéngine 자료는 각 페이지의 `Free to use with credit` 조건과 제작자 표기를 확인했습니다. 포켓몬·관련 캐릭터의 권리는 원 권리자에게 있으며, 외부 이미지 표시는 상업적 이용 허가와 별개입니다. 포켓몬·트레이너 원본 파일은 저장소에 넣지 않으며 인터넷 연결이 필요합니다.

연구소 배경은 사용자가 승인한 imagegen 내장 도구로 제작한 [oak-lab.png](./client/public/lab/oak-lab.png)입니다. 포켓몬·트레이너는 기존 공개 이미지를 유지합니다. 기존 교실 타일과 책상 자산은 제거했습니다. [Sprite-AI](https://www.sprite-ai.art/tools/pixel-editor)의 공개 편집기를 확인했으며, 한 프레임 512px 제한 때문에 1536×1024 배경을 이 도구로 재가공하지 않았습니다. 96×96 포켓몬 PNG는 편집기로 열어 확인했습니다. 유료 생성 API·MCP 설정은 추가하지 않았습니다.

<details><summary>배경 생성 프롬프트 (imagegen 내장 도구)</summary>

Use case: stylized-concept. Asset: production background for an interactive Pokemon research laboratory, NOT a UI mockup. The attached image is a composition/style reference only. Create a NEW beautifully crafted isometric pixel-art cutaway of Professor Oak's Pokemon laboratory, matching the reference's cozy wood floor, dense specialized Pokemon equipment, metal wall caps, and consistent orthographic 2:1 isometric perspective. Wide 3:2 landscape composition, complete room fully visible with a narrow transparent margin, transparent outside the room. Crisp deliberate pixel clusters, approximately 480x320 logical pixel art enlarged with nearest-neighbor edges; rich restrained GBA-era colors, dark ink outlines, small detailed textures, no blur or painterly noise. The room has two tall back walls, warm brown timber floorboards, low beige front parapets with shrubs, a front-left open doorway with green curtains and a red-white Pokeball doormat. Major focal equipment in the upper LEFT: a large cylindrical glass Pokemon healing/transporter chamber, red-and-white rounded Pokeball-like canopy, pale aqua transparent glass, chunky metallic base with cables and a cyan glowing rail. A bulky gray research console beside it, with small green/cyan displays and a blue beacon. Along the back RIGHT wall: ONE built-in research desk with a monitor, instrument drawers, shelves of books and Pokeballs, small framed Pokemon botanical diagrams, conduits. A single low research table with three red-and-white Pokeballs in the right side of the room, around 72% across and 52% down the image. Every piece of furniture shares the SAME pixel scale, perspective, consistent light from upper left, and believable size relative to the whole room. Keep the central floor and lower half open and readable, providing unobstructed ground for SIX small dynamic Pokemon sprites and a trainer that will be added by the application. Room floor roughly spans from left 7%,middle height 55% to bottom point 52%,94%, to right 95%,55%. No people, no professors, no trainers, no Pokemon creatures, no statues of creatures, no characters baked into the image. Static Pokeballs and simple posters are fine. No play button, no watermark, no signs or text, no repeated computer desks, no classroom, no office cubicles, no white tiled classroom floor. Preserve the reference's Pokemon research facility identity and dense crafted environment detail, while keeping the central/lower floor free for interactive sprites.

</details>

## 검증 결과

2026-11-09 Windows / PowerShell, Node.js 24.22.1 환경에서 확인했습니다.

- `npm run check`, `npm run build`, `npm test` 모두 종료 코드 0으로 통과했습니다.
- 실제 로컬 Codex 세션에서 배경 유지·사용 중 GIF/이동·미사용 PNG/벽 쪽 정지·키별 크기·누적 활동 볼·실제 호출 수 갱신을 확인했습니다. 원본 기록을 삭제하지 않았습니다.
- 합성 브라우저에서 15명 트레이너, 7세대, 로딩·실패 표시, 트레이너 없는 도감을 확인했습니다.
- 트레이너를 바꿨다가 돌아오면 종이 새로 배정되고, 같은 선택으로 새로고침하면 포켓몬 배정이 유지됐습니다.
- 390×844 / 320×480 / 844×390 / 568×320에서 페이지 넘침 없이 캠프·상세를 표시했습니다. 좁은 화면에서는 연구실 내부를 가로·세로 스크롤해 동료를 확인합니다.
- 자동 이동·드래그·방향키·바닥 경계·볼 11단계와 원본 이미지 로딩·발판 위 트레이너·ID 복사·도감 3배 크기·필터·모션 감소·GIF 대체·놓아주기 취소·합성 미사용 기록 삭제를 확인했습니다. 사용 중 상태가 해제되면 벽 쪽에 정지하고 다시 사용 중이면 이동·GIF가 재개됐습니다.
- 네이티브 HTTP/SSE 검증에서 키 저장·기존 이름 보존·누적 활동·새 응답에서 누적 보존·증분 처리·손상 격리·재시작·재배정 보호·저장 실패 시 배정 보존과 경로 비노출·열린 파일 보호·다른 세션 보존·비공개 본문 비노출을 확인했습니다.

합성 브라우저의 사용 중 UI 사례는 Codex 프로세스를 새로 실행하지 않기 위해 정제된 SSE 상태를 주입합니다. 실제 사용 여부·실제 기록 반영은 별도 실제 캠프 화면에서 확인했습니다.

합성 검사에서 설명 응답을 2,500ms, 한 종의 키 응답을 1,800ms 지연시켜도 다른 종의 키는 117–121ms에 반영됐습니다. 세 포켓몬은 중복 SSE 연결·반복 탐색에도 총 6회만 요청했고, 이름·타입·설명이 캐시된 포켓몬의 키 보충은 1회만 요청했습니다. 재시작 후 완성된 캐시는 외부 호출 없이 재사용됐습니다. 재배정 응답은 800ms 미만, 합성 브라우저의 15명 전환 중 최대 시간은 36ms였습니다. 측정값은 이 PC의 합성 검사 결과이며 외부 네트워크 지연은 달라질 수 있습니다.

검증 화면은 Git에서 제외하는 `data/lab-trainer-platform-large.png`, `data/pokedex-size.png`, `data/pokedex-fixture-390x844.png`, `data/pokedex-fixture-320x480.png`에 있습니다.

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
