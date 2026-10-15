/**
 * AI 環保小創客｜雲端收件服務（Google Apps Script）
 *
 * 安裝方式（詳細步驟請看「教師檢視器 → 雲端收件設定」）：
 * 1. 建立一個新的 Google 試算表 → 擴充功能 → Apps Script
 * 2. 把這整份程式碼貼上，修改下面兩個密碼後儲存
 * 3. 部署 → 新增部署作業 → 類型選「網頁應用程式」
 *    執行身分：我；誰可以存取：任何人
 * 4. 複製部署網址（…/exec），貼到教師檢視器
 */

// 學生送出時要附上的「班級密語」（留空 '' 代表不檢查）
const CLASS_KEY = 'eco601';

// 老師讀取全班資料用的密碼，請改成只有你知道的字串
const TEACHER_KEY = 'change-this-teacher-password';

const SHEET_STUDENTS = '學生總表';
const SHEET_PROMPTS = '提示詞明細';
const SHEET_PLANS = '後製構想';
const CHUNK = 45000; // 單一儲存格上限約 5 萬字，JSON 分段存放

const TASK_NAMES = { research: '議題探究', poster: '環保海報', lyrics: '歌詞與曲風', suno: 'Suno 音樂', webapp: '網頁小程式', other: '其他' };
const WORK_NAMES = { poster: '環保海報', mv: '音樂 MV', webapp: '網頁小程式' };
const STRATEGY_NAMES = { clear: '說清楚', one: '一次改一件事', limit: '加限制', askme: '請AI先問我', options: '請AI給選項', report: '回報問題' };

const HEADERS = {};
HEADERS[SHEET_STUDENTS] = ['學生代號', '班級', '座號', '姓名', '議題', '最後送出', '紀錄筆數', '使用技巧次數', '資料(JSON)'];
HEADERS[SHEET_PROMPTS] = ['學生代號', '班級', '座號', '姓名', '任務', '平台', '版本', '提示詞', 'AI回應摘要', '星等', '好的地方', '下一版要改', '使用技巧', '建立時間'];
HEADERS[SHEET_PLANS] = ['學生代號', '班級', '座號', '姓名', '作品', 'AI素材', '我加入的元素', '主標語', 'AI貢獻%', '我的貢獻', '作品連結', '後製反思', '更新時間'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse(e.postData.contents);
    if (body.action !== 'submit') return json_({ ok: false, error: '未知的動作' });
    if (CLASS_KEY && body.key !== CLASS_KEY) return json_({ ok: false, error: '班級密語不正確，請向老師確認學生專用連結' });

    const s = body.student || {};
    const cls = String(s.cls || '').trim();
    const seat = String(s.seat || '').trim();
    const name = String(s.name || '').trim();
    if (!cls || !seat || !name) return json_({ ok: false, error: '缺少班級、座號或姓名' });

    const id = cls + '-' + ('0' + seat).slice(-2);
    const data = body.data || {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const plans = data.plans || {};
    const submittedAt = body.submittedAt || new Date().toISOString();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 學生總表（每位學生一列，保留完整 JSON 供教師檢視器讀取）
    const stratCount = entries.reduce(function (n, x) { return n + ((x.strategies || []).length); }, 0);
    const record = JSON.stringify({ student: s, data: data, submittedAt: submittedAt });
    const chunks = [];
    for (let i = 0; i < record.length; i += CHUNK) chunks.push(record.slice(i, i + CHUNK));
    const row = [id, cls, seat, name, s.topic || '', new Date(submittedAt), entries.length, stratCount].concat(chunks);
    upsertRow_(ss, SHEET_STUDENTS, id, row);

    // 2. 提示詞明細（先刪除這位學生的舊資料，再寫入最新的）
    const promptRows = entries.slice().sort(function (a, b) {
      return String(a.task).localeCompare(String(b.task)) || (Number(a.version) || 0) - (Number(b.version) || 0);
    }).map(function (x) {
      return [id, cls, seat, name, TASK_NAMES[x.task] || x.task, x.platform || '', Number(x.version) || '',
        x.prompt || '', x.response || '', Number(x.rating) || '', x.good || '', x.improve || '',
        (x.strategies || []).map(function (k) { return STRATEGY_NAMES[k] || k; }).join('、'),
        x.createdAt ? new Date(x.createdAt) : ''];
    });
    replaceRows_(ss, SHEET_PROMPTS, id, promptRows);

    // 3. 後製構想
    const planRows = Object.keys(WORK_NAMES).filter(function (w) { return plans[w]; }).map(function (w) {
      const p = plans[w];
      return [id, cls, seat, name, WORK_NAMES[w], p.aiAssets || '',
        (p.myElements || []).concat(p.otherElements ? [p.otherElements] : []).join('、'),
        p.mainText || '', p.aiPercent != null ? p.aiPercent : '', p.myPart || '', p.link || '', p.reflect || '',
        p.updatedAt ? new Date(p.updatedAt) : ''];
    });
    replaceRows_(ss, SHEET_PLANS, id, planRows);

    return json_({ ok: true, id: id, count: entries.length, at: submittedAt });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* 沒有取得鎖時忽略 */ }
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'list') {
    if (p.key !== TEACHER_KEY) return json_({ ok: false, error: '教師密碼不正確' });
    const sh = sheet_(SpreadsheetApp.getActiveSpreadsheet(), SHEET_STUDENTS);
    const values = sh.getDataRange().getValues().slice(1);
    const jsonCol = HEADERS[SHEET_STUDENTS].length - 1;
    const students = [];
    values.forEach(function (r) {
      const raw = r.slice(jsonCol).join('');
      if (!raw) return;
      try { students.push(JSON.parse(raw)); } catch (err) { /* 略過損壞的資料 */ }
    });
    return json_({ ok: true, students: students, at: new Date().toISOString() });
  }
  return json_({ ok: true, service: 'AI 環保小創客收件服務', message: '運作中' });
}

// ---------- 工具函式 ----------
function sheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold').setBackground('#e3f5ec');
    sh.setFrozenRows(1);
  }
  return sh;
}

function upsertRow_(ss, name, id, row) {
  const sh = sheet_(ss, name);
  const last = sh.getLastRow();
  let target = last + 1;
  if (last > 1) {
    const ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === id) { target = i + 2; break; }
    }
  }
  // 先清除整列，避免舊的 JSON 分段殘留
  const width = Math.max(sh.getLastColumn(), row.length);
  sh.getRange(target, 1, 1, width).clearContent();
  sh.getRange(target, 1, 1, row.length).setValues([row]);
}

function replaceRows_(ss, name, id, rows) {
  const sh = sheet_(ss, name);
  const width = HEADERS[name].length;
  const last = sh.getLastRow();
  let keep = [];
  if (last > 1) {
    keep = sh.getRange(2, 1, last - 1, width).getValues().filter(function (r) { return String(r[0]) !== id; });
    sh.getRange(2, 1, last - 1, width).clearContent();
  }
  const all = keep.concat(rows);
  if (all.length) sh.getRange(2, 1, all.length, width).setValues(all);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
