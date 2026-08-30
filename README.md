# Study Organizer (Sorganizer)

자기주도학습 워크벤치 — 단일 HTML 파일(`index.html`)로 동작하는 개인용 웹앱. IIFE로 감싼 바닐라 JS, 프레임워크 없음, 빌드 스텝 없음.

> 이 문서는 다음에 이 코드를 이어받을 AI 에이전트를 위해 쓰였음. 아키텍처, 데이터 모델, 이번 세션에 추가된 기능, 알려진 트레이드오프, 남은 작업을 최대한 상세히 적어둠.

## 사용법 / 배포

**https://jundaleee.github.io/dshs-organizer/** 로 접속.

- 이 저장소는 브랜치가 **`claude/jundal-study-organizer-migration-3z0jb8` 단 하나뿐**이고(`main` 없음), GitHub Pages가 이 브랜치를 소스로 자동 배포함. 이 브랜치에 푸시하면 GitHub Actions("pages-build-deployment")가 돌고 약 30~40초 안에 `jundaleee.github.io/dshs-organizer/`에 반영됨. 별도로 머지하거나 브랜치를 바꿀 필요 없음 — **이 브랜치가 곧 프로덕션**.
- 데이터는 브라우저 `localStorage`(`organizer-data-v2` 키)에 저장됨. 계정 로그인이 아니라 브라우저에 묶인 저장이라 다른 브라우저/기기/시크릿 모드에서는 안 보임. **설정 → 데이터**에서 내보내기/가져오기로 기기 간 백업.
- 이 저장소는 **공개**(교사 이름·시간표가 URL을 아는 사람에게 보일 수 있음, 검색엔진 노출은 안 됨). 실제 사용자 학습 기록은 로컬에만 있어 안전. Classroom 실데이터는 별도 **비공개** 저장소(`jundaleee/dshs-organizer-data`)에 있음 (아래 참고).

## 코드 구조 한눈에 보기

`index.html` 하나에 `<style>` 블록과 `<script>` 블록이 전부 들어있음(3900줄 안팎). 스크립트는 최상위 IIFE 하나(`(function(){ "use strict"; ... })();`)로 감싸져 있고 대략 이 순서로 구성됨:

1. 과목/교사/시간표 상수 (`CATS`, `TIMETABLE`, `ROTATIONS`, `TEACHER_LIST`)
2. `state` 객체 + `buildSkeleton()` (데이터 모델 초기값)
3. 우선순위/로테이션 계산 유틸
4. `localStorage` 저장/로드 (`loadData`/`persist`, API 키/GitHub 토큰/학생 이름 별도 키)
5. 아이콘(`icon(name)`, 인라인 SVG path 모음)
6. `NAV_ITEMS`, **렌더 시스템**(`render()`, 스크롤 체인, 사이드바/바텀내브)
7. 홈 화면(`renderHome`, 과목 박스)
8. 각 페이지 렌더 함수(`renderTasksPage`, `renderAssignmentsPage`, `renderSchedulePage`, `renderMaterialsPage`, `renderArchivePage`, `renderCityPage`)
9. 도시(City) 3D 씬 (three.js, `CITY3D` 네임스페이스)
10. 망각의 시민(spaced-recall), 완료 피드백, 아카이브 로그, 주간 리포트
11. 이벤트 위임 디스패처(`document.body.addEventListener('click', ...)`, `data-action` 기반)
12. `init()` — `localStorage`에서 데이터 로드 후 `render()`, Classroom 동기화, 자동 망각의 시민 생성

**렌더 패턴**: 상태가 바뀌면 항상 `render()`를 호출하고, `render()`는 매번 `#app`(`.main-inner`)의 `innerHTML`을 완전히 다시 씀. 개별 DOM diff 없음 — React 없이 "매번 문자열로 새로 그리기" 방식. 클릭/입력은 전부 `document.body`에 위임된 리스너가 `[data-action]`, `[data-key]`, `[data-id]` 등 `data-*` 속성을 읽어서 처리(`switch(el.dataset.action)`).

