# -*- coding: utf-8 -*-
"""產生教學網頁：student/index.html（總覽＋第 0 章）與 student/c1.html～c8.html（8 類函式）。

    python make_pages.py

函式卡的名稱、輸入、輸出、說明都來自 build_library.py 的 FUNCS（和 .sb3 裡的註解是同一份文字），
積木圖來自 export_blocks.py 從 .sb3 轉出的 blocks_data.js，所以網頁不會和檔案對不上。
要改教學文字：改這個檔案的 CONTENT；要改函式說明：改 build_library.py 的 fn(...)。
"""
import os, sys, html, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STU = os.path.join(ROOT, 'student')
sys.path.insert(0, HERE)
import build_library as BL  # noqa

E = html.escape
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&family=Noto+Sans+TC:wght@400;500;700;900&family=Nunito:wght@600;700;800&display=swap">')
SP3 = {1: '小幫手_1_文字與對話.sprite3', 2: '小幫手_2_出場與退場.sprite3', 3: '小幫手_3_持續特效.sprite3',
       4: '小幫手_4_角色管理.sprite3', 5: '小幫手_5_計時與流程.sprite3', 8: '小幫手_8_遊戲機制.sprite3'}

# ======================================================================= 教學文字
CONTENT = {
1: dict(
    lead='讓角色「說話」的各種方法：一個字一個字打出來、做成旁白字幕、兩個角色輪流對話，還有處理文字的兩個小工具。',
    intro='''<div class="topic"><h3>🗨️ 為什麼要把「說話」做成函式？</h3>
<p>做故事動畫時，同一個效果會用很多很多次。如果每次都拖一整串「重複、字串組合、說出、等待」，程式會又長又難改。
包成 <b>打字機說 (文字) 每字 (秒數) 秒</b> 之後，每一句台詞都只要<b>一塊積木</b>，想改速度也只要改一個數字。</p></div>
<div class="why"><b class="t">這一類用到的 Scratch 技巧</b>　「字串的第 n 字」一次拿一個字；「字串組合」把字接起來；
「廣播並等待」會等所有收到訊息的程式都跑完才往下 —— 這就是輪流對話不會搶話的原因。</div>''',
    tasks=['打開 <b>1_文字與對話.sb3</b>，按 <kbd>1</kbd>～<kbd>5</kbd> 各試一次，對照右邊「按鍵說明」。',
           '把 <kbd>1</kbd> 的「每字秒數」改成 0.2 和 0.02，感覺差在哪裡？什麼樣的角色適合慢慢講？',
           '在清單「對話角色」「對話內容」各加一行，讓方方多說一句話。程式要改嗎？',
           '挑戰：新增第三個角色「點點」，讓它也能加入對話。（提示：它需要哪一段程式？它的「我的名字」要設成什麼？）',
           '挑戰：做一個計時器，用「補零」把 5 顯示成 05。'],
    quiz=[('「播放對話」讀完一行後，用哪一塊積木等說話的角色打完字？', ['等待 1 秒', '廣播訊息 (說台詞) 並等待', '重複直到 (字幕) = (目前台詞)'], 1,
           '「廣播並等待」會等到所有收到「說台詞」的程式都跑完。說話的角色要打完字才結束，所以剛好等到它說完。'),
          ('「補零 (7) 補到 (3) 位」的結果是 007。在 Scratch 裡 <code>(結果) = 7</code> 會怎樣？', ['不成立，因為 007 和 7 不一樣', '成立，因為兩邊都長得像數字，Scratch 當數字比', '會出錯'], 1,
           '這是 Scratch 的「＝」的特性：兩邊都像數字就比數值。要比「字」就要一個字一個字比。')],
    checks=['我會用「打字機說」讓角色一個字一個字說話', '我知道「播放對話」怎麼決定輪到誰說', '我會用「取出片段」拿出一段文字', '我知道補零的結果是「文字」']),
2: dict(
    lead='角色怎麼「進場」、怎麼「離場」：淡入淡出、啵一聲跳出來、縮小消失、從天上掉下來、從邊邊滑進來。',
    intro='''<div class="topic"><h3>🎬 出場和退場，讓作品像一部動畫</h3>
<p>直接「顯示」「隱藏」的角色，看起來是「突然出現」。加上 0.5～1 秒的出場動畫，觀眾的眼睛就會被帶到那個角色身上。這一類的 6 個函式都是 <b>A 型</b>：放在要動的角色裡，動的是角色自己。</p></div>
<div class="why"><b class="t">用「計時器」控制時間，不要數「等待」</b>　淡入寫成「重複 10 次：幻影 −10、等待 0.1 秒」看起來也行，
但每一次「等待」都會多等一點點，電腦忙的時候會越來越慢。這裡的寫法是：記住開始時間，每一格都用「計時器 − 開始時間」算出<b>現在應該到哪裡</b>，幾秒就是幾秒。</div>
<div class="warn"><b class="t">動畫結束一定要「還原」</b>　淡出最後要把幻影設回 0、縮小消失最後要把尺寸設回原本的大小。否則下一次「顯示」時，角色還是透明的或小小的。</div>''',
    tasks=['打開 <b>2_出場與退場.sb3</b>，按 <kbd>1</kbd>～<kbd>7</kbd>，按 <kbd>R</kbd> 可以重設。',
           '在試玩台把淡入改成 3 秒、0.2 秒，找出你覺得最舒服的秒數。',
           '把「彈出放大」的 1.2 改成 1.5（在定義裡改兩個地方），衝過頭的感覺有什麼不同？',
           '做一個片頭：標題「從上面滑入」，接著主角「彈跳落下」，最後按鈕「彈出放大」。',
           '挑戰：寫一個新函式「淡入並放大 (秒數)」，同時改幻影和尺寸。'],
    quiz=[('「淡出」最後為什麼要把幻影設回 0？', ['讓淡出看起來比較快', '角色已經隱藏了，設回 0 下次顯示才不會是透明的', '沒有原因，可以刪掉'], 1, '「隱藏」和「幻影」是兩件事。只隱藏不還原，下次「顯示」時會看不到角色，以為程式壞了。'),
          ('「從左邊滑入」為什麼要先把角色擺好位置再呼叫？', ['因為它會記住「現在的位置」當作終點', '因為滑行一定從 x = 0 開始', '其實不用'], 0, '函式第一件事就是「記住x、記住y」，最後滑回那裡。')],
    checks=['我知道 A 型函式要放在哪個角色裡', '我能說出為什麼用計時器而不是累加等待', '我知道動畫結束要還原幻影和尺寸']),
3: dict(
    lead='讓角色「活起來」的小動作：抖一抖、閃一閃、呼吸、搖擺、漂浮，還有播放造型動畫。',
    intro='''<div class="topic"><h3>✨ 一個公式做出三種動作</h3>
<p>呼吸、擺動、漂浮其實是同一招：<b>原本的值 ＋ 幅度 × sin(經過秒數 × 360)</b>。
sin 的值會在 −1 和 1 之間來回，所以尺寸（或方向、y）會在原本的值附近一大一小、一左一右、一上一下，最後剛好回到原點。</p></div>
<div class="why"><b class="t">函式裡可以呼叫函式</b>　「播放造型」第一步是呼叫另一個函式「換到第 n 個造型」。
小函式組成大函式，就像用積木蓋房子。</div>
<div class="warn"><b class="t">為什麼不直接「造型換成 (1)」？</b>　「造型換成」收到數字會當成「第幾個」、收到文字會當成「造型名稱」。
變數裡的值有時是數字、有時是文字，很容易搞混（手勢辨識專案就中過這個坑）。「換到第 n 個造型」用「下一個造型」一直換到編號對了為止，一定是「第幾個」。</div>''',
    tasks=['打開 <b>3_持續特效.sb3</b>，按 <kbd>1</kbd>～<kbd>6</kbd>。',
           '在試玩台把「擺動」的角度改成 90，再把秒數改成 0.5，看起來像什麼？',
           '把「呼吸」的 360 改成 720（定義裡），呼吸變快還是變慢？為什麼？',
           '答錯的時候讓角色「抖動 6 次 強度 10」，答對的時候「閃爍」。',
           '挑戰：寫「心跳 (次數)」：尺寸 100 → 120 → 100，每次 0.15 秒。'],
    quiz=[('「漂浮 2 秒 高度 20」結束時，角色的 y 在哪裡？', ['比原本高 20', '回到原本的 y', '隨機'], 1, '函式開頭先記住原本的 y，最後設回去。'),
          ('呼吸的公式裡，哪個數字決定「一秒呼吸幾次」？', ['幅度', 'sin 裡面乘的 360', '秒數'], 1, '360 度是一圈。乘 360 ＝ 一秒一圈；乘 720 ＝ 一秒兩圈。')],
    checks=['我會用 sin 讓數值來回變化', '我知道函式裡可以呼叫別的函式', '我知道「造型換成（數字）」的陷阱']),
4: dict(
    lead='管理舞台上的角色與分身：一鍵重設、一次清掉所有分身、清空舞台、有編號的分身群，以及位置控制。',
    intro='''<div class="topic"><h3>🧹 「清空」要大家一起做</h3>
<p>Scratch 沒有「刪除所有分身」或「隱藏所有角色」的積木。解法是<b>廣播</b>：舞台的「清除所有分身」只做一件事 —— 廣播「清除分身」；
每個會產生分身的角色，都放一段<b>「當收到訊息 清除分身 → 分身刪除」</b>。本體收到也沒關係，「分身刪除」對本體沒有作用。</p></div>
<div class="why"><b class="t">分身的「編號」怎麼來的？</b>　「編號」是「僅適用當前角色」的變數。建立分身的那一瞬間，分身會<b>複製一份</b>本體當時的變數。
所以本體先把編號設成 1 再建立分身，那個分身的編號就是 1；再設成 2、建立……最後把本體的編號設回 0，就分得出誰是本體。</div>''',
    tasks=['打開 <b>4_角色管理.sb3</b>，按 <kbd>1</kbd> 建立分身、<kbd>2</kbd> 清掉、<kbd>4</kbd> 清空舞台、<kbd>5</kbd> 叫回圓圓。',
           '按 <kbd>M</kbd> 讓圓圓跟著滑鼠，把「比例」改成 0.05 和 0.5，差在哪裡？',
           '讓每個星星分身用自己的編號決定大小：尺寸設為（編號 × 20）。',
           '做一個「換關卡」：按空白鍵 → 清空舞台 → 新的角色「彈出放大」出場。',
           '挑戰：用「平滑跟隨」做一隻跟在圓圓後面的小寵物（目標 x、y 用圓圓的位置）。'],
    quiz=[('建立 5 個分身後，本體的「編號」是多少？', ['5', '0', '1'], 1, '函式最後把本體的編號設回 0。本體的編號永遠是 0，才分得出誰是本體。'),
          ('「清除所有分身」為什麼需要每個角色都有「當收到訊息 清除分身」？', ['因為一個角色不能刪別人的分身，只能自己刪自己', '因為舞台不能廣播', '其實不需要'], 0, '「分身刪除」只能刪「自己」。所以要廣播，讓每個分身自己刪掉自己。')],
    checks=['我能說明分身的編號是怎麼來的', '我會用廣播讓所有分身一起刪除', '我知道「平滑跟隨」的比例在控制什麼']),
5: dict(
    lead='和「時間」有關的函式：可以跳過的等待、倒數、碼錶、技能冷卻、把秒數變成 mm:ss，以及用一個變數切換畫面。',
    intro='''<div class="topic"><h3>⏱️ 所有計時都靠「計時器」</h3>
<p>倒數、碼錶、冷卻其實都只記一件事：<b>「什麼時候開始」或「什麼時候結束」</b>。要知道現在過了多久，就拿「計時器」減掉它。
不用一直「等待 1 秒、減 1」，也就不會越跑越不準。</p></div>
<div class="warn"><b class="t">按綠旗時，計時器會歸零</b>　冷卻用的「上次使用」如果還記著上一局的時間（例如 35），按綠旗後計時器從 0 開始，
「計時器 − 上次使用」會是負的，要等 35 秒以上才能用！所以綠旗一定要把「上次使用」設成 −999。</div>
<div class="why"><b class="t">「切換畫面」：一個變數管理所有畫面</b>　（來自〈貓咪甜點店〉）每個角色只問「畫面 ＝ 我的畫面嗎？」。要加新畫面，舊的角色完全不用改。</div>''',
    tasks=['打開 <b>5_計時與流程.sb3</b>，按 <kbd>1</kbd> 倒數、<kbd>2</kbd><kbd>3</kbd> 碼錶、<kbd>4</kbd> 等待再按空白鍵跳過。',
           '連按 <kbd>5</kbd>：冷卻中說「冷卻中……」。把冷卻改成 3 秒試試。',
           '把倒數改成 60 秒，用「秒數轉時間」把「剩餘秒數」顯示成 01:00。',
           '做一個「反應力測驗」：隨機等 2～5 秒後說「按！」，碼錶量你多快按下空白鍵。',
           '挑戰：新增第三個畫面「結局」，按 <kbd>9</kbd> 切換，需要改哪些舊角色？'],
    quiz=[('「等待 5 秒（可跳過）」被跳過之後，為什麼要把「跳過」設回 0？', ['讓下一段等待不會一開始就被跳過', '讓計時器歸零', '沒有原因'], 0, '「跳過」一直是 1 的話，之後所有的等待都會立刻結束。按一次只跳過一段。'),
          ('倒數剩 2.3 秒時，「剩餘秒數」顯示多少？', ['2', '3', '2.3'], 1, '用「無條件進位」：還沒到 0 之前都不會顯示 0，剩 0.1 秒也會顯示 1。')],
    checks=['我會用計時器做倒數與碼錶', '我知道綠旗會讓計時器歸零', '我會用一個變數切換畫面']),
6: dict(
    lead='常用的數學小工具：限制範圍、兩點距離、在不在範圍內、四捨五入到小數第幾位、不重複的隨機數。',
    intro='''<div class="topic"><h3>🧮 B 型函式：舞台服務台</h3>
<p>這一類的函式都放在<b>舞台</b>上，只負責計算，不會動任何角色。任何角色要用，就照三個步驟：</p>
<ol><li>把輸入寫進「參數1」「參數2」……</li><li><b>廣播</b>（函式的名字）<b>並等待</b></li><li>讀「結果」</li></ol>
<p>舞台上有一段「當收到訊息 限制範圍 → 限制範圍 (參數1) 最小 (參數2) 最大 (參數3)」，這就是「服務台」。</p></div>
<div class="warn"><b class="t">兩個角色同時用服務台會怎樣？</b>　參數和結果都只有一份。如果兩個角色在同一瞬間寫參數，可能會拿到別人的結果。
一般情況（按鍵、點角色）不會同時發生；如果要在「重複無限次」裡大量計算，就把那個函式複製一份到角色裡自己用。</div>''',
    tasks=['打開 <b>6_數學小工具.sb3</b>，按 <kbd>1</kbd>～<kbd>5</kbd>，看左上角的參數與結果怎麼變。',
           '按 <kbd>2</kbd> 前先移動滑鼠：距離和你想的一樣嗎？',
           '用「限制範圍」讓生命值不會小於 0、也不會大於 10。',
           '用「不重複隨機」做一個 1～10 的題目順序，10 題都不會重複。',
           '挑戰：寫一個新的 B 型函式「兩數平均 (a)(b)」，也接上服務台（需要加哪兩段程式？）。'],
    quiz=[('角色要用「四捨五入 (3.14159) 到小數 (2) 位」，正確的順序是？', ['廣播 → 寫參數 → 讀結果', '寫參數 → 廣播並等待 → 讀結果', '讀結果 → 寫參數 → 廣播'], 1,
           '一定要先把參數寫好再廣播（坑：先改變數，再廣播），而且要「並等待」，不然還沒算完就讀結果了。'),
          ('「在範圍內嗎 (100) 最小 (−100) 最大 (100)」的結果？', ['1', '0'], 0, '「不小於最小」而且「不大於最大」，所以邊界上的 100 也算在範圍內。')],
    checks=['我會用「寫參數 → 廣播並等待 → 讀結果」使用 B 型函式', '我知道為什麼廣播要「並等待」', '我會做不重複的隨機題目']),
7: dict(
    lead='處理清單的 7 個函式：洗牌、排序、最大值、加總、平均、把一行文字拆成清單、把清單合成一行文字。',
    intro='''<div class="topic"><h3>📋 清單不能當成輸入，怎麼辦？</h3>
<p>Scratch 的自訂積木只能傳<b>文字或數字</b>，不能傳清單。所以這一類的函式都約定好處理同一個清單：<b>「工作清單」</b>。
要處理別的清單，先把東西搬進工作清單，處理完再搬回去（或直接拿工作清單來用）。</p></div>
<div class="why"><b class="t">交換兩項要「暫存」</b>　洗牌和排序都要交換兩項。直接「A 換成 B、B 換成 A」會讓兩項都變成 B。
正確的做法是：先把 A 放進「暫存」，A 換成 B，再把 B 換成暫存。就像交換兩杯飲料需要第三個杯子。</div>''',
    tasks=['打開 <b>7_清單工具.sb3</b>，按 <kbd>0</kbd> 填數字，再按 <kbd>1</kbd>～<kbd>7</kbd>。',
           '在試玩台按「排序」，數一數 6 個數字比較了幾次？10 個數字呢？',
           '用「拆成清單」一次輸入 5 個同學的名字，再「洗牌」決定上台順序。',
           '算全班的平均分數：把分數放進工作清單，呼叫「清單平均」，再用「四捨五入到小數 1 位」。',
           '挑戰：把「清單排序」改成大到小（只要改一個符號）。'],
    quiz=[('交換第 1 項和第 2 項，哪一個順序是對的？', ['第 1 項換成第 2 項 → 第 2 項換成第 1 項', '暫存 ＝ 第 1 項 → 第 1 項換成第 2 項 → 第 2 項換成暫存', '刪除兩項再加回去'], 1, '第一種會讓兩項都變成原本的第 2 項。'),
          ('「清單平均」裡面用到哪一個函式？', ['清單加總', '清單排序', '清單最大值'], 0, '平均 ＝ 總和 ÷ 項目數。先呼叫「清單加總」，再除以長度。')],
    checks=['我知道為什麼這些函式都處理「工作清單」', '我會用暫存變數交換兩項', '我會把一行文字拆成清單']),
8: dict(
    lead='做遊戲一定會用到的機制：順暢的左右移動、有重力的跳躍、受傷與無敵時間、無敵閃爍、最高分、無限捲動的背景。',
    intro='''<div class="topic"><h3>🎮 主迴圈只剩「呼叫函式」</h3>
<p>把每個機制包成函式以後，玩家的主迴圈變得像一張清單：<b>左右鍵移動 → 重力跳躍 → 限制在舞台內 → 無敵閃爍 → 碰到刺球就受傷</b>。
一眼就看得出每一格在做什麼；想調整跳躍手感，只要改「重力」「跳躍力」兩個數字。</p></div>
<div class="why"><b class="t">「一格一格」的物理</b>　重力跳躍每一格都做：上下速度 − 重力、y ＋ 上下速度。速度一直變小（變成負的），角色就會先往上、慢下來、再往下掉，畫出一條拋物線。</div>
<div class="warn"><b class="t">（踩過的坑）先設變數，再廣播</b>　「開始遊戲」如果寫成「收到廣播才把生命值設成 3」，玩家的程式可能比舞台先跑，讀到上一局的生命值 0，一開始就「遊戲結束」。所以範例是先把分數、生命值設好，<b>再</b>廣播「開始遊戲」。</div>''',
    tasks=['打開 <b>8_遊戲機制.sb3</b>（或網頁版），用 ← → ↑ 玩，按 <kbd>H</kbd> 假裝被撞、<kbd>R</kbd> 重來。',
           '在試玩台把重力調成 0.4、跳躍力調成 10：像在月球嗎？',
           '把無敵秒數改成 0，碰到刺球會一次扣幾滴血？為什麼？',
           '加上「金幣」：用「無限捲動」和「碰到玩家」讓分數 +5。',
           '挑戰：讓玩家可以「二段跳」（提示：記錄跳了幾次，落地時歸零）。'],
    quiz=[('為什麼「受傷」要有無敵時間？', ['讓遊戲比較簡單', '碰到敵人的那幾格都會呼叫「受傷」，沒有無敵的話一碰就扣好幾滴血', 'Scratch 規定的'], 1, '角色和刺球重疊好幾格，每一格都「碰到」。無敵時間讓只有第一次會扣血。'),
          ('「重力跳躍」怎麼防止在空中一直跳？', ['跳躍力設小一點', '只有「y ＝ 地面」時按 ↑ 才起跳', '跳了之後等待 1 秒'], 1, '在空中 y 不等於地面，按 ↑ 也不會改變速度。')],
    checks=['我會用函式讓主迴圈變短', '我能說出重力跳躍每一格做的兩件事', '我知道受傷為什麼要無敵時間']),
}


