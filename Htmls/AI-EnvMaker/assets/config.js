/*
 * AI 環保小創客｜雲端收件設定（由老師填寫一次即可）｜版本 2026.10.22-3（2026-10-22 更新）
 * 更新網站時，這個檔案通常不必覆蓋（裡面是您自己的設定），版本號不同也沒關係。
 *
 * gasUrl   ：Google Apps Script「網頁應用程式」部署後的網址（https://script.google.com/macros/s/…/exec）
 * classKey ：班級密語，要和 Code.gs 裡的 CLASS_KEY 一樣；留空代表不檢查
 * classes  ：學生「我的資料」班級下拉選單的選項，可自行增減
 * uploadUrl：導覽列「📤 備份歷程給老師」連到的網址；留空 '' 就不顯示這個連結
 *            （沒有這一行時，使用 app.js 裡的預設網址）
 *
 * 不想改這個檔案的話，也可以在「教師檢視器 → 雲端收件設定」產生「學生專用連結」，
 * 學生用那個連結打開一次，設定就會記在他的瀏覽器裡。
 */
window.ECO_CONFIG = {
  gasUrl: 'https://script.google.com/macros/s/AKfycbzkutc67R0km8bMcsl3Sx4Z1ByxIsHzWIBgmc7mV_iCrPLUWCf0Bb6tyw9t62hwvxABvA/exec',
  classKey: 'Csps1234',
  classes: ['601', '602', '603', '604', '605', '606', '607', '608', '609', '610'],
  uploadUrl: 'http://172.16.9.30:8100/'
};
