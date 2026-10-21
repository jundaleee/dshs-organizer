# Study Organizer (Sorganizer)

단일 HTML 파일(`index.html`)로 동작하는 개인용 웹앱. IIFE로 감싼 바닐라 JS, 프레임워크 없음, 빌드 스텝 없음.

> 이 문서는 다음에 이 코드를 이어받을 AI 에이전트를 위해 쓰였음. 지금 이 앱이 왜 이렇게 작아졌는지, 남은 기능이 뭔지, 데이터 구조가 어떻게 바뀌었는지 최대한 상세히 적어둠.

## 사용법 / 배포

**https://jundaleee.github.io/dshs-organizer/** 로 접속.

- 이 저장소는 브랜치가 **`claude/jundal-study-organizer-migration-3z0jb8` 단 하나뿐**이고(`main` 없음), GitHub Pages가 이 브랜치를 소스로 자동 배포함. 이 브랜치에 푸시하면 GitHub Actions("pages-build-deployment")가 돌고 약 30~40초 안에 `jundaleee.github.io/dshs-organizer/`에 반영됨. 별도로 머지하거나 브랜치를 바꿀 필요 없음 — **이 브랜치가 곧 프로덕션**.
- 데이터는 브라우저 `localStorage`(`organizer-data-v2` 키)에 저장됨. 계정 로그인이 아니라 브라우저에 묶인 저장이라 다른 브라우저/기기/시크릿 모드에서는 안 보임. **설정 → 데이터**에서 내보내기/가져오기로 기기 간 백업.
- 이 저장소는 **공개**. 실제 사용자 과제/디데이 데이터는 로컬에만 있어 안전. Classroom 실데이터는 별도 **비공개** 저장소(`jundaleee/dshs-organizer-data`)에 있음 (아래 "Classroom 자동 동기화" 참고).

## 지금 이 앱은 기능이 둘뿐임 — "과제"(Classroom 동기화 포함) + "디데이"

**이 앱은 원래 홈(과목 박스)/할 일/과제/시간표/자료/아카이브/도시(3D 시각화)/망각의 시민(AI 간격반복)/주간 리포트 등 훨씬 많은 기능을 가진 범용 학습 워크벤치였다.** 2026-10-19~21 세션에 사용자가 "이제 도시도 다른 것도 거의 안 쓰고 거의 다 과제 제출 확인(Classroom 과제)으로만 쓰니까 임시로 다 없애고, 홈 화면을 과제 목록으로 가득 채워라, 디데이는 남겨두라"고 명시적으로 요청한 결과, **과제 탭과 디데이만 남기고 나머지 전부(홈 과목 박스, 할 일, 시간표, 자료, 아카이브, 도시 3D, 망각의 시민/간격반복 엔진, 완료 피드백 대화창, 일일/주간 AI 리포트, 스톱워치/뽀모도로, AI 자동 분류, 선생님 로테이션 설정, Claude API 키 설정)를 전부 삭제**했다. 탭 전환/스크롤 체인 내비게이션도 전부 없어졌고, 화면은 "과제" 하나뿐이라 사이드바·바텀내브도 사라지고 상단에 가벼운 바(브랜드 + 알림 벨 + 설정)만 남음.

**"임시로"라는 표현을 사용자가 직접 썼다** — 나중에 되돌려달라는 요청이 올 수 있음. 되돌릴 땐 이 커밋 이전 히스토리에서 `git revert`하면 되지만, **데이터는 되돌아가지 않는다**는 점을 반드시 사용자에게 먼저 알릴 것: 이 변경 이후 앱을 한 번이라도 쓰면(과제 체크, 디데이 추가 등) `persist()`가 트리밍된 데이터 모양(`{assignments, importedClassroomIds, ddays}`)으로 `localStorage`를 덮어써서 `teachers`/`personal`/`recall`/`archiveLog`/`reports` 등 예전 데이터가 사라진다. 코드를 되돌려도 그 데이터는 돌아오지 않음 — 되돌리기 전에 꼭 **설정 → 데이터 → 내보내기**로 백업해두라고 안내할 것.