# 目錄用的短名稱（proccode 第一個詞不夠清楚的）
SHORT = {'2-3': '彈出放大', '2-5': '彈跳落下', '2-6': '從邊滑入', '3-7': '換到第 n 個造型', '4-5': '移到隨機位置',
         '4-6': '限制在舞台內', '4-7': '平滑跟隨', '5-1': '等待（可跳過）', '8-1': '左右鍵移動', '8-2': '重力跳躍'}


# ======================================================================= 共用片段
def head(title):
    return ('<!doctype html>\n<html lang="zh-Hant">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n'
            '<title>%s</title>\n%s\n<link rel="stylesheet" href="assets/style.css">\n<link rel="stylesheet" href="assets/anim.css">\n'
            '<link rel="stylesheet" href="assets/lib.css">\n</head>\n<body>\n' % (E(title), FONTS))


def topbar():
    return ('<header class="top"><div class="in"><div class="brand"><a href="index.html">🧰 Scratch 函式庫</a> <em>51 個函式</em></div>'
            '<div class="unitnav"><a href="index.html#map">🗺️ 函式地圖</a><a href="index.html#dl">⬇ 下載</a>'
            '<a href="sb3/完整函式庫.sb3" download>⬇ 完整函式庫.sb3</a></div></div></header>\n')


