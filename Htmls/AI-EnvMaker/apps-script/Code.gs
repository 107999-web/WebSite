/**
 * AI 環保小創客｜雲端收件服務（Google Apps Script）｜版本 2026.10.22-3（2026-10-22 更新）
 *
 * 安裝方式（詳細步驟請看「教師檢視器 → 雲端收件設定」）：
 * 1. 建立一個新的 Google 試算表 → 擴充功能 → Apps Script
 *    （或到 script.google.com 建立「獨立專案」，並在下面的 SPREADSHEET_ID 填入試算表 ID）
 * 2. 把這整份程式碼貼上，修改下面兩個密碼後儲存
 * 3. 部署 → 新增部署作業 → 類型選「網頁應用程式」
 *    執行身分：我；誰可以存取：任何人
 * 4. 複製部署網址（…/exec），貼到教師檢視器
 *
 * 更新程式碼後：部署 → 管理部署作業 → 編輯（鉛筆）→ 版本選「新版本」→ 部署，網址不會改變。
 *
 * 防止冒名覆蓋：
 * - 學生第一次送出時，會把他電腦上的「個人代碼」記在「身分綁定」工作表。
 *   之後同一個班級座號只接受同一組代碼；代碼不同，或姓名和原本的不一樣，就不覆蓋，改放到「待確認」。
 * - 老師在教師檢視器的「待確認」區決定要不要採用。學生真的換了新電腦又沒有備份檔時，
 *   也可以直接刪掉「身分綁定」裡他的那一列，讓他重新綁定。
 * - 每一次送出（不論是否採用）都會另存一份在「送出紀錄」，被改壞時可以從這裡找回舊版本。
 *   每位學生只保留最近 KEEP_HISTORY 次，避免試算表越來越大。
 *
 * 效能：寫入時只動到這位學生自己的列（用「尋找」定位），不會重寫整張工作表；
 * 教師檢視器可以只載入一個班級（action=list&cls=601）。
 */

// 版本號：教師檢視器「測試連線」會顯示，用來確認部署的是不是最新版
const SCRIPT_VERSION = '2026.10.22-3';

// 試算表 ID：用「獨立專案」（script.google.com 新增的專案）時必填；
// 附在試算表上的專案（擴充功能 → Apps Script）留空 '' 即可。
// ID 是試算表網址 https://docs.google.com/spreadsheets/d/【這一段】/edit 中間那一長串。
const SPREADSHEET_ID = '1y6_duFBVRbTwl2F6WGx5tKqx0R_MRzsTgn7ELv-37wI';

// 學生送出時要附上的「班級密語」（留空 '' 代表不檢查）
const CLASS_KEY = 'Csps1234';

// 老師讀取全班資料用的密碼，請改成只有你知道的字串
const TEACHER_KEY = 'Csps343601';

const SHEET_STUDENTS = '學生總表';
const SHEET_PROMPTS = '提示詞明細';
const SHEET_PLANS = '後製構想';
const SHEET_BIND = '身分綁定';
const SHEET_HOLD = '待確認';
const SHEET_LOG = '送出紀錄';
const CHUNK = 45000; // 單一儲存格上限約 5 萬字，JSON 分段存放
const KEEP_HISTORY = 5; // 「送出紀錄」每位學生保留最近幾次（太多會讓試算表變慢）

const TASK_NAMES = { research: '議題探究', poster: '環保海報', lyrics: '歌詞與曲風', suno: 'Suno 音樂', webapp: '網頁小程式', other: '其他' };
const WORK_NAMES = { poster: '環保海報', mv: '音樂 MV', webapp: '網頁小程式' };
const STRATEGY_NAMES = { clear: '說清楚', one: '一次改一件事', limit: '加限制', askme: '請AI先問我', options: '請AI給選項', report: '回報問題' };

