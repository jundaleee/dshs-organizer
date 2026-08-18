/**
 * Study Organizer — Classroom → GitHub 동기화 (Google Apps Script)
 *
 * Claude Code Remote의 Gmail 커넥터가 대화창마다 다시 켜야 하는 문제 때문에
 * 신뢰할 수 없어서, Gmail 자체 계정 안에서 도는 Apps Script로 옮긴 버전.
 * 커넥터/세션 개념이 없어서 한 번 설정해두면 계속 돈다.
 *
 * ===== 설정 방법 =====
 * 1. https://script.google.com → 새 프로젝트 → 이 파일 내용 전체를 붙여넣기
 * 2. 왼쪽 톱니바퀴(프로젝트 설정) → 스크립트 속성(Script Properties) → 추가:
 *      ANTHROPIC_API_KEY = (console.anthropic.com에서 발급받은 키, 앱 설정에 넣은 것과 같아도 됨)
 *      GITHUB_TOKEN = (아래 설명 참고 — 앱에서 쓰는 읽기전용 토큰과는 "다른", 쓰기 권한 있는 토큰이어야 함)
 * 3. GITHUB_TOKEN 발급: https://github.com/settings/personal-access-tokens/new
 *      - Repository access → Only select repositories → dshs-organizer
 *      - Repository permissions → Contents → Read and write
 *    (앱의 "GitHub 동기화 토큰"은 읽기 전용이라 이 자동화가 커밋을 못 함 — 반드시 새로 하나 더 발급)
 * 4. 함수 목록에서 syncClassroom 선택 → 실행(▶) → 처음 실행 시 권한 승인 화면이 뜨면 전부 허용
 *    (Gmail 읽기 + 외부 URL 호출 권한을 요구함 — 이 스크립트가 하는 일이 정확히 그것들임)
 * 5. 왼쪽 시계 아이콘(트리거) → 트리거 추가 → 실행할 함수: syncClassroom →
 *    이벤트 소스: 시간 기반 → 시간 타이머 → 1시간마다
 * 6. 완료 — 이제부터 앱을 안 열어도, 아무 chat도 안 켜도 매시간 자동으로 돈다.
 */

const REPO_OWNER = 'jundaleee';
const REPO_NAME = 'dshs-organizer';
const REPO_BRANCH = 'claude/jundal-study-organizer-migration-3z0jb8';
const SYNC_PATH = 'data/assignments-sync.json';
const PROCESSED_LABEL = 'Classroom-Synced';
const CLAUDE_MODEL = 'claude-sonnet-5';