**사용자가 "실수로 과제 목록을 다 지웠다"고 보고한 적이 있음(이 축소 작업 직전)** — 이건 코드가 아니라 사용자 브라우저의 `localStorage` 데이터 유실이라 git으로 복구 불가능. 유일한 복구 경로는 "Classroom 동기화" 버튼으로 비공개 저장소의 `assignments-sync.json`에서 다시 당겨오는 것인데, `importedClassroomIds`(동기화 중복 방지 목록)가 그대로 남아있으면 이미 "가져온 적 있음"으로 처리돼 재동기화해도 다시 안 나타난다 — 이 경우 `importedClassroomIds`를 비우거나(설정에 UI 없음, 콘솔에서 `localStorage` 직접 수정 필요) 비공개 저장소 원본에서 직접 확인해야 함.

### 대량 삭제 작업 방법 (이번 세션에 실제로 쓴 절차)

예전 세션에 `sed`로 통짜 라인 범위를 지우다 서로 다른 기능이 물리적으로 섞여 있던 걸 못 보고 Tasks 페이지 함수를 같이 날려먹은 사고가 있었음(이전 README에 기록돼 있었음). 이번엔 ~5000줄짜리 파일 대부분을 지워야 하는 훨씬 큰 작업이라 그 교훈을 더 철저히 반영함:

1. 먼저 Explore 서브에이전트에게 전체 파일을 읽게 해서, 모든 top-level 함수/상수/CSS 블록을 "유지할 기능(과제/디데이)"과 "삭제할 기능" 버킷으로 분류하고, **물리적으로 서로 다른 버킷이 뒤섞여 있는 지점**(한 함수 안에 유지할 로직과 삭제할 로직이 같이 들어있는 경우, 같은 CSS 주석 블록 안에 둘 다 있는 경우)을 전부 짚어내는 지도를 만들게 함.
2. 그 지도에서 "위험 지점"으로 표시된 곳(`renderHome()`이 과목 박스+디데이+스톱워치+과제 미리보기+도시 미리보기를 한 함수에서 같이 그리던 것, `renderNotificationsModal()`이 알림 목록+보고서 목록+완료 취소를 한 템플릿에서 같이 그리던 것 등)은 **함수를 통째로 지우지 않고 내부를 다시 써서** 유지할 부분만 남김.
3. 나머지(서로 안 섞인, 완전히 독립적인 기능 블록)는 Python 스크립트로 "시작 마커 문자열 ~ 끝 마커 문자열" 사이를 통째로 잘라내는 방식 사용 — 마커는 파일에서 유일해야 하고 스크립트가 그걸 검증함(안 유일하면 바로 에러). 하드코딩된 줄 번호를 안 쓰므로 앞쪽 삭제가 뒤쪽 줄 번호를 밀어내도 안전함.
4. 삭제 후 **지웠다고 생각한 함수/변수 이름 전부**를 `grep -c`로 파일 전체에서 재검색해서 호출부에 안 남아있는지 확인(디스패처/키다운 리스너/설정 모달처럼 여러 함수를 한 군데서 호출하는 코드는 함수 본체를 지워도 호출부가 그대로 남아 `ReferenceError`를 내기 쉬움).
5. CSS도 똑같이: 정규식으로 모든 `class="..."` / `classList.add(...)` 를 긁어서 CSS에 정의가 없는 클래스가 있는지 교차 검증(실제로 이 과정에서 `.row-link`를 실수로 같이 지웠다가 발견해서 복구한 적 있음 — assignments 행이 공지/자료 행과 CSS 클래스를 공유하고 있었음).
6. Playwright로 실제 브라우저에서 전체 플로우(디데이 추가/숨기기/삭제, 과제 추가/수정/우선순위/정렬/완료 처리, 설정 저장, 새로고침 후 데이터 유지, 콘솔 에러 없음)를 돌려 검증. **완료 처리된 과제는 목록에서 사라지는 게 원래부터 있던 의도된 동작**(`renderAssignmentsPage()`가 `!a.done`만 필터링해서 보여줌)이라, "완료 토글 후 화면에 글자가 안 보인다"는 결과만 보고 버그로 착각하지 말 것 — `localStorage`를 직접 읽어서 `done:true`로 잘 바뀌었는지 확인하는 식으로 검증해야 함.