def catnav(cur):
    return '<div class="catnav">' + ''.join(
        '<a href="c%d.html" style="--mc:%s" class="%s">%d %s</a>' % (n, BL.CATS[n][1], 'on' if n == cur else '', n, BL.CATS[n][0])
        for n in range(1, 9)) + '</div>'


def scripts():
    return ('<script src="assets/funcs_data.js"></script>\n<script src="assets/blocks_data.js"></script>\n'
            '<script src="assets/blk.js"></script>\n<script src="assets/ministage.js"></script>\n<script src="assets/lessons.js"></script>\n')


def proc_html(f):
    """proccode → 積木外觀（參數用參數名稱）"""
    out, k = [], 0
    for w in f['code'].split(' '):
        if w == '%s':
            out.append('<span class="rp myblocks">%s</span>' % E(f['args'][k])); k += 1
        else:
            out.append(E(w))
    return '<span class="sb myblocks">%s</span>' % ' '.join(out)


def br(s):
    return E(s).replace('\n', '<br>')


def script_title(key):
    tgt, sk = key.split('|')[1], key.split('|', 2)[2]
    if sk.startswith('def:'):
        return '%s・定義' % tgt
    if sk == 'flag':
        ev = '綠旗'
    elif sk.startswith('key:'):
        k = sk[4:]; ev = '按 %s 鍵' % {'space': '空白', 'up arrow': '↑'}.get(k, k.upper())
    elif sk.startswith('msg:'):
        ev = '收到「%s」' % sk[4:]
    elif sk == 'clone':
        ev = '分身產生時'
    else:
        ev = sk
    return '%s・%s' % (tgt, ev)