function syncClassroom() {
  const props = PropertiesService.getScriptProperties();
  const anthropicKey = props.getProperty('ANTHROPIC_API_KEY');
  const githubToken = props.getProperty('GITHUB_TOKEN');
  if (!anthropicKey || !githubToken) {
    Logger.log('ANTHROPIC_API_KEY / GITHUB_TOKEN 이 스크립트 속성에 없음 — 설정부터 해줘.');
    return;
  }

  const label = getOrCreateLabel_(PROCESSED_LABEL);
  const threads = GmailApp.search('from:classroom.google.com newer_than:7d -label:' + PROCESSED_LABEL, 0, 50);
  if (threads.length === 0) { Logger.log('새 메일 없음.'); return; }

  const file = getSyncFile_(githubToken);
  const knownIds = new Set(
    (file.data.assignments || []).map(a => a.id)
      .concat((file.data.notices || []).map(n => n.id))
  );

  const newAssignments = [];
  const newNotices = [];

  threads.forEach(thread => {
    const id = 'gclass-' + thread.getId();
    if (knownIds.has(id)) { thread.addLabel(label); return; }

    const msg = thread.getMessages()[0];
    const subject = msg.getSubject();

    if (/^내일 기한:/.test(subject)) { thread.addLabel(label); return; }

    const body = msg.getPlainBody();
    const date = msg.getDate();
    const extracted = extractWithClaude_(anthropicKey, subject, body, date);
    if (!extracted) { return; } // 실패하면 라벨을 안 붙여서 다음 실행 때 재시도

    if (extracted.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(extracted.dueDate)) {
      newAssignments.push({ id, title: extracted.title, dueDate: extracted.dueDate, tag: extracted.tag });
    } else {
      newNotices.push({
        id,
        type: extracted.type === 'material' ? 'material' : 'notice',
        title: extracted.title,
        tag: extracted.tag,
        postedAt: date.toISOString(),
        snippet: extracted.snippet || ''
      });
    }
    thread.addLabel(label);
  });

  if (newAssignments.length === 0 && newNotices.length === 0) {
    Logger.log('처리할 새 항목 없음 (전부 마감 리마인더거나 이미 처리됨).');
    return;
  }

  file.data.assignments = (file.data.assignments || []).concat(newAssignments);
  file.data.notices = (file.data.notices || []).concat(newNotices);
  file.data.lastCheckedAt = new Date().toISOString();

  commitSyncFile_(githubToken, file.data, file.sha, newAssignments.length, newNotices.length);
  Logger.log(`Classroom sync: 과제 ${newAssignments.length}개, 공지·자료 ${newNotices.length}개 추가함.`);
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function getSyncFile_(githubToken) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SYNC_PATH}?ref=${REPO_BRANCH}`;
  const res = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + githubToken, Accept: 'application/vnd.github+json' },
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('동기화 파일 조회 실패: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
  const json = JSON.parse(res.getContentText());
  const content = Utilities.newBlob(Utilities.base64Decode(json.content.replace(/\n/g, ''))).getDataAsString('UTF-8');
  return { data: JSON.parse(content), sha: json.sha };
}

function commitSyncFile_(githubToken, data, sha, addedAsg, addedNotices) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${SYNC_PATH}`;
  const body = {
    message: `Classroom sync: add ${addedAsg} assignment(s), ${addedNotices} notice(s)`,
    content: Utilities.base64Encode(JSON.stringify(data, null, 2), Utilities.Charset.UTF_8),
    sha: sha,
    branch: REPO_BRANCH
  };
  const res = UrlFetchApp.fetch(url, {
    method: 'put',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + githubToken },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('커밋 실패: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

function extractWithClaude_(apiKey, subject, body, date) {
  const receivedDate = Utilities.formatDate(date, 'Asia/Seoul', 'yyyy-MM-dd');
  const prompt = `다음은 Google Classroom에서 온 이메일이야. 아래 JSON 형식으로만 답해 (다른 설명, 코드블록 금지):
{"type":"assignment 또는 notice 또는 material","title":"...","dueDate":"YYYY-MM-DD 또는 null","tag":"...","snippet":"..."}

- title: 이메일 제목에 따옴표(' ')로 감싸진 부분이 있으면 그 안 텍스트, 없으면 제목 전체.
- dueDate: 본문에 "기한: N월 N일" 같은 마감일 표현이 있으면 YYYY-MM-DD로 변환, 없으면 null.
  연도가 본문에 안 적혀 있으면 이메일 수신일(${receivedDate})의 연도를 기본으로 쓰되,
  그렇게 계산한 날짜가 수신일보다 30일 이상 과거가 되면 연도를 +1 해서 다음 해로 처리해.
- tag: 이 메일이 속한 수업/클래스 이름 (본문 상단, "알림 설정" 다음 줄에 보통 있음).
- type: 제목에 "자료"가 들어가면 material, dueDate가 있으면 assignment, 그 외엔 notice.
- snippet: 본문 내용을 2~3문장으로 간결하게 요약 (dueDate가 있으면 빈 문자열이어도 됨).

제목: ${subject}

본문:
${body}`;

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    payload: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    }),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() !== 200) {
    Logger.log('Claude 호출 실패: ' + res.getResponseCode() + ' ' + res.getContentText());
    return null;
  }

  try {
    const data = JSON.parse(res.getContentText());
    const raw = (data.content || []).map(b => b.text || '').join('').trim();
    const clean = raw.replace(/^```json/i, '').replace(/```$/, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    Logger.log('파싱 실패: ' + e + ' / raw: ' + res.getContentText());
    return null;
  }
}