**앞으로 또 대량 삭제를 할 땐 이 6단계를 그대로 따를 것.**

## 남은 기능 상세

### 디데이

`addDday`/`deleteDday`/`toggleDdayHidden`/`toggleDdayAdd`/`renderDdayCard()` — 세션 이전과 동작 동일, 코드도 거의 안 건드림. "과제" 페이지 맨 위에 카드로 고정 표시됨(예전엔 홈 화면에 스톱워치와 나란히 있었는데, 스톱워치가 삭제되면서 디데이 카드만 단독으로 남음).

### 과제 (Classroom 동기화 포함)

`addAssignment`/`saveAssignmentEdit`/`toggleAssignment`/`deleteAssignment`/`assignmentRowHtml`/`renderDdayTimeline`(마감일 타임라인 시각화 — 이름에 "dday"가 들어가 있지만 디데이 기능과는 무관, 과제 마감일 클러스터 시각화임)/`renderAssignmentsPage` — 전부 세션 이전과 동일한 코드. 우선순위(`상/중/하`) 태그, 마감일순/가성비순 정렬, 인라인 수정 모두 그대로.

**Classroom 자동 동기화**: `syncClassroom(manual)`이 비공개 저장소(`jundaleee/dshs-organizer-data`)의 `data/assignments-sync.json`을 GitHub 토큰으로 읽어와 `id` 기준 중복 없이 `state.data.assignments`에 병합. 원래는 과제뿐 아니라 공지/자료(`notices`)도 같이 동기화했는데, **자료 탭 자체가 삭제됐으므로 `syncClassroom()`에서 공지 처리 절반을 들어냄** — `payload.notices`는 이제 아예 안 읽음. Gmail → 저장소 쓰기 스크립트(`tools/classroom-sync.gs.js`)는 여전히 공지도 같이 커밋하지만, 이 앱은 그중 `assignments`만 소비함(나머지는 그냥 무시됨, 에러 안 남).

## 데이터 구조 (localStorage, `organizer-data-v2` 키)

```json
{
  "assignments": [ { "id": "", "title": "", "dueDate": "YYYY-MM-DD", "tag": "", "priority": "high|mid|low|null",
                      "done": false, "createdAt": 0, "source": "manual|classroom-sync", "link": null } ],
  "importedClassroomIds": [],
  "ddays": [ { "id": "", "name": "", "date": "YYYY-MM-DD", "hidden": false } ]
}
```

이게 **이 앱이 저장하는 데이터의 전부**임(예전엔 `teachers`/`notices`/`dailyCapacity`/`importedNoticeIds`/`personal`/`recall`/`archiveLog`/`reports`/`recallRequests`/`recallReserve`까지 있었음 — 전부 삭제된 기능들의 데이터라 전부 뺌). `estHours` 필드도 더 이상 안 씀(`addAssignment()`가 안 받음 — Classroom 동기화 쪽만 과거 호환으로 값이 있으면 저장은 하지만 아무도 안 읽음).

## 코드 구조

`index.html` 하나(`<style>` + `<script>`, IIFE 하나로 감쌈, 약 850줄 — 세션 시작 시점엔 약 5000줄이었음). 대략 순서:

1. `DAYNAME`/`MONTHNAME`(과제 마감일 타임라인용), `genId()`, `buildSkeleton()`, 오늘 날짜 유틸(`now`/`todayMid`/`toISODate`)
2. `localStorage` 저장/로드(`loadData`/`persist`), GitHub 토큰 저장(`getGithubToken`/`setGithubToken`)
3. `state` 객체(`{modal, asgSortMode, editingAssignment, ddayAddOpen, data}`) — 예전엔 `view`/`activeSection`/`cityView`/`editingTask`/`feedbackTargetId`/`reportViewId` 등 삭제된 기능용 필드가 훨씬 많았음
4. 아이콘(`icon(name)` — `settings`/`check`/`close`/`trash`/`chevron`/`arrowRight`/`external`/`pencil`/`bell` 아홉 개만 남음)
5. 렌더 시스템(`render()` — 탭도 스크롤 체인도 없이 `#app`에 `renderAssignmentsPage()` 결과만 통째로 다시 씀), `renderTopbar()`(브랜드 + 알림 벨 + 설정 버튼뿐)
6. 알림(`computeNotifications` — 디데이 D-7, 과제 마감 D-3/D-1만. `renderTopbarMini`/`renderNotificationsModal`)
7. **디데이** — `addDday`/`deleteDday`/`toggleDdayHidden`/`toggleDdayAdd`/`renderDdayCard`
8. **과제** — `PRIORITY_LABELS`/`PRIORITY_RANK`/`assignmentRowHtml`/`fmtShortDate`/`renderDdayTimeline`/`renderAssignmentsPage`
9. 설정 모달(`renderSettingsModal` — GitHub 토큰 + 데이터 내보내기/가져오기 둘뿐), `escapeHtml`
10. 과제 액션(`addAssignment`/`saveAssignmentEdit`/`toggleAssignment`/`deleteAssignment`), 설정 액션(`testGithubToken`/`saveGithubToken`/`clearGithubToken`), 동기화 상태 변수(`syncStatus`/`lastSyncCheckedAt`/`lastSyncError`/`syncHealthHtml`)
11. Classroom 동기화(`DATE_RE`/`syncClassroom`), 내보내기/가져오기(`exportData`/`importDataFromFile`)
12. 이벤트 위임 디스패처(`document.body`에서 `data-action` 기반 `switch`, 이제 20개 케이스뿐 — 예전엔 60개 넘었음)
13. `init()` — 로컬 데이터 로드 후 `render()`, `syncClassroom(false)`

**렌더 패턴**: 상태가 바뀌면 `render()`가 화면 전체를 통째로 새로 씀 — 화면이 하나뿐이라 예전의 "오버레이만 가볍게 다시 그리기" 최적화(`renderOverlaysOnly`)는 모달(설정/알림) 쪽만 남기고 단순화함.

## 검증 방법

- **문법 체크**: `node -e "new Function(require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/g).map(s=>s.replace(/<\/?script>/g,'')).join('\n'))"`
- **대량 삭제 후 필수 교차검증**: 위 "대량 삭제 작업 방법" 섹션의 1~5단계(지도 작성 → 위험 지점 내부만 다시 쓰기 → 마커 기반 스크립트 삭제 → 호출부 grep 전수조사 → CSS 클래스 교차검증) 그대로 반복할 것.
- **로컬 서빙 + Playwright**: `python3 -m http.server <port>` 로 띄운 뒤 `NODE_PATH=/opt/node22/lib/node_modules node <script>.js`로 과제/디데이 CRUD, 설정 저장, 새로고침 후 데이터 유지, 콘솔 에러 유무를 확인. **완료 처리된 과제는 화면에서 사라지는 게 정상 동작**이므로, 토글 검증은 화면 텍스트가 아니라 `localStorage.getItem('organizer-data-v2')`를 직접 읽어서 확인할 것.

## 배포 워크플로

```
git add index.html
git commit -m "..."
git push origin claude/jundal-study-organizer-migration-3z0jb8
```
푸시 후 30~40초면 GitHub Pages에 반영됨. 별도 빌드/PR/머지 불필요 — 이 브랜치가 그대로 프로덕션.

## 남은 작업 / 다음 단계 후보

- "임시로" 없앤 기능들을 되돌리고 싶어지면: git revert만으로는 데이터가 안 돌아온다는 점을 위 "지금 이 앱은 기능이 둘뿐임" 섹션 참고해서 먼저 사용자에게 알릴 것.
- Classroom 동기화가 공지/자료(`notices`)를 더 이상 안 받으므로, 비공개 저장소 쓰기 스크립트(`tools/classroom-sync.gs.js`)도 과제만 쓰도록 같이 줄일지는 미정(지금은 공지도 계속 커밋되지만 이 앱이 그냥 무시함 — 저장소 용량·git 기록만 남고 해는 없음).
- 과제 목록에 "완료된 과제 보기" 같은 뷰가 없음(원래부터 없었음, 체크하면 그냥 목록에서 사라짐) — 필요해지면 새로 만들어야 함.