def func_article(f, uses):
    col = BL.CATS[f['cat']][1]
    kind = ('<span class="ftype A">A 型｜角色自己用</span>' if f['type'] == 'A' else '<span class="ftype B">B 型｜舞台服務台</span>')
    warp = '<span class="warp">%s執行時不重新整理畫面</span>' % ('✔ 勾選' if f['warp'] else '✘ 不勾')
    where = ('放在要動的角色裡（或匯入 .sprite3）。在同一個角色裡直接呼叫。' if f['type'] == 'A' else
             ('放在舞台。舞台直接呼叫；角色用「參數 → 廣播 <b>%s</b> 並等待 → 讀結果」。' % E(f['msg']) if f['msg']
              else '放在舞台，由舞台的程式呼叫。'))
    u = uses.get(f['id'], {})
    defk = u.get('def')
    exs = u.get('ex', [])
    h = ['<article class="func" id="f%s" style="--mc:%s">' % (f['id'], col),
         '<div class="fcard"><div class="fname"><span class="fid">%s</span>%s%s%s</div>' % (f['id'], proc_html(f), kind, warp),
         '<div class="io"><b>輸入</b><span>%s</span><b>輸出</b><span>%s</span><b>放在哪</b><span>%s</span><b>怎麼做</b><span>%s</span></div></div>'
         % (br(f['inp']), br(f['out']), where, br(f['desc']))]
    h.append('<div class="bgrid"><div class="bwrap"><h4>定義 <small>（%s）</small></h4><div data-sb="%s"></div></div>'
             % (E(script_title(defk)) if defk else '', E(defk or '')))
    if exs:
        h.append('<div class="bwrap"><h4>怎麼用 <small>（範例檔裡的程式）</small></h4>' +
                 ''.join('<p class="sm" style="margin:0 0 4px">%s</p><div data-sb="%s" style="margin-bottom:10px"></div>'
                         % (E(script_title(k)), E(k)) for k in exs) + '</div>')
    h.append('</div></article>')
    return '\n'.join(h)