## 스크롤 내비게이션 (이번 세션에 재구현)

**중요한 배경**: 처음엔 "스크롤하면 다음 탭으로 넘어간다"를 휠 이벤트로 `state.view`를 통째로 바꿔치기하는 방식(가짜 스크롤, 실제로는 탭 전환을 흉내만 냄)으로 구현했다가 사용자에게 명시적으로 거부당함("너는 그냥 스크롤이 되는 것처럼 가장한 거지"). 지금 구현은 **진짜 네이티브 브라우저 스크롤**을 씀:

- `SCROLL_CHAIN = ['home','tasks','assignments','schedule','materials','archive','city']` — **홈을 포함한 일곱 섹션 전부**가 항상 `<section class="scroll-sec" id="sec-{view}">...</section>`로 **한 번에 이어 붙여서** `#app.innerHTML`에 들어감(`render()`는 이제 조건 분기 없이 매번 이 일곱 개를 전부 그림). 실제로 하나의 긴 페이지가 되고, 스크롤은 브라우저 네이티브 스크롤 그대로 — 콘텐츠를 갈아치우는 트릭이 전혀 없음.
- **홈도 체인의 일부**: `NAV_ITEMS`의 모든 뷰가 정확히 `SCROLL_CHAIN`과 1:1 대응이라 `chainModeActive`는 사실상 항상 `true`. 데스크톱 와이드 화면(`isWideScreen()`, ≥1180px)에서는 홈 우측에 **살아있는 3D 도시 미리보기**가 계속 떠 있음(`.home-split`/`.home-city`, `renderHome()`이 `isWideScreen()`일 때만 그 마크업을 포함). 화면을 조금 내리면 진짜 도시 섹션이 이어서 나오는 구조.
  - **여기서 실제로 겪은 버그**: 스크롤 체인을 도입하면서 `mountCity3D()` 호출 조건을 `chainModeActive`로 바꿨는데, 그때 홈이 체인에 안 들어가 있어서 `state.view==='home'`일 땐 이 조건이 거짓 → 미리보기가 영영 마운트 안 됨 → "도시가 사라졌다"는 사용자 리포트로 이어짐. **1차 시도로 미리보기 자체를 삭제**했다가("어차피 스크롤하면 도시 나오니까 중복이다") 사용자에게 "누가 맘대로 없애래, 다시 돌려놔"라며 명확히 거부당함 — 버그가 나면 그 기능을 지워서 회피하지 말고, 기능은 유지한 채 근본 원인을 고칠 것.
  - **최종 구조**: 홈 미리보기와 도시 섹션은 **서로 다른 id**를 가진 슬롯(`#city3dSlotHome` / `#city3dSlot`)이다 — 홈이 체인에 포함된 뒤로는 둘 다 항상 동시에 DOM에 존재하기 때문에, 같은 id를 쓰면 `getElementById`가 앞쪽(홈) 것만 찾아 도시 섹션 쪽이 영영 비어버리는 새 버그가 생김. 3D 캔버스(`CITY3D.host`)는 하나뿐이고, `pickCityHostSlot()`이 `state.activeSection==='home'`이면 홈 슬롯을, 아니면 도시 섹션 슬롯을 골라 그쪽으로 옮겨 끼운다. `updateActiveSectionFromScroll()`이 활성 섹션이 `home`/`city` 사이를 넘나들 때마다 `mountCity3D()`를 다시 불러 캔버스를 옮기고, 렌더 루프는 `activeSection`이 `home` 또는 `city`일 때만 돌아간다. **교훈**: `getElementById`로 찾는 슬롯 id를 두 군데에서 동시에 쓰면 안 됨 — 첫 번째로 찾은 것만 마운트되고 나머지는 빈 채로 남음. 새 슬롯을 추가할 땐 반드시 별도 id를 주고 `pickCityHostSlot()`류의 선택 로직에 등록할 것.