const HEADERS = {};
HEADERS[SHEET_STUDENTS] = ['學生代號', '班級', '座號', '姓名', '議題', '最後送出', '紀錄筆數', '使用技巧次數', '資料(JSON)'];
HEADERS[SHEET_PROMPTS] = ['學生代號', '班級', '座號', '姓名', '任務', '平台', '版本', '提示詞', 'AI回應摘要', '星等', '好的地方', '下一版要改', '使用技巧', '建立時間'];
HEADERS[SHEET_PLANS] = ['學生代號', '班級', '座號', '姓名', '作品', 'AI素材', '我加入的元素', '主標語', 'AI貢獻%', '我的貢獻', '作品連結', '後製反思', '更新時間'];
HEADERS[SHEET_BIND] = ['學生代號', '姓名', '個人代碼', '綁定時間'];
HEADERS[SHEET_HOLD] = ['編號', '送出時間', '學生代號', '班級', '座號', '送來的姓名', '原本的姓名', '原因', '資料(JSON)'];
HEADERS[SHEET_LOG] = ['送出時間', '學生代號', '班級', '座號', '姓名', '紀錄筆數', '結果', '資料(JSON)'];

const HELD_MSG = '這個班級和座號已經有同學的資料了，為了保護大家的資料，這次送出先交給老師確認。' +
  '請檢查班級、座號有沒有選錯；如果沒有選錯（例如換了電腦又沒有匯入備份檔），請告訴老師。';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action !== 'submit' && body.action !== 'resolve') return json_({ ok: false, error: '未知的動作' });
    if (body.action === 'submit' && CLASS_KEY && body.key !== CLASS_KEY) return json_({ ok: false, error: '班級密語不正確，請向老師確認學生專用連結' });
    // 同一時間只處理一筆；排隊超過 30 秒就請學生稍後再送，不讓畫面一直卡住
    if (!lock.tryLock(30000)) return json_({ ok: false, busy: true, error: '現在很多同學同時送出，請等 10 秒再按一次「送出」。' });
    if (body.action === 'resolve') return json_(resolve_(body));

    const s = body.student || {};
    const cls = String(s.cls || '').trim();
    const seat = String(s.seat || '').trim().replace(/^\d$/, '0$&'); // 座號一律兩位數
    const name = String(s.name || '').trim();
    if (!cls || !seat || !name) return json_({ ok: false, error: '缺少班級、座號或姓名' });

    const id = cls + '-' + seat;
    const token = String(s.token || '').trim();
    const data = body.data || {};
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const submittedAt = body.submittedAt || new Date().toISOString();
    const ss = ss_();
    const record = JSON.stringify({ student: s, data: data, submittedAt: submittedAt });

    // 檢查是不是同一個人：已綁定就比對個人代碼，還沒綁定（舊資料）就比對姓名
    const bind = findRow_(ss, SHEET_BIND, id);
    const prev = findRow_(ss, SHEET_STUDENTS, id);
    const prevName = prev ? String(prev[3]) : (bind ? String(bind[1]) : '');
    let reason = '';
    if (bind && bind[2]) {
      if (token !== String(bind[2])) reason = token ? '個人代碼不同（可能是別台電腦或別人送出的）' : '沒有個人代碼（可能是舊版網頁）';
    } else if (prevName && !sameName_(prevName, name)) {
      reason = '姓名和原本的資料不同';
    }

    if (reason) {
      const holdId = 'H' + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
      appendRow_(ss, SHEET_HOLD, [holdId, new Date(submittedAt), id, cls, seat, name, prevName, reason].concat(chunks_(record)));
      addLog_(ss, id, [new Date(submittedAt), id, cls, seat, name, entries.length, '⚠️ 待確認：' + reason].concat(chunks_(record)));
      return json_({ ok: false, held: true, error: HELD_MSG });
    }

    saveStudent_(ss, id, cls, seat, name, s, data, submittedAt, record);
    if (token) upsertRow_(ss, SHEET_BIND, id, [id, name, token, bind ? bind[3] : new Date()]);
    addLog_(ss, id, [new Date(submittedAt), id, cls, seat, name, entries.length, '✅ 已採用'].concat(chunks_(record)));

    return json_({ ok: true, id: id, count: entries.length, at: submittedAt });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (e2) { /* 沒有取得鎖時忽略 */ }
  }
}