def work_section(n, c):
    q = ''
    for i, (qq, ops, r, ex) in enumerate(c['quiz']):
        q += ('<div class="qz"><div class="qq">%s</div><div class="ops">%s</div><div class="ex">%s</div></div>'
              % (qq, ''.join('<button%s>%s</button>' % (' data-r' if j == r else '', o) for j, o in enumerate(ops)), ex))
    chk = ''.join('<label><input type="checkbox" id="k%d%s"> %s</label>' % (n, chr(97 + i), E(t)) for i, t in enumerate(c['checks']))
    return ('<section class="chap" id="work"><div class="ch"><span class="cn" style="background:%s;color:#fff">動手</span><h2>✏️ 動手改・小測驗・自我檢核</h2></div>'
            '<div class="work"><h3>✏️ 動手改</h3><ol>%s</ol></div>%s<div class="chklist" style="margin-top:14px">%s</div></section>'
            % (BL.CATS[n][1], ''.join('<li>%s</li>' % t for t in c['tasks']), q, chk))


def cat_page(n, uses):
    c = CONTENT[n]; name, col = BL.CATS[n]
    fs = [f for f in BL.FUNCS if f['cat'] == n]
    fname = BL.filename(n); stem = fname[:-4]
    na = sum(f['type'] == 'A' for f in fs); nb = len(fs) - na
    btns = ['<a class="btn" href="sb3/%s" download>⬇ %s</a>' % (E(fname), E(fname)),
            '<a class="btn ghost" href="play/%s/index.html" target="_blank" rel="noopener">🎮 網頁版試玩</a>' % E(stem)]
    if n in SP3:
        btns.append('<a class="btn ghost" href="sprite3/%s" download>⬇ %s</a>' % (E(SP3[n]), E(SP3[n])))
    toc = ['<a href="#intro">這一類在做什麼</a>', '<a href="#lab">🎛️ 試玩台</a>'] + \
          ['<a class="sub" href="#f%s">%s %s</a>' % (f['id'], f['id'], E(SHORT.get(f['id'], f['code'].split(' ')[0]))) for f in fs] + \
          ['<a href="#work">✏️ 動手改・檢核</a>', '<div class="prog">自我檢核 <span id="ptxt"></span></div><div class="pbar"><i id="pbar"></i></div>']
    out = [head('%d %s｜Scratch 函式庫' % (n, name)), topbar(),
           '<div class="wrap" style="--mc:%s">' % col,
           '<section class="hero"><span class="kind">第 %d 類｜%d 個函式（%s）</span><h1>%s</h1><p>%s</p>%s'
           '<div class="btnrow" style="margin-top:12px">%s</div></section>' % (n, len(fs), '、'.join(x for x in ('A 型 %d' % na if na else '', 'B 型 %d' % nb if nb else '') if x),
                                                                              E(name), E(c['lead']), catnav(n), ''.join(btns)),
           '<div class="layout"><nav class="toc" aria-label="目錄"><h3>目錄</h3>%s</nav><main>' % ''.join(toc),
           '<section class="chap" id="intro"><div class="ch"><span class="cn" style="background:%s;color:#fff">第 %d 類</span><h2>這一類在做什麼</h2></div>%s</section>' % (col, n, c['intro']),
           '<section class="chap" id="lab"><div class="ch"><span class="cn" style="background:%s;color:#fff">試玩台</span><h2>🎛️ 先玩玩看</h2></div>'
           '<p class="lead">這裡的效果都是照 .sb3 裡的積木一句一句翻成網頁程式，數字和順序完全一樣。按下按鈕時，下面會顯示「在 Scratch 裡等於呼叫哪一塊積木」。</p>'
           '<div class="lab"><div class="lh">🎛️ 試玩台 %d <span class="tag">動手按</span></div><div data-lab="%d"></div></div></section>' % (col, n, n),
           '<section class="chap" id="funcs"><div class="ch"><span class="cn" style="background:%s;color:#fff">函式</span><h2>🧩 %d 個函式</h2></div>'
           '<p class="lead">每張卡片的積木圖都是從 <b>%s</b> 自動轉出來的，和檔案裡一模一樣。</p>' % (col, len(fs), E(fname)),
           '\n'.join(func_article(f, uses) for f in fs), '</section>',
           work_section(n, c),
           '<p class="sm" style="margin-top:28px">%s</p>' % (
               ('← <a href="c%d.html">%d %s</a>　' % (n - 1, n - 1, BL.CATS[n - 1][0]) if n > 1 else '← <a href="index.html">總覽</a>　') +
               ('<a href="c%d.html">%d %s</a> →' % (n + 1, n + 1, BL.CATS[n + 1][0]) if n < 8 else '<a href="index.html#dl">下載區</a> →')),
           '</main></div></div>',
           '<footer class="sm" style="text-align:center;padding:20px">Scratch 函式庫 ・ 產生工具：tools/build_library.py ・ 積木圖由 .sb3 自動轉出</footer>',
           scripts(), '</body>\n</html>\n']
    return '\n'.join(out)