- **스크롤스파이**: IntersectionObserver 안 씀(다중 교차 판정이 모호해서). 대신 `updateActiveSectionFromScroll()`이 각 섹션의 `getBoundingClientRect().top`을 순서대로 훑어서, 뷰포트 위에서 `SCROLL_TRIGGER_LINE`(140px)을 넘어간 마지막 섹션을 "지금 보는 중"(`state.activeSection`)으로 판정. `window`의 `scroll` 이벤트(`{passive:true}`) + `requestAnimationFrame` 쓰로틀로 호출됨.
- 사이드바/바텀내브의 `.nav-item.active`는 **전체 리렌더 없이** `updateNavActiveClasses()`가 DOM에서 직접 클래스만 토글. 스크롤 중 매 프레임마다 `render()`를 다시 부르면 무거워지니까 의도적으로 분리함.
- **도시 3D 렌더 루프**: 체인 모드일 땐 `mountCity3D()`가 매 렌더마다 `#city3dSlot`에 3D 캔버스 호스트를 재장착하지만, `requestAnimationFrame` 루프(`startCityLoop`/`stopCityLoop`)는 `updateActiveSectionFromScroll()`이 `best==='city'`일 때만 켜고 그 외엔 끔 — 도시가 화면 밖에 있을 때 GPU를 계속 돌리지 않기 위함.
- **사이드바에서 클릭**(`goView` 액션): 이미 체인 모드 안에 있으면(`chainModeActive`) 리렌더 없이 `sec-{target}.scrollIntoView({behavior:'smooth'})`만 실행. 홈에서 체인 섹션으로 처음 들어갈 땐 `pendingScrollTarget`을 세팅한 뒤 전체 렌더 → 렌더 후 그 섹션으로 **즉시(스무스 아님)** 점프.
- **데이터만 바뀐 리렌더(체크박스 클릭 등)의 스크롤 위치 보존**: 리렌더 직전에 `현재 활성 섹션 top 기준 상대 오프셋(window.scrollY - el.offsetTop)`을 재두고, 리렌더 후 같은 섹션의 새 오프셋에 그 상대값을 더해 `window.scrollTo`로 복원. 위쪽 섹션 높이가 바뀌어도(할 일 하나 체크해서 목록이 줄어드는 등) 보고 있던 위치가 안 튀게 하기 위함.
- 도시 섹션만 폭을 넓게 쓰도록(`sec-city`) CSS에서 `.main-inner.chain-mode{max-width:none}` + 각 `.scroll-sec{max-width:720px;margin:0 auto}` (도시만 `max-width:1560px`) 구조로 처리 — 컨테이너 자체의 폭 제한을 풀고 섹션마다 다시 좁히는 방식.

이 부분을 건드릴 땐 반드시 Playwright로 **실제 마우스 휠 스크롤(`page.mouse.wheel`)** 을 흉내내서 `window.scrollY`가 연속적으로 바뀌는지, DOM 노드가 스크롤 중에 교체되지 않는지(예: 섹션에 임의 속성을 심어두고 스크롤 후에도 남아있는지 확인)를 검증할 것 — 겉보기 스크린샷만으로는 "가짜 스크롤"을 구분 못 함.

## 화면 구성 (NAV_ITEMS)

홈 → 할 일 → 과제 → 시간표 → 자료 → 아카이브 → 도시 순. **선생님 탭은 이번 세션에 완전히 제거**(아래 참고).