// 老師處理「待確認」：accept 為 true 就採用並改綁這筆的個人代碼，false 就不採用；兩者都會從待確認移除
function resolve_(body) {
  if (body.key !== TEACHER_KEY) return { ok: false, error: '教師密碼不正確' };
  const ss = ss_();
  const sh = sheet_(ss, SHEET_HOLD);
  const rowNo = rowsWithId_(sh, 1, String(body.holdId || ''))[0];
  if (!rowNo) return { ok: false, error: '找不到這筆待確認資料（可能已經處理過了）' };

  const r = sh.getRange(rowNo, 1, 1, sh.getLastColumn()).getValues()[0];
  const id = String(r[2]);
  if (body.accept) {
    const rec = JSON.parse(r.slice(HEADERS[SHEET_HOLD].length - 1).join(''));
    const s = rec.student || {};
    const cls = String(r[3]), seat = String(r[4]), name = String(r[5]);
    const token = String(s.token || '').trim();
    saveStudent_(ss, id, cls, seat, name, s, rec.data || {}, rec.submittedAt, JSON.stringify(rec));
    if (token) upsertRow_(ss, SHEET_BIND, id, [id, name, token, new Date()]);
    else deleteRows_(ss, SHEET_BIND, id);
    addLog_(ss, id, [new Date(), id, cls, seat, name, ((rec.data || {}).entries || []).length, '✅ 老師確認採用'].concat(chunks_(JSON.stringify(rec))));
  }
  sh.deleteRow(rowNo);
  return { ok: true, id: id };
}

// 寫入學生總表、提示詞明細、後製構想（覆蓋這位學生原本的資料）
function saveStudent_(ss, id, cls, seat, name, s, data, submittedAt, record) {
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const plans = data.plans || {};

  // 1. 學生總表（每位學生一列，保留完整 JSON 供教師檢視器讀取）
  const stratCount = entries.reduce(function (n, x) { return n + ((x.strategies || []).length); }, 0);
  const row = [id, cls, seat, name, s.topic || '', new Date(submittedAt), entries.length, stratCount].concat(chunks_(record));
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
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'ping') { // 測試連線用：只檢查密碼和人數，不讀資料
    if (p.key !== TEACHER_KEY) return json_({ ok: false, version: SCRIPT_VERSION, error: '教師密碼不正確' });
    const sh = sheet_(ss_(), SHEET_STUDENTS);
    return json_({ ok: true, version: SCRIPT_VERSION, count: Math.max(sh.getLastRow() - 1, 0) });
  }
  if (p.action === 'list') {
    if (p.key !== TEACHER_KEY) return json_({ ok: false, error: '教師密碼不正確' });
    const ss = ss_();
    const cls = String(p.cls || '').trim(); // 空白代表全部班級
    const students = readJsonRows_(sheet_(ss, SHEET_STUDENTS), function (r) { return !cls || String(r[1]) === cls; })
      .map(function (x) { return x.json; });
    const held = readJsonRows_(sheet_(ss, SHEET_HOLD), function (r) { return !cls || String(r[3]) === cls; })
      .map(function (x) { return { holdId: String(x.row[0]), id: String(x.row[2]), prevName: String(x.row[6]), reason: String(x.row[7]), record: x.json }; });
    return json_({ ok: true, version: SCRIPT_VERSION, cls: cls, students: students, held: held, at: new Date().toISOString() });
  }
  if (p.action === 'history') {
    if (p.key !== TEACHER_KEY) return json_({ ok: false, error: '教師密碼不正確' });
    const sh = sheet_(ss_(), SHEET_LOG);
    const rows = rowsWithId_(sh, 2, String(p.id || ''));
    const list = readJsonRows_(sh, null, rows).map(function (x) { return { result: String(x.row[6]), record: x.json }; });
    return json_({ ok: true, history: list });
  }
  return json_({ ok: true, service: 'AI 環保小創客收件服務', message: '運作中', version: SCRIPT_VERSION });
}

// ---------- 工具函式 ----------
function ss_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function chunks_(text) {
  const out = [];
  for (let i = 0; i < text.length; i += CHUNK) out.push(text.slice(i, i + CHUNK));
  return out;
}

function sameName_(a, b) {
  return String(a).replace(/\s/g, '') === String(b).replace(/\s/g, '');
}

function sheet_(ss, name) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]).setFontWeight('bold').setBackground('#e3f5ec');
    sh.setFrozenRows(1);
  }
  return sh;
}

