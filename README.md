# 老師個人網站 — GitHub Pages 自動同步範本

把網頁檔案放進 `Htmls/` 資料夾，點兩下「Sync.bat」就會自動更新首頁卡片並發布到網路上，網址固定不變。

## 第一次使用（只需做一次）

### 1. 申請 GitHub 帳號
前往 https://github.com 註冊一個帳號（建議用容易記的帳號名稱，會出現在網址上）。

### 2. 安裝 Git
下載安裝：https://git-scm.com/download/win（一路按下一步即可）。

### 3. 在 GitHub 建立一個新的 Repository
1. 登入 GitHub，右上角 `+` → `New repository`
2. Repository name 填 `WebSite`（或任何你喜歡的名稱）
3. 選擇 **Public**
4. **不要**勾選 "Add a README file"
5. 按 `Create repository`

### 4. 執行「Setup.bat」
雙擊本資料夾裡的 `Setup.bat`，依照提示輸入：
- 你的姓名
- 你的 Email
- 你的 GitHub 帳號名稱
- Repository 名稱（剛剛建立的，預設 WebSite）

它會自動完成 git 初始化與連結設定。

### 5. 開啟 GitHub Pages
回到 GitHub repo 頁面 → `Settings` → 左側選單 `Pages` → Source 選擇 **GitHub Actions**。

### 6. 第一次推送
雙擊「Sync.bat」。
第一次推送時，瀏覽器可能會跳出來要求登入授權；或是命令列要求輸入帳號密碼：
- 帳號：填你的 GitHub 帳號名稱
- 密碼：**不能填 GitHub 登入密碼**，要填 **Personal Access Token**
  - 產生方式：GitHub 右上角頭像 → `Settings` → 左側最下面 `Developer settings` → `Personal access tokens` → `Tokens (classic)` → `Generate new token` → 勾選 `repo` 權限 → 產生後複製貼上（這組碼只會顯示一次，要先存起來）

### 7. 完成
等 1-2 分鐘，打開 `https://你的帳號.github.io/repo名稱/` 就能看到網站了。
也可以雙擊「MyWebsite.url」捷徑直接開啟。

---

## 日常使用方式

1. 把新的網頁檔案（`.html`）丟進 `Htmls/` 資料夾
2. 雙擊「Sync.bat」
3. 等網站自動重新部署（約 1 分鐘）即可

不需要手動寫程式碼，`generate_index.ps1` 會自動掃描 `Htmls/` 資料夾並產生美觀的首頁卡片清單。