- **홈**: 과목별 박스(수학과·지구과학·생명과학·화학·물리학·정보과학과·문과) — 각 박스 안에 그 과목 복습·자율학습·개인 학습 할 일이 마감 임박도 순으로 보이고 바로 체크 가능. 디데이+스톱워치가 **하나의 글래스 카드**에 세로 구분선으로 나뉘어 있음(`.dday-sw-row`, 이번 세션에 병합 — city-of-brain에서 먼저 적용한 것과 동일 패턴). 데스크톱 와이드 화면에서는 우측에 살아있는 3D 도시 미리보기가 같이 뜨고, 스크롤 체인의 첫 섹션이라 아래로 계속 내리면 할 일→...→진짜 도시 섹션으로 자연스럽게 이어짐(위 "스크롤 내비게이션" 참고).
- **할 일**: 수업 복습 · 자율 학습 · 개인 학습 통합 관리. 맨 위 "무엇이든 붙여넣기 → 자동 분류"(`classifyTasks()`)에 자유 텍스트를 넣으면 Claude가 review/self/personal로 분류해서 넣어줌.
- **과제**: 마감일 기반 목록, 하루 가용 학습시간 대비 과부하 계산, Classroom 자동 동기화.
- **시간표**: 주간 시간표(선생님 로테이션 반영).
- **자료**: Classroom에서 온 공지/자료 (Classroom 동기화 섹션 참고). **Teacher 탭은 없어졌지만 이 기능은 별개라 그대로 있음.**
- **아카이브**: 이번 세션에 신규 추가 (아래 "아카이브 & 주간 리포트" 참고).
- **도시**: 3D 시각화 (아래 "도시(3D)" 참고).
- **설정**: 사이드바 왼쪽 아래 버튼 하나로 통합(예전엔 우상단에도 있었음, 제거함). 이름, Claude API 키, GitHub 토큰, 선생님 로테이션 수동 보정, 데이터 내보내기/가져오기.
- 우상단 버튼은 **설정이 아니라 알림 벨**(`renderTopbarMini`/`openNotifications`) — 아래 "알림" 참고.

## 이번 세션에 제거된 것

- **선생님(Teacher) 탭 UI 전체**: `renderTeachersPage`, `renderTeacherDetail`, `teacherItemHtml`, 메모/정보 textarea, "꿀팁" 코너, 선생님 상세 화면의 OT-노트 AI 분류기(`otParse`), 선생님별 완료 항목 모달. **단, 데이터 모델(`state.data.teachers[key]`, `TEACHER_LIST`, `getTD()`, `CATS`)과 Classroom 동기화, 할 일 탭의 자동 분류기는 전부 그대로 유지** — 이 데이터를 여전히 자동으로 읽고 쓰기 때문에 마이그레이션이 필요 없었음. 홈 화면 박스, 도시 시각화, 아카이브 통계는 모두 이 데이터를 그대로 읽음.
- **설정의 "보고서 템플릿" 기능**: `TEMPLATES_KEY`, `DEFAULT_TEMPLATES`, 관련 CSS/디스패처 전부 삭제. (완전히 다른 걸 대체한 게 이번 세션의 "주간 리포트" 기능 — 아래 참고. 이름은 비슷하지만 다른 기능임.)
- **BETA 뱃지**: 도시 탭이 처음 나왔을 때 붙였던 `beta:true`/`.beta-pill` 전부 제거.
- **테두리 스타일 UI**: `.city-graduating`처럼 색 테두리+틴트 배경으로 되어있던 요소를 앱 표준 글래스(`var(--glass)` + `backdrop-filter:blur(var(--blur))` + `var(--border)`)로 통일. "글씨 겉에 테두리 두르는 게 AI스럽다"는 사용자 피드백 반영 — 앞으로 새 UI를 추가할 때도 이 원칙 유지할 것(강조는 글래스 배경 차이/색상으로, 딱딱한 컬러 테두리로 하지 말 것).

## 망각의 시민 (spaced-recall AI 기능)

완료한 과제/자율학습을 바탕으로 Claude가 간격반복 복습 항목("망각의 시민")을 자동 생성해서 도시에 등장시키는 기능.