// 某一欄完全等於 id 的列號（由小到大）。用「尋找」定位，不必把整張表讀出來
function rowsWithId_(sh, col, id) {
  const last = sh.getLastRow();
  if (last < 2 || !id) return [];
  return sh.getRange(2, col, last - 1, 1).createTextFinder(id).matchEntireCell(true).matchCase(true).findAll()
    .map(function (r) { return r.getRow(); }).sort(function (a, b) { return a - b; });
}

// 第一欄等於 id 的那一列，回傳整列的值；找不到回傳 null
function findRow_(ss, name, id) {
  const sh = sheet_(ss, name);
  const row = rowsWithId_(sh, 1, id)[0];
  return row ? sh.getRange(row, 1, 1, HEADERS[name].length).getValues()[0] : null;
}

// 刪除指定的列：由下往上，相鄰的列一次刪除
function deleteRowNos_(sh, rows) {
  rows = rows.slice().sort(function (a, b) { return b - a; });
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j + 1 < rows.length && rows[j + 1] === rows[j] - 1) j++;
    sh.deleteRows(rows[j], j - i + 1);
    i = j + 1;
  }
}

function deleteRows_(ss, name, id) {
  const sh = sheet_(ss, name);
  deleteRowNos_(sh, rowsWithId_(sh, 1, id));
}

function appendRow_(ss, name, row) {
  sheet_(ss, name).appendRow(row);
}

// 寫入送出紀錄，並只保留這位學生最近 KEEP_HISTORY 筆
function addLog_(ss, id, row) {
  const sh = sheet_(ss, SHEET_LOG);
  sh.appendRow(row);
  const rows = rowsWithId_(sh, 2, id);
  if (rows.length > KEEP_HISTORY) deleteRowNos_(sh, rows.slice(0, rows.length - KEEP_HISTORY));
}

// 讀出存有 JSON 的列：先讀前面的窄欄位篩選，再只讀需要的列的 JSON（連續的列一次讀）
// filter(row) 決定要不要這一列；rowNos 可直接指定列號
function readJsonRows_(sh, filter, rowNos) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const name = sh.getName();
  const jsonCol = HEADERS[name].length; // JSON 從這一欄（1 起算）開始
  const width = Math.max(sh.getLastColumn(), jsonCol);
  let rows = rowNos;
  if (!rows) {
    rows = [];
    sh.getRange(2, 1, last - 1, jsonCol - 1).getValues().forEach(function (r, i) {
      if (!filter || filter(r)) rows.push(i + 2);
    });
  }
  const out = [];
  let i = 0;
  while (i < rows.length) {
    let j = i;
    while (j + 1 < rows.length && rows[j + 1] === rows[j] + 1) j++;
    const block = sh.getRange(rows[i], 1, j - i + 1, width).getValues();
    block.forEach(function (r) {
      const raw = r.slice(jsonCol - 1).join('');
      if (!raw) return;
      try { out.push({ row: r, json: JSON.parse(raw) }); } catch (err) { /* 略過損壞的資料 */ }
    });
    i = j + 1;
  }
  return out;
}

// 新增或取代第一欄等於 id 的那一列
function upsertRow_(ss, name, id, row) {
  const sh = sheet_(ss, name);
  const target = rowsWithId_(sh, 1, id)[0] || sh.getLastRow() + 1;
  ensureRows_(sh, target);
  // 先清除整列，避免舊的 JSON 分段殘留
  const width = Math.max(sh.getLastColumn(), row.length);
  sh.getRange(target, 1, 1, width).clearContent();
  sh.getRange(target, 1, 1, row.length).setValues([row]);
}

// 只刪掉這位學生原本的列，再把新的列加在最後面（不重寫整張表）
function replaceRows_(ss, name, id, rows) {
  const sh = sheet_(ss, name);
  deleteRowNos_(sh, rowsWithId_(sh, 1, id));
  if (!rows.length) return;
  const start = sh.getLastRow() + 1;
  ensureRows_(sh, start + rows.length - 1);
  sh.getRange(start, 1, rows.length, HEADERS[name].length).setValues(rows);
}

function ensureRows_(sh, upTo) {
  const max = sh.getMaxRows();
  if (upTo > max) sh.insertRowsAfter(max, upTo - max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
