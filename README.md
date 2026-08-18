# Study Organizer

자기주도학습 워크벤치 — 단일 HTML 파일로 동작하는 완전 독립형 로컬 웹앱.

## 사용법

`index.html`을 브라우저에서 그냥 열면 끝. 별도 서버나 빌드 과정이 필요 없어.

- 데이터는 브라우저의 `localStorage`에 저장돼 (같은 브라우저 + 같은 파일 경로에서는 다시 열어도 그대로 남아있어).
- PC와 폰처럼 서로 다른 기기/브라우저 간에는 자동으로 동기화되지 않으니, **설정 → 데이터**에서 내보내기로 백업 JSON을 만들고 다른 쪽에서 가져오기로 불러와줘.
- 정기적으로 내보내기 백업을 해두는 걸 추천해 (브라우저 데이터 삭제, 시크릿 모드 등으로 로컬 저장이 날아갈 수 있음).

## 화면 구성

- **홈**: 오늘 할 일(추천 복습 미리보기) · 임박한 과제 전체 · 오늘 시간표 · 최근 공지·자료
- **할 일**: 모든 선생님의 수업 복습·자율 학습 항목을 한곳에서 관리
- **과제**: 마감일 기반 과제 목록, 하루 가용 학습시간 대비 과부하 계산, Classroom 자동 동기화
- **시간표**: 주간 전체 시간표 (선생님 로테이션 반영)
- **선생님**: 과목별 선생님 목록 → 클릭하면 그 자리에서 펼쳐짐 (수업 정보/메모/복습·자율학습·꿀팁/OT 자동 분류)
- **플래너**: 날짜를 선택해서 그날의 시간표와 마감 과제를 확인
- **설정**: API 키, GitHub 토큰, 이름, 선생님 로테이션 수동 보정, 데이터 내보내기/가져오기

## OT 자동 분류 (AI) 기능

선생님 상세 화면 안의 "OT 붙여넣기 → AI 자동 정리" 박스에 수업 OT 내용을 붙여넣으면 Claude가 복습/자율학습/팁으로 자동 분류해줘. 이건 **오직 이 기능에서만** 쓰이는 Anthropic API 키가 있어야 동작해:

1. [console.anthropic.com](https://console.anthropic.com)에서 API 키 발급
2. **설정 → Claude API 키**에서 등록
3. 키는 이 브라우저의 로컬 저장소에만 저장되고, 내보내기 백업 파일에는 포함되지 않음 (다른 기기에서는 다시 입력 필요)

키를 등록하지 않으면 이 기능만 빼고 나머지는 전부 정상 동작해.

## 선생님 주간 로테이션

물리학(박준홍/김정석)과 지구과학(이윤아/배태윤)은 2타임 담당이 매주 바뀌어. 이 저장소를 만든 주(2026-08-17 기준)를 기준으로 자동 계산하고, 방학 등으로 어긋나면 **설정 → 선생님 로테이션**에서 수동으로 맞출 수 있어.

## Classroom 자동 동기화 (과제 + 공지 + 자료)

Gmail로 오는 Google Classroom 알림(과제/공지/자료/성적공지 등 전부)을 감지해서 앱에 자동으로 반영하는 기능. 두 부분으로 나뉘어 있어:

- **클라이언트 쪽 (앱, 완료)**: 앱은 열릴 때마다, 그리고 과제 탭의 "Classroom 동기화" 버튼을 누를 때마다 저장소의 `data/assignments-sync.json`을 읽어와 병합해.
  - **기한이 있는 항목** → **과제** 탭에 자동 추가
  - **기한이 없는 항목**(공지/자료/성적공지 등) → **홈** 화면 하단 "공지·자료" 섹션에 표시
  - 이미 가져온 항목은 `id`로 추적해서 중복 추가되지 않고, 사용자가 지워도 다시 나타나지 않아.

- **Gmail 쪽 (`tools/classroom-sync.gs.js`, Google Apps Script)**: 실제로 Gmail을 읽어서 위 JSON 파일에 새 항목을 커밋해주는 쪽. 원래 Claude Code Remote의 예약 작업(Routine)으로 만들었는데, **Gmail 커넥터가 대화창마다 다시 켜야 하는 문제 때문에 신뢰할 수 없어서 폐기했어.** 대신 Google Apps Script로 옮겼어 — Google 계정 안에서 직접 도는 방식이라 커넥터/세션 개념 자체가 없고, 한 번 설정하면 그냥 계속 돌아가.

  설정 방법은 `tools/classroom-sync.gs.js` 파일 맨 위 주석에 있어. 요약하면:
  1. https://script.google.com 에서 새 프로젝트 만들고 그 파일 내용을 붙여넣기
  2. 스크립트 속성에 `ANTHROPIC_API_KEY`(앱 설정에 넣은 키 재사용 가능)와 `GITHUB_TOKEN`(**앱의 읽기 전용 토큰과 별개로, Contents: Read and write 권한으로 새로 발급**) 등록
  3. `syncClassroom` 함수 한 번 수동 실행 → 권한 승인
  4. 트리거 추가: `syncClassroom`을 1시간마다 실행

**저장소가 비공개**라서 (개인정보 보호 목적) 앱이 동기화 파일을 읽으려면 별도로 읽기 전용 GitHub 토큰이 필요해 (Apps Script가 쓰는 쓰기용 토큰과는 다른, 앱 전용 토큰):

1. https://github.com/settings/personal-access-tokens/new 에서 fine-grained 토큰 발급
2. Repository access → **Only select repositories** → `dshs-organizer` 선택
3. Repository permissions → **Contents: Read-only**
4. 발급받은 토큰을 **설정 → GitHub 동기화 토큰**에 등록

Classroom에서 온 과제는 예상 학습 시간이 없으니(기한만 있음), 과제 목록에서 "예상 h 입력" 칸에 직접 채워야 하루 학습량 계산에 반영돼.

## 데이터 구조 (백업 JSON)

```json
{
  "teachers": { "카테고리|과목|교사이름": { "review": [], "self": [], "tips": [], "completed": [], "memo": "", "info": "" } },
  "assignments": [ { "id": "", "title": "", "dueDate": "YYYY-MM-DD", "estHours": 0, "tag": "", "done": false, "createdAt": 0, "source": "manual" } ],
  "notices": [ { "id": "", "type": "notice", "title": "", "tag": "", "postedAt": "", "snippet": "" } ],
  "dailyCapacity": 5,
  "importedClassroomIds": [],
  "importedNoticeIds": []
}
```

교사/과목/시간표 로스터는 `index.html` 안의 `CATS`, `TIMETABLE` 상수를 직접 수정하면 돼. 로테이션 대상 과목은 `ROTATIONS` 상수에 있어.

## 다음 단계 후보

- **PWA화**: `manifest.json` + service worker 추가 — 단, 이건 `file://`로 열 때는 동작하지 않고 로컬 서버(`http://localhost`) 또는 실제 배포(HTTPS)가 필요함
- **과목별 학습 모델 고도화**: 현재는 수학/물리만 반복 풀이 가중치 적용 — 다른 과목 학습법을 알려주면 과목별 알고리즘 추가 가능 (제시 예정)