- `generateRecall()`: `completedHistory(40)`(최근 완료 이력) + `pendingRecall()`(아직 안 끝낸 기존 망각의 시민, 중복 방지용) + **`doneRecall`/`doneRecallText`(완료된 망각의 시민 최근 20개, 태그·자기평가·메모 포함)** 를 프롬프트에 넣어서 호출. `doneRecall`을 넣는 이유: 사용자가 "복습을 끝낸 것도 반영해서 다음 망각의 시민을 만들어야 한다"고 명시적으로 요구했기 때문 — 이전엔 완료된 recall이 생성 로직에서 완전히 안 보였던 버그였음.
- `RECALL_TAGS = {RECALL, APPLICATION, TRANSFER, ERROR_CORRECTION, CONNECTION}` — 회상→적용→전이로 진행 단계를 표시. 프롬프트가 `doneRecall`의 태그 분포를 보고 다음 단계를 판단하도록 지시함.
- `maybeAutoGenerateRecall()`: 앱 열 때마다 하루 1번 정도만 조용히 자동 생성(API 키 있을 때만).
- **JSON 파싱 복구 로직** (이번 세션에 두 번 고침): `parseModelJsonArray(raw)`가 (1) 전체 문자열 파싱 → (2) `[`...`]` 슬라이스 파싱 → (3) 그래도 실패하면 `recoverJsonObjects(s)`로 **문자열 리터럴 상태와 `{}` 중첩 깊이를 직접 추적**하면서 개별 객체를 하나씩 파싱, 실패한 것만 건너뜀. 처음엔 이 복구 로직이 `if(닫는 ] 발견됨)` 안에만 있어서 `max_tokens`를 넘겨 응답이 중간에 끊긴 경우(닫는 `]`가 아예 없음)엔 작동을 안 했음 — `j`(닫는 괄호 위치)를 못 찾으면 문자열 끝까지 스캔하도록 고쳐서 해결. `generateRecall()`의 `max_tokens`도 2000→4000으로 올림. **이 종류의 버그를 또 만들지 않으려면**: 모델 응답을 파싱하는 곳은 항상 "부분적으로 유효한 데이터를 최대한 살리기" 전략을 쓰고, 하나라도 실패하면 전체를 버리는 코드를 넣지 말 것.

## 완료 피드백 (Completion Feedback)

과제/자율학습/망각의 시민을 완료하면(`completeItem`/`completePersonalTask`/`completeRecall`) **자동으로 모달이 뜸** (`openCompletionFeedback`) — 체크만으로는 "제대로 이해하고 끝냈는지 대충 끝냈는지" 구분이 안 되기 때문. 채팅 버블은 아니고 일반 모달(`state.modal='completionFeedback'`, `renderCompletionFeedbackModal()`).

- **Anki 스타일 4단계 자기평가**: `RECALL_RATINGS = {AGAIN:'거의 기억 안 남', HARD:'가물가물했음', GOOD:'잘 기억남', EASY:'완벽했음'}`
- 선택지 아래 자유 텍스트(`feedbackNoteInput`, 선택)도 받음.
- `submitCompletionFeedback(rating)`이 `findAnyCompletedItem(id)`(teachers/personal/recall 완료 배열 세 군데를 id로 뒤져서 찾는 헬퍼, 실제 객체 참조 반환)로 대상을 찾아 `item.recallRating`/`item.feedbackNote`/`item.feedbackAt`을 채우고, **같은 id의 `archiveLog` 항목에도 `rating`/`note`를 동기화**함.
- "그냥 넘어가기"(`skipCompletionFeedback`)로 건너뛸 수 있음 — 강제 아님.
- 이 값들이 `completedHistory()`를 통해 다음 망각의 시민 생성 프롬프트와 아카이브/주간 리포트 통계에 그대로 들어감.

## 아카이브 & 주간 리포트 (이번 세션 신규)

**핵심 원칙**: append-only 원자료(`state.data.archiveLog`)를 절대 건드리지 않고, 모든 요약/통계는 이 원자료에서 **매번 다시 계산**함. 별도로 "요약본"을 저장해두지 않음 — 원자료가 유일한 진실.

