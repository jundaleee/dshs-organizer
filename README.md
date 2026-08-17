# Jundal's Study Organizer

자기주도학습 워크벤치 — 단일 HTML 파일로 동작하는 완전 독립형 로컬 웹앱.

## 사용법

`index.html`을 브라우저에서 그냥 열면 끝. 별도 서버나 빌드 과정이 필요 없어.

- 데이터는 브라우저의 `localStorage`에 저장돼 (같은 브라우저 + 같은 파일 경로에서는 다시 열어도 그대로 남아있어).
- PC와 폰처럼 서로 다른 기기/브라우저 간에는 자동으로 동기화되지 않으니, 우측 상단 **⇩ 내보내기**로 백업 JSON을 만들고 다른 쪽에서 **⇧ 가져오기**로 불러와줘.
- 정기적으로 내보내기 백업을 해두는 걸 추천해 (브라우저 데이터 삭제, 시크릿 모드 등으로 로컬 저장이 날아갈 수 있음).

## OT 자동 분류 (AI) 기능

수업 OT 내용을 붙여넣으면 Claude가 복습/자율학습/팁으로 자동 분류해주는 기능이야. 이건 Anthropic API 키가 있어야 동작해:

1. [console.anthropic.com](https://console.anthropic.com)에서 API 키 발급
2. 앱 우측 상단 **⚙ 설정**에서 키 등록
3. 키는 이 브라우저의 로컬 저장소에만 저장되고, 내보내기 백업 파일에는 포함되지 않음 (다른 기기에서는 다시 입력 필요)

키를 등록하지 않으면 이 기능만 빼고 나머지는 전부 정상 동작해.

## 선생님 주간 로테이션

물리학(박준홍/김정석)과 지구과학(이윤아/배태윤)은 2타임 담당이 매주 바뀌어. 이 저장소를 만든 주(2026-08-17 기준)를 기준으로 자동 계산하고, 방학 등으로 어긋나면 **⚙ 설정 → 선생님 로테이션**에서 수동으로 맞출 수 있어.

## Classroom 과제 자동 가져오기

Gmail로 오는 Google Classroom 알림을 감지해서 **과제** 탭에 기한과 함께 자동으로 추가해주는 기능. 두 부분으로 나뉘어 있어:

1. **클라이언트 쪽 (완료)**: 앱이 열릴 때마다, 그리고 과제 탭의 **🔄 Classroom 동기화** 버튼을 누를 때마다 `data/assignments-sync.json`을 GitHub에서 읽어와 새 항목을 로컬 과제 목록에 병합해. 이미 가져온 항목은 `id`로 추적해서 중복 추가되지 않고, 사용자가 지워도 다시 나타나지 않아.
2. **Gmail 쪽 (설정 필요)**: 실제로 Gmail을 읽어서 이 JSON 파일에 새 과제를 커밋해주는 예약 작업. 아직 설정 전이야 — Claude가 Gmail을 읽으려면 claude.ai에서 Gmail 커넥터를 먼저 연결해야 해.

**저장소가 비공개**라서 (팀/개인 정보 보호 목적) 동기화 파일도 인증 없이는 못 읽어. 그래서 GitHub 토큰이 하나 더 필요해:

1. https://github.com/settings/personal-access-tokens/new 에서 fine-grained 토큰 발급
2. Repository access → **Only select repositories** → `dshs-organizer` 선택
3. Repository permissions → **Contents: Read-only**
4. 발급받은 토큰을 앱 **⚙ 설정 → GitHub 동기화 토큰**에 등록

Classroom에서 온 과제는 예상 학습 시간이 없으니(기한만 있음), 과제 목록에서 "예상 h 입력" 칸에 직접 채워야 하루 학습량 계산에 반영돼.

## 데이터 구조 (백업 JSON)

```json
{
  "teachers": { "카테고리|과목|교사이름": { "review": [], "self": [], "tips": [], "completed": [], "memo": "", "info": "" } },
  "assignments": [ { "id": "", "title": "", "dueDate": "YYYY-MM-DD", "estHours": 0, "tag": "", "done": false, "createdAt": 0, "source": "manual" } ],
  "dailyCapacity": 5,
  "importedClassroomIds": []
}
```

교사/과목/시간표 로스터는 `index.html` 안의 `CATS`, `TIMETABLE` 상수를 직접 수정하면 돼. 로테이션 대상 과목은 `ROTATIONS` 상수에 있어.

## 다음 단계 후보

- **Gmail → Classroom 동기화 예약 작업 설정**: Gmail 커넥터 연결 후 진행
- **PWA화**: `manifest.json` + service worker 추가 — 단, 이건 `file://`로 열 때는 동작하지 않고 로컬 서버(`http://localhost`) 또는 실제 배포(HTTPS)가 필요함
- **과목별 학습 모델 고도화**: 현재는 수학/물리만 반복 풀이 가중치 적용 — 다른 과목 학습법을 알려주면 과목별 알고리즘 추가 가능 (제시 예정)
- **디자인 리뉴얼** (추후 지시 예정)
