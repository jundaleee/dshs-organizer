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
2. 앱 우측 상단 **⚙ API 키**에서 키 등록
3. 키는 이 브라우저의 로컬 저장소에만 저장되고, 내보내기 백업 파일에는 포함되지 않음 (다른 기기에서는 다시 입력 필요)

키를 등록하지 않으면 이 기능만 빼고 나머지는 전부 정상 동작해.

## 데이터 구조 (백업 JSON)

```json
{
  "teachers": { "카테고리|과목|교사이름": { "review": [], "self": [], "tips": [], "completed": [], "memo": "", "info": "" } },
  "assignments": [ { "id": "", "title": "", "dueDate": "YYYY-MM-DD", "estHours": 0, "tag": "", "done": false, "createdAt": 0 } ],
  "dailyCapacity": 5
}
```

교사/과목/시간표 로스터는 `index.html` 안의 `CATS`, `TIMETABLE` 상수를 직접 수정하면 돼.

## 다음 단계 후보

- **PWA화**: `manifest.json` + service worker 추가 — 단, 이건 `file://`로 열 때는 동작하지 않고 로컬 서버(`http://localhost`) 또는 실제 배포(HTTPS)가 필요함
- **Google Classroom/Chat 연동**: OAuth 클라이언트 등록 필요 (Google Cloud 프로젝트 생성)
- **과목별 학습 모델 고도화**: 현재는 수학/물리만 반복 풀이 가중치 적용 — 다른 과목 학습법을 알려주면 과목별 알고리즘 추가 가능
- **디자인 리뉴얼**