- `logArchiveEvent(entry)`: `completeItem`/`completePersonalTask`/`completeRecall` 끝에서 호출. 엔트리 모양: `{id, ts, createdAt, subject, subjectKey, kind, text, attempts?}` — `rating`/`note`는 나중에 완료 피드백 제출 시 같은 id를 찾아서 채워넣음.
- `computeArchiveStats()`: `archiveLog`를 과목별로 그룹핑해서 `{subject, total, ratings:{AGAIN,HARD,GOOD,EASY}, unrated, rated, weakRatio}` 반환. `weakRatio = (AGAIN+HARD)/rated`.
- **최소 표본 3개 게이팅**: 아카이브 페이지에서 과목당 자기평가가 3개 미만이면 강점/약점 판단을 하지 않고 "판단 보류"라고 명시함(`renderArchivePage`의 `withSample = stats.subjects.filter(s=>s.rated>=3)`). 사용자가 준 20원칙 스펙 중 "표본 크기 명시" 원칙을 코드로 직접 구현한 부분.
- `renderArchivePage()`: 보완 필요 과목 Top3 / 잘 다져진 과목 Top3 / 과목별 현황(막대그래프, EASY/GOOD/HARD/AGAIN 비율) / 최근 완료 기록 30개 / "원자료 내보내기"(`exportArchiveLog`, JSON 다운로드) 버튼.
- `generateWeeklyReport()`: 이번 주(`mondayOf(now)` 기준) + 지난 3주 요약을 Claude에 보내서 통지표 스타일 마크다운 리포트를 생성, `downloadTextFile()`로 즉시 다운로드. **사용자가 지정한 20개 원칙(데이터 원칙, 간격반복/인출연습 가중치, 오류 유형 분류, 성장 마인드셋 언어, 캘리브레이션 오차 노출, 환각 방지, 판정 기준 투명성, 과최적화 경고 등)이 전부 한국어 시스템 프롬프트 규칙으로 들어가 있음** — 이 프롬프트를 건드릴 땐 반드시 원본 원칙을 훼손하지 말 것(대화 초기에 사용자가 직접 작성해서 전달한 스펙, 매우 상세하고 근거가 있음). 실제 데이터에 없는 필드(정오답, 반응시간)는 절대 지어내지 말고 "데이터 없음"이라 쓰게 명시적으로 지시되어 있음 — 자기평가 등급을 정오답 대신 매핑해서 씀.
- 알림 모달(`renderNotificationsModal`)에서도 "이번 주 리포트 받기" 버튼으로 같은 함수를 호출할 수 있음.

## 알림 (Notification Bell)

우상단 버튼이 설정에서 알림 벨로 바뀜(`renderTopbarMini`, `computeNotifications()`).

- **의도적으로 좁은 범위**: 디데이가 정확히 D-7일 때만, 과제 마감이 정확히 3일 전/1일 전일 때만 알림. 그 외엔 조용함(사용자 요구사항 원문: "그 외엔 조용히 아무것도 안 뜸").
- `renderNotificationsModal()`: 알림 목록 + "이번 주 리포트 받기" 버튼(`generateWeeklyReport()` 재사용).
- `.notif-badge`로 벨 위에 알림 개수 표시.

## 도시(City) — 3D 시각화

`CITY3D` 네임스페이스에 vendored three.js(OrbitControls 포함) + 커스텀 GLB 에셋(Kenney 에셋 병합)으로 만든 3D 씬. 수업 과제 = 도로 위 자동차, 자율학습 = 주거지 집. 방치 일수(`createdAt` 기준)에 따라 차는 3단계, 집은 4단계로 상태가 나빠지고(연기→고장/화재→붕괴), 완료 처리하면 수리차/소방차 연출 후 정상으로 복귀. 완료된 항목은 그 주가 끝날 때까지 "졸업 예정"으로 도시에 남아있다가 다음 주 월요일에 졸업 앨범(`renderGraduationArchive`)으로 넘어감. 새 데이터 스키마 없이 기존 `teachers[key].review/self`, `personal.tasks`, 각각의 `completed` 배열을 그대로 읽는 뷰 레이어 — 자세한 설계 배경은 `/root/.claude/plans/mighty-hatching-dove.md`(최초 기획 문서, city-of-brain 분기 전) 참고.