# ======================================================================= 總覽頁
def index_page():
    fa = sum(f['type'] == 'A' for f in BL.FUNCS); fb = len(BL.FUNCS) - fa
    cards = ''.join('<a class="catcard" href="c%d.html" style="--mc:%s"><b><i>%d</i>%s</b><span>%s</span></a>'
                    % (n, BL.CATS[n][1], n, E(BL.CATS[n][0]), E(CONTENT[n]['lead'])) for n in range(1, 9))
    rows = ''
    for n in range(1, 9):
        fn_ = BL.filename(n); stem = fn_[:-4]
        rows += ('<tr><td><b>%d %s</b></td><td><a href="sb3/%s" download>%s</a></td><td><a href="play/%s/index.html" target="_blank" rel="noopener">🎮 試玩</a></td><td>%s</td></tr>'
                 % (n, E(BL.CATS[n][0]), E(fn_), E(fn_), E(stem),
                    '<a href="sprite3/%s" download>%s</a>' % (E(SP3[n]), E(SP3[n])) if n in SP3 else '—（B 型都在舞台）'))
    rows += ('<tr><td><b>全部</b></td><td><a href="sb3/完整函式庫.sb3" download>完整函式庫.sb3</a></td><td><a href="play/完整函式庫/index.html" target="_blank" rel="noopener">🎮 試玩</a></td>'
             '<td><a href="sprite3/函式小幫手_全部.sprite3" download>函式小幫手_全部.sprite3</a></td></tr>')
    toc = ''.join('<a href="%s">%s</a>' % a for a in [('#intro', '0　函式是什麼'), ('#kinds', '　A 型與 B 型'), ('#warp', '　不重新整理畫面'),
                                                     ('#use', '　放進自己的作品'), ('#map', '🗺️ 函式地圖'), ('#cats', '📚 8 類函式'),
                                                     ('#dl', '⬇ 下載'), ('#pits', '⚠ 踩過的坑')])
    body = '''
<section class="chap" id="intro"><div class="ch"><span class="cn" style="background:#3F4A56;color:#fff">第 0 章</span><h2>函式是什麼？</h2></div>
<p class="lead">在 Scratch 裡，「函式積木」分類的<b>自訂積木</b>就是函式：把一段常用的程式包起來、取一個名字，要用的時候喊它的名字就好。</p>
<div class="topic"><h3>🧩 函式 ＝ 有名字、有輸入、有輸出的小機器</h3>
<p>例如 <span class="sb myblocks">淡入 <span class="rp myblocks">秒數</span> 秒</span> 這塊積木，「秒數」是它的<b>輸入</b>（參數）。
呼叫時寫 <span class="sb myblocks">淡入 <span class="nv">1</span> 秒</span> 就是淡入 1 秒；寫 <span class="nv">3</span> 就是 3 秒。<b>寫一次、用很多次</b>，要改也只要改一個地方。</p>
<div class="why"><b class="t">Scratch 的自訂積木沒辦法「回傳」答案</b>　所以這個函式庫約定：需要答案的函式，把答案寫進一個變數（<b>輸出變數</b>，大多叫「結果」），呼叫完再去讀它。</div></div>

<div class="topic" id="kinds"><h3>🅰️🅱️ 兩種函式</h3>
<p>自訂積木有一個限制：<b>只能在定義它的那個角色（或舞台）裡呼叫</b>。所以這 %d 個函式分成兩種：</p>
<div class="two">
<div class="kindcard A"><h4>A 型｜角色自己用（%d 個）</h4><p class="sm">淡入、抖動、打字機、跳躍……<b>動的是角色自己</b>，所以要放在那個角色裡。內部的變數都是「僅適用當前角色」，整個角色可以匯出成 .sprite3 帶到別的作品。</p>
<div class="flowv"><span class="sb events">當 <span class="dd">空白 <i>▾</i></span> 鍵被按下</span><span class="sb myblocks">淡入 <span class="nv">1</span> 秒</span><span class="sb myblocks">抖動 <span class="nv">6</span> 次 強度 <span class="nv">10</span></span></div></div>
<div class="kindcard B"><h4>B 型｜舞台服務台（%d 個）</h4><p class="sm">數學、清單、計時……<b>只負責計算</b>，放在舞台上。任何角色要用：寫參數 → 廣播並等待 → 讀結果。</p>
<div class="flowv"><span class="sb variables">變數 <span class="dd">參數1 <i>▾</i></span> 設為 <span class="nv">125</span></span><span class="sb events">廣播訊息 <span class="dd">秒數轉時間 <i>▾</i></span> 並等待</span><span class="sb looks">說出 <span class="rp variables">結果</span></span></div></div>
</div></div>

<section class="chap" id="warp" style="margin-top:22px"><div class="topic" style="margin-top:0"><h3>⚡ 「執行時不重新整理畫面」要不要勾？</h3>
<p>建立自訂積木時有一個選項「執行時不重新整理畫面」。勾了，整塊積木會在一瞬間算完才更新畫面。</p></div>
<div class="lab"><div class="lh">🔬 實驗 0：勾與不勾 <span class="tag">按一下</span></div><div data-lab="0"></div></div></section>

<div class="topic" id="use"><h3>📦 怎麼把函式放進自己的作品？</h3>
<ol>
<li><b>最簡單：用「完整函式庫.sb3」當起點</b>　打開它、另存新檔，舞台已經裝好 %d 個 B 型函式，「函式小幫手」角色裝好 %d 個 A 型函式。把小幫手的造型換成你的角色就能開始做。</li>
<li><b>匯入角色（.sprite3）</b>　在 Scratch 角色區按「上傳角色」，選 <b>小幫手_…sprite3</b>。A 型函式和它用到的變數會一起進來（用到的「所有角色適用」變數，Scratch 會自動在舞台建立）。</li>
<li><b>用背包</b>　在範例檔裡把「定義」積木拖進背包，再從背包拖到你的角色。</li>
<li><b>B 型函式</b>　舞台沒辦法匯出，請從完整函式庫把「定義」和「當收到訊息（函式名稱）」兩段一起用背包帶過去。</li>
</ol>
<p class="sm">所有 .sb3 都只用 Scratch 內建積木，<b>不需要擴充功能</b>，官方 Scratch 或 stretch3 都能開。</p></div>
<div class="chklist"><label><input type="checkbox" id="k0a"> 我知道自訂積木的輸入叫做「參數」</label><label><input type="checkbox" id="k0b"> 我分得出 A 型和 B 型函式</label>
<label><input type="checkbox" id="k0c"> 我知道動畫函式不勾、計算函式要勾「不重新整理畫面」</label></div>
</section>

<section class="chap" id="map"><div class="ch"><span class="cn" style="background:#3F4A56;color:#fff">地圖</span><h2>🗺️ 函式地圖（%d 個）</h2></div>
<p class="lead">點任何一個函式，就會跳到它的說明。</p>
<div class="legend"><span><i style="background:var(--c-myblocks)"></i>A 型｜角色自己用</span><span><i style="background:#2AA89A"></i>B 型｜舞台服務台</span></div>
<div data-map></div></section>

<section class="chap" id="cats"><div class="ch"><span class="cn" style="background:#3F4A56;color:#fff">分類</span><h2>📚 8 類函式</h2></div>
<p class="lead">每一類都有：試玩台、每個函式的說明卡與積木圖、範例 .sb3、網頁版、動手改的任務。</p><div class="cats8">%s</div></section>

<section class="chap" id="dl"><div class="ch"><span class="cn" style="background:#3F4A56;color:#fff">下載</span><h2>⬇ 下載</h2></div>
<div class="tablewrap"><table class="rubric dltab"><tr><th>分類</th><th>範例 .sb3</th><th>網頁版</th><th>A 型角色 .sprite3</th></tr>%s</table></div>
<p class="sm">網頁版在 <code>play/</code>，直接雙擊就能玩（離線也可以）；<code>play/engine/</code> 要跟著一起複製。</p></section>

<section class="chap" id="pits"><div class="ch"><span class="cn" style="background:#3F4A56;color:#fff">小心</span><h2>⚠ 做這個函式庫時踩過的坑</h2></div>
<ul class="pitlist">
<li><b>計時器在按綠旗時會歸零</b>：冷卻的「上次使用」、無敵的「無敵到」都要在綠旗重新設定，不然第一次會用不了（5-6、8-3）。</li>
<li><b>先把變數設好，再廣播</b>：收到廣播才設生命值的話，別的角色可能先跑、讀到舊的值（8 遊戲機制）。</li>
<li><b>按鍵的程式還在跑時，再按一次同一個鍵不會重新開始</b>：「說出…持續 0.4 秒」會讓連按變得沒反應，所以冷卻範例改用「說出」。</li>
<li><b>補零的結果是文字，但「＝」會當數字比</b>：007 ＝ 7 成立（1-5）。</li>
<li><b>「造型換成 (數字)」是第幾個、「造型換成 (文字)」是名稱</b>：用「換到第 n 個造型」就不會搞混（3-7）。</li>
<li><b>角色不能整個移出舞台</b>：Scratch 會留一點在舞台上，所以無限捲動用 ±250 而不是 ±480（8-6）。</li>
<li><b>清單不能當參數</b>：清單函式都處理「工作清單」（7）。</li>
</ul></section>
''' % (len(BL.FUNCS), fa, fb, fb, fa, len(BL.FUNCS), cards, rows)
    out = [head('Scratch 函式庫'), topbar(),
           '<div class="wrap"><section class="hero"><h1>🧰 Scratch 函式庫：%d 個常用技巧，一塊積木就能用</h1>'
           '<p>打字機、淡入淡出、抖動、清除分身、倒數計時、洗牌排序、重力跳躍……把 Scratch 作品裡最常寫的技巧做成<b>自訂積木（函式）</b>。'
           '每個函式都有說明、和檔案一模一樣的積木圖、可以動手按的試玩台，以及範例 .sb3。</p>%s</section>' % (len(BL.FUNCS), catnav(0)),
           '<div class="layout"><nav class="toc" aria-label="目錄"><h3>目錄</h3>%s<div class="prog">第 0 章自我檢核 <span id="ptxt"></span></div><div class="pbar"><i id="pbar"></i></div></nav><main>' % toc,
           body, '</main></div></div>',
           '<footer class="sm" style="text-align:center;padding:20px">Scratch 函式庫 ・ 參考：手勢模組教室、貓咪甜點店、Scratch 動畫製作教學、Scratch 積木教室</footer>',
           scripts(), '</body>\n</html>\n']
    return '\n'.join(out)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    src = open(os.path.join(STU, 'assets', 'blocks_data.js'), encoding='utf-8').read()
    uses = json.loads(src.split('var SB3_USES = ', 1)[1].rsplit(';', 1)[0])
    open(os.path.join(STU, 'index.html'), 'w', encoding='utf-8').write(index_page())
    print('student/index.html')
    for n in range(1, 9):
        open(os.path.join(STU, 'c%d.html' % n), 'w', encoding='utf-8').write(cat_page(n, uses))
        print('student/c%d.html' % n)


if __name__ == '__main__':
    main()