**중요**: 3D 캔버스 호스트(`CITY3D.host`, `#city3dSlot`에 장착됨)는 `#app.innerHTML`이 갈아엎어질 때마다 `mountCity3D()`가 매번 새로 생긴 슬롯에 재장착함(호스트 자체는 재사용, DOM에서 옮기기만 함). 렌더 루프 시작/정지는 스크롤스파이가 도시 섹션이 보일 때만 관리함(위 "스크롤 내비게이션" 참고).

**보류 중 (Phase 4, 미착수)**: 사용자가 "도시가 단순 시각화라 2~3년 보면 지루해질 것 같다, 교육학적으로 더 설계할 방법을 고민해달라"고 요청함. 논의만 하고 아직 방향을 정하지 못한 상태 — 다음에 이어받으면 이 부분에 대한 제안(자기평가 연동 성장 시스템, 누적 도시 성장, 마일스톤 이벤트, 처벌보다 성장 프레이밍 등)을 먼저 사용자와 확정하고 구현할 것.

## 데이터 구조 (localStorage, `organizer-data-v2` 키)

```json
{
  "teachers": {
    "카테고리|과목|교사이름": {
      "review": [ { "id": "", "text": "", "createdAt": 0, "reps": 0, "retry": false } ],
      "self":   [ { "id": "", "text": "", "createdAt": 0 } ],
      "tips":   [],
      "completed": [ { "id": "", "text": "", "corner": "review|self", "completedAt": 0,
                        "recallRating": "AGAIN|HARD|GOOD|EASY", "feedbackNote": "", "feedbackAt": 0 } ],
      "memo": "", "info": ""
    }
  },
  "assignments": [ { "id": "", "title": "", "dueDate": "YYYY-MM-DD", "estHours": 0, "tag": "", "done": false, "createdAt": 0, "source": "manual", "link": null } ],
  "notices": [ { "id": "", "type": "notice", "title": "", "tag": "", "postedAt": "", "snippet": "", "link": null } ],
  "personal": {
    "tasks":     [ { "id": "", "text": "", "createdAt": 0, "boxKey": null } ],
    "completed": [ { "id": "", "text": "", "completedAt": 0, "boxKey": null, "recallRating": "", "feedbackNote": "", "feedbackAt": 0 } ]
  },
  "dailyCapacity": 5,
  "importedClassroomIds": [],
  "importedNoticeIds": [],
  "ddays": [ { "id": "", "name": "", "date": "YYYY-MM-DD", "hidden": false } ],
  "recall": {
    "tasks": [ { "id": "", "text": "", "tag": "RECALL|APPLICATION|TRANSFER|ERROR_CORRECTION|CONNECTION",
                  "boxKey": null, "minutes": 0, "done": false, "createdAt": 0, "completedAt": 0,
                  "recallRating": "", "feedbackNote": "" } ],
    "lastGeneratedAt": 0
  },
  "archiveLog": [ { "id": "", "ts": 0, "createdAt": 0, "subject": "", "subjectKey": "", "kind": "", "text": "",
                     "attempts": null, "rating": "AGAIN|HARD|GOOD|EASY", "note": "" } ]
}
```

`boxKey`는 홈 화면 박스 중 하나(`math`/`sci-earth`/`sci-bio`/`sci-chem`/`sci-phys`/`cs`/`hum`) 또는 `null`. 교사/과목/시간표 로스터는 `CATS`, `TIMETABLE` 상수, 로테이션은 `ROTATIONS` 상수, 홈 박스 구성은 `BOXES` 상수 — 전부 `index.html` 안에서 직접 수정.

**중요**: `archiveLog`는 append-only 원자료이므로 절대 필터링/삭제하지 말 것. 통계가 필요하면 항상 여기서 다시 계산하는 함수를 만들 것(기존 데이터를 다른 곳에 복사해서 캐싱하지 말 것 — 원자료와 어긋날 위험).

## AI 기능 (Anthropic API, 브라우저 직접 호출)

세 곳에서 `fetch('https://api.anthropic.com/v1/messages', {...headers:{'x-api-key':..., 'anthropic-dangerous-direct-browser-access':'true'}})` 패턴을 씀 — `model:'claude-sonnet-5'`:

1. `classifyTasks()` — 할 일 탭 자동 분류
2. `generateRecall()` — 망각의 시민 생성
3. `generateWeeklyReport()` — 주간 리포트

API 키는 `localStorage`(`organizer-anthropic-key`)에만 저장, 내보내기 백업에 안 들어감, 오직 위 세 기능에서만 쓰임. `modelText(data)`로 텍스트 추출 후 `parseModelJsonArray`(배열 응답용) 또는 마크다운 그대로(리포트) 사용.

## Classroom 자동 동기화 (과제 + 공지 + 자료)

Gmail Classroom 알림을 감지해서 앱에 반영. 실동기화 데이터는 비공개 저장소 `jundaleee/dshs-organizer-data`의 `data/assignments-sync.json`에 있음(공개 저장소에 실제 과제 내용이 노출되는 걸 막기 위해 분리함).

- **클라이언트(앱)**: 앱 열릴 때, 그리고 과제 탭 "Classroom 동기화" 버튼 클릭 시 해당 JSON을 읽어와 병합. 기한 있는 항목 → 과제 탭, 기한 없는 항목(공지/자료 등) → 자료 탭. `id`로 중복/재추가 방지.
- **Gmail → 저장소 쓰기**(`tools/classroom-sync.gs.js`, Google Apps Script): Gmail을 읽어서 비공개 저장소에 커밋. 설정법은 파일 맨 위 주석 참고 (요약: script.google.com에 붙여넣기 → 스크립트 속성에 `ANTHROPIC_API_KEY`/`GITHUB_TOKEN` 등록 → `syncClassroom` 수동 1회 실행 → 시간 트리거 등록).
- **앱의 읽기 전용 GitHub 토큰**: `dshs-organizer-data` 저장소 하나에 `Contents: Read-only` fine-grained PAT 발급 후 **설정 → GitHub 동기화 토큰**에 등록.

## 검증 방법 (이 세션에서 쓴 워크플로)

- **문법 체크**: `node -e "new Function(require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script>/g,'')).join('\n'))"`
- **로컬 서빙**: `python3 -m http.server <port>` (백그라운드로 띄우고 `curl`로 200 확인)
- **Playwright**: `NODE_PATH=/opt/node22/lib/node_modules node <script>.js`, `chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']})` (WebGL 필요한 3D 도시 화면 때문에 SwiftShader 소프트웨어 렌더러 사용).
- 스크롤 관련 기능은 반드시 `page.mouse.wheel()`로 실제 휠 스크롤을 흉내내서 검증 — `window.scrollTo()` 프로그래매틱 점프만으로는 "진짜 스크롤인지 가짜 탭 전환인지" 구분이 안 됨.

## 배포 워크플로

```
git add index.html
git commit -m "..."
git push origin claude/jundal-study-organizer-migration-3z0jb8
```
푸시 후 30~40초면 GitHub Pages에 반영됨. 별도 빌드/PR/머지 불필요 — 이 브랜치가 그대로 프로덕션.

## 남은 작업 / 다음 단계 후보

- **도시 Phase 4 (교육학적 재설계)**: 위 "도시(3D)" 섹션 참고. 사용자와 방향을 먼저 확정할 것.
- **PWA 오프라인 캐싱**: `manifest.json`은 있음 — service worker 추가하면 오프라인 지원 가능.
- **과목별 학습 모델 고도화**: 현재 수학/물리만 반복 풀이 가중치(`isRepetitionSubject`) 적용.
- 설정 모달의 API 키 설명 문구는 이번 세션에 선생님 탭 제거에 맞춰 갱신함(예전엔 "선생님 상세 화면, 할 일 탭"이라고 되어 있었는데 선생님 상세 화면 자체가 없어져서 "할 일 탭 + 망각의 시민 + 주간 리포트"로 고침) — 이런 식으로 **기능 하나를 제거/추가할 때마다 그 기능을 언급하는 다른 텍스트(설명 문구, 이 README)도 같이 찾아서 고칠 것**. grep으로 관련 문자열을 검색하는 습관을 들일 것.
