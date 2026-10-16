/* =========================================================
   blk.js — 把資料畫成 Scratch 積木（只負責「看」，不會執行）
   積木文字依 Scratch 官方繁體中文翻譯（scratch-l10n zh-tw）
   本教材只用 Scratch 內建積木，沒有用到任何擴充功能
   ========================================================= */
var BLK = (function(){
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function part(p){
    if(p==null)return '';
    if(typeof p==='string')return '<span class="tx">'+esc(p)+'</span>';
    if(p.flag)return '<span class="flagi" aria-label="綠旗">⚑</span>';
    if(p.n!=null)return '<span class="nv">'+esc(p.n)+'</span>';
    if(p.s!=null)return '<span class="nv sv">'+esc(p.s)+'</span>';
    if(p.d!=null)return '<span class="dd">'+esc(p.d)+' <i>▾</i></span>';
    if(p.p!=null)return '<span class="rp myblocks">'+esc(p.p)+'</span>';
    if(p.r)return '<span class="rp '+p.r.c+'">'+parts(p.r.t)+'</span>';
    if(p.b)return '<span class="bl '+p.b.c+'">'+parts(p.b.t)+'</span>';
    if(p.e)return '<span class="bl empty"></span>';
    return '';
  }
  function parts(arr){return (arr||[]).map(part).join('');}
  function one(b){
    var hl=b.hl?' hl':'';
    var note=b.note?'<span class="bnote">'+b.note+'</span>':'';
    if(b.k==='c'||b.k==='ce'||b.k==='forever'){
      var cat=b.c||'control';
      var h='<div class="cwrap '+cat+hl+'"><div class="chead">'+parts(b.t)+'</div>'+
            '<div class="cbody">'+stack(b.body||[])+'</div>';
      if(b.k==='ce') h+='<div class="cmid">'+parts(b.t2||['否則'])+'</div><div class="cbody">'+stack(b.body2||[])+'</div>';
      h+='<div class="cfoot">'+(b.k==='forever'||b.loop?'<span class="loopi">↻</span>':'')+'</div></div>';
      return '<div class="brow">'+h+note+'</div>';
    }
    if(b.k==='def'){
      return '<div class="brow"><div class="sb def myblocks'+hl+'"><span class="tx">定義</span>'+
             '<span class="proto">'+parts(b.t)+'</span></div>'+note+'</div>';
    }
    var cls='sb '+(b.c||'looks')+(b.k==='hat'?' hat':'')+(b.k==='cap'?' cap':'')+hl;
    return '<div class="brow"><div class="'+cls+'">'+parts(b.t)+'</div>'+note+'</div>';
  }
  function stack(arr){return '<div class="stk">'+arr.map(one).join('')+'</div>';}
  function render(el,arr){ el.innerHTML=stack(arr); el.classList.add('bscript'); return el; }
  function auto(lib){
    document.querySelectorAll('[data-blk]').forEach(function(el){
      var k=el.getAttribute('data-blk'); if(lib[k])render(el,lib[k]);
    });
  }
  return {render:render,stack:stack,auto:auto,part:part};
})();

/* ---------- 小幫手 ---------- */
function V(n){return {r:{c:'variables',t:[n]}};}
function OP(a,o,b){return {r:{c:'operators',t:[a,o,b]}};}
function B(a,o,b){return {b:{c:'operators',t:[a,o,b]}};}
function AND(a,b){return {b:{c:'operators',t:[a,'且',b]}};}
function OR(a,b){return {b:{c:'operators',t:[a,'或',b]}};}
function NOT(a){return {b:{c:'operators',t:[a,'不成立']}};}
function JOIN(a,b){return {r:{c:'operators',t:['字串組合',a,b]}};}
function LETTER(i,s){return {r:{c:'operators',t:['第',i,'個字元，在',s]}};}
function LEN(s){return {r:{c:'operators',t:[s,'的長度']}};}
function RND(a,b){return {r:{c:'operators',t:['隨機取數',N(a),'到',N(b)]}};}
function SETV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'設為',x]};for(var k in o)b[k]=o[k];return b;}
function CHV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'改變',x]};for(var k in o)b[k]=o[k];return b;}
function MSG(n,w,o){var b={k:'stack',c:'events',t:['廣播訊息',{d:n}].concat(w?['並等待']:[])};for(var k in o)b[k]=o[k];return b;}
function WHEN(n,o){var b={k:'hat',c:'events',t:['當收到訊息',{d:n}]};for(var k in o)b[k]=o[k];return b;}
function FLAG(o){var b={k:'hat',c:'events',t:['當',{flag:1},'被點擊']};for(var k in o)b[k]=o[k];return b;}
function CLICKED(o){var b={k:'hat',c:'events',t:['當角色被點擊']};for(var k in o)b[k]=o[k];return b;}
function COS(x,o){var b={k:'stack',c:'looks',t:['造型換成',x]};for(var k in o)b[k]=o[k];return b;}
function SAY(t,o){var b={k:'stack',c:'looks',t:['說出',t]};for(var k in o)b[k]=o[k];return b;}
function SIZE(n,o){var b={k:'stack',c:'looks',t:['尺寸設為',N(n),'%']};for(var k in o)b[k]=o[k];return b;}
function DSIZE(n,o){var b={k:'stack',c:'looks',t:['尺寸改變',N(n)]};for(var k in o)b[k]=o[k];return b;}
function GHOST(n,o){var b={k:'stack',c:'looks',t:['圖像效果',{d:'幽靈'},'設為',N(n)]};for(var k in o)b[k]=o[k];return b;}
function DGHOST(n,o){var b={k:'stack',c:'looks',t:['圖像效果',{d:'幽靈'},'改變',N(n)]};for(var k in o)b[k]=o[k];return b;}
function SHOW(o){var b={k:'stack',c:'looks',t:['顯示']};for(var k in o)b[k]=o[k];return b;}
function HIDE(o){var b={k:'stack',c:'looks',t:['隱藏']};for(var k in o)b[k]=o[k];return b;}
function GOTO(x,y,o){var b={k:'stack',c:'motion',t:['定位到 x:',N(x),'y:',N(y)]};for(var k in o)b[k]=o[k];return b;}
function GLIDE(s,x,y,o){var b={k:'stack',c:'motion',t:['滑行',N(s),'秒到 x:',N(x),'y:',N(y)]};for(var k in o)b[k]=o[k];return b;}
function DY(n,o){var b={k:'stack',c:'motion',t:['y 改變',N(n)]};for(var k in o)b[k]=o[k];return b;}
function WAIT(x,o){var b={k:'stack',c:'control',t:['等待',x,'秒']};for(var k in o)b[k]=o[k];return b;}
function CALL(t,o){var b={k:'stack',c:'myblocks',t:t};for(var k in o)b[k]=o[k];return b;}
function PLAY(n,o){var b={k:'stack',c:'sound',t:['播放音效',{d:n}]};for(var k in o)b[k]=o[k];return b;}
function S(n){return {s:n};}
function N(n){return {n:n};}
var TIMER={r:{c:'sensing',t:['計時器']}};
var MOUSE={b:{c:'sensing',t:['碰到',{d:'滑鼠指標'},'？']}};

var SCRIPTS = {

/* ---------- Skip：可跳過的等待 ---------- */
waitSkip:[
  {k:'def',t:['等',{p:'秒數'},'秒（可跳過）'],note:'角色：舞台'},
  SETV('等到',OP(TIMER,'+',{p:'秒數'}),{hl:1,note:'先記下「要等到第幾秒」'}),
  {k:'c',c:'control',t:['重複直到',OR(B(TIMER,'>',V('等到')),B(V('跳過'),'=',N(1)))],loop:1,hl:1,
   note:'時間到了「或」按了跳過 → 就結束等待',body:[]}
],
skipBtn:[
  CLICKED({note:'角色：跳過鈕'}),
  PLAY('按鈕'),
  SETV('跳過',N(1),{hl:1,note:'按鈕只做這一件事，其他交給上面那塊'})
],

/* ---------- 畫面切換 ---------- */
gotoScene:[
  {k:'def',t:['切到',{p:'畫面名稱'}],note:'角色：舞台'},
  SETV('畫面',{p:'畫面名稱'}),
  SETV('跳過',N(0),{note:'每換一個畫面就把跳過歸零'}),
  {k:'ce',c:'control',t:['如果',B({p:'畫面名稱'},'=',S('遊戲')),'那麼'],body:[
    {k:'stack',c:'looks',t:['背景換成',{d:'遊戲畫面'}]}
  ],body2:[
    {k:'stack',c:'looks',t:['背景換成',{d:'店內'}]}
  ]},
  MSG('切換畫面',true,{hl:1,note:'通知所有角色：畫面換了，請各自決定要不要出現'})
],
showhide:[
  WHEN('切換畫面',{note:'每個角色都有一段這樣的程式'}),
  {k:'ce',c:'control',t:['如果',B(V('畫面'),'=',S('選單')),'那麼'],hl:1,note:'「現在是我的畫面嗎？」',body:[
    GOTO(-150,-34),SIZE(100),COS({d:'普通'}),SHOW()
  ],body2:[
    HIDE()
  ]}
],
main:[
  FLAG({note:'角色：舞台'}),
  SETV('跳過',N(0)),SETV('目前遊戲',N(0)),SETV('回到哪',S('')),
  CALL(['切到',S('片頭')]),
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'c',c:'control',t:['如果',B(V('畫面'),'=',S('片頭')),'那麼'],hl:1,body:[
      CALL(['播片頭']),
      {k:'c',c:'control',t:['如果',B(V('畫面'),'=',S('片頭')),'那麼'],note:'播的時候可能被按鈕改掉了，要再確認一次',body:[
        CALL(['播完了，接著去',S('故事')])
      ]}
    ]},
    {k:'c',c:'control',t:['如果',B(V('畫面'),'=',S('故事')),'那麼'],body:[
      CALL(['播故事']),
      {k:'c',c:'control',t:['如果',B(V('畫面'),'=',S('故事')),'那麼'],body:[CALL(['播完了，接著去',S('說明')])]}
    ]},
    {k:'c',c:'control',t:['如果',B(V('畫面'),'=',S('說明')),'那麼'],body:[
      CALL(['播說明']),
      {k:'c',c:'control',t:['如果',B(V('畫面'),'=',S('說明')),'那麼'],body:[CALL(['播完了，接著去',S('選單')])]}
    ]},
    WAIT(N(0.05),{note:'在主選單和遊戲畫面時，就是在這裡空轉等玩家按按鈕'})
  ]}
],
nextScene:[
  {k:'def',t:['播完了，接著去',{p:'預設下一個'}]},
  {k:'ce',c:'control',t:['如果',B(V('回到哪'),'=',S('選單')),'那麼'],hl:1,note:'從選單點進來的 → 看完回選單',body:[
    SETV('回到哪',S('')),
    CALL(['切到',S('選單')])
  ],body2:[
    CALL(['切到',{p:'預設下一個'}],{note:'第一次玩 → 照順序往下一頁'})
  ]}
],

/* ---------- 片頭：招牌落下 ---------- */
signEasy:[
  WHEN('片頭動畫',{note:'入門做法：角色：招牌'}),
  SHOW(),
  GOTO(0,300),
  GLIDE(0.6,0,76,{note:'直接滑到定位就好'})
],
signPro:[
  WHEN('片頭動畫',{note:'進階做法：角色：招牌'}),
  {k:'stack',c:'looks',t:['圖層移到最上層']},
  GOTO(0,300),SIZE(100),SHOW(),
  {k:'c',c:'control',t:['如果',B(V('跳過'),'=',N(0)),'那麼'],hl:1,note:'被跳過時就不播動畫，直接跳到最後一行',body:[
    GLIDE(0.45,0,62,{hl:1,note:'① 先滑到比目標「低一點」'}),
    PLAY('咚'),
    GLIDE(0.14,0,92,{hl:1,note:'② 往上彈過頭'}),
    GLIDE(0.12,0,76,{hl:1,note:'③ 回到定位'})
  ]},
  GOTO(0,76,{note:'最後一定要補這句：不管有沒有跳過，都停在正確的位置'})
],
titleZoom:[
  WHEN('片頭動畫',{note:'角色：店名'}),
  GOTO(0,80),HIDE(),SIZE(40),GHOST(100),
  {k:'c',c:'control',t:['如果',B(V('跳過'),'=',N(0)),'那麼'],body:[WAIT(N(0.75),{note:'等招牌先掉下來'})]},
  SHOW(),
  {k:'c',c:'control',t:['如果',B(V('跳過'),'=',N(0)),'那麼'],body:[
    {k:'c',c:'control',t:['重複',N(12),'次'],loop:1,hl:1,note:'一邊放大、一邊淡入，比只做一種好看很多',body:[
      DSIZE(5),DGHOST(-9),WAIT(N(0.02))
    ]}
  ]},
  SIZE(100),GHOST(0)
],

/* ---------- 故事：打字機 ---------- */
typer:[
  {k:'def',t:['打字',{p:'句子'}],note:'角色：貓店長'},
  SETV('顯示文字',S('')),
  SETV('第幾個字',N(0)),
  {k:'c',c:'control',t:['重複直到',OR(B(V('第幾個字'),'=',LEN({p:'句子'})),B(V('跳過'),'=',N(1)))],loop:1,hl:1,
   note:'打完了「或」按了跳過就停',body:[
    CHV('第幾個字',N(1)),
    SETV('顯示文字',JOIN(V('顯示文字'),LETTER(V('第幾個字'),{p:'句子'})),{hl:1,note:'把第 n 個字接到後面'}),
    SAY(V('顯示文字')),
    PLAY('打字'),
    WAIT(N(0.045),{note:'數字越小打字越快'})
  ]},
  {k:'c',c:'control',t:['如果',B(V('跳過'),'=',N(1)),'那麼'],body:[
    SAY({p:'句子'},{note:'被跳過 → 直接把整句顯示出來'})
  ]}
],
story:[
  WHEN('故事動畫',{note:'角色：貓店長'}),
  COS({d:'普通'}),GOTO(-150,-96),SIZE(86),SHOW(),
  CALL(['打字',S('歡迎光臨！我是店長小奶油。')]),
  CALL(['等',N(0.5),'秒（可跳過）']),
  CALL(['打字',S('這家店有三種甜點，每一種都是一個小遊戲。')]),
  CALL(['等',N(0.5),'秒（可跳過）']),
  CALL(['打字',S('幫我把客人的甜點做出來，好嗎？')]),
  CALL(['等',N(0.7),'秒（可跳過）']),
  SAY(S(''),{note:'說出空白＝把對話框收起來'})
],

/* ---------- 說明：三頁輪播 ---------- */
info:[
  {k:'def',t:['播說明'],note:'角色：舞台'},
  SETV('說明頁',N(0)),
  {k:'c',c:'control',t:['重複',N(3),'次'],loop:1,body:[
    CHV('說明頁',N(1)),
    PLAY('翻頁'),
    MSG('換說明頁',true),
    CALL(['等',N(2.4),'秒（可跳過）'])
  ]}
],
infoCard:[
  WHEN('換說明頁',{note:'角色：說明卡'}),
  {k:'c',c:'control',t:['如果',B(V('說明頁'),'=',N(1)),'那麼'],body:[COS({d:'第1頁'})]},
  {k:'c',c:'control',t:['如果',B(V('說明頁'),'=',N(2)),'那麼'],body:[COS({d:'第2頁'})]},
  {k:'c',c:'control',t:['如果',B(V('說明頁'),'=',N(3)),'那麼'],body:[COS({d:'第3頁'})]},
  SHOW(),GHOST(100),SIZE(88),
  {k:'c',c:'control',t:['重複',N(8),'次'],loop:1,hl:1,note:'淡入＋稍微放大，比直接換造型順眼',body:[
    DGHOST(-12.5),DSIZE(1.5),WAIT(N(0.02))
  ]},
  GHOST(0),SIZE(100)
],

/* ---------- 選單按鈕 ---------- */
hover:[
  FLAG({note:'角色：草莓蛋糕（布丁、馬卡龍一樣）'}),
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'ce',c:'control',t:['如果',AND(B(V('畫面'),'=',S('選單')),MOUSE),'那麼'],hl:1,body:[
      COS({d:'亮起'}),
      {k:'c',c:'control',t:['如果',B({r:{c:'looks',t:['尺寸']}},'<',N(112)),'那麼'],body:[
        DSIZE(4,{note:'每次只變大一點點 → 有彈性的感覺'})
      ]}
    ],body2:[
      COS({d:'普通'}),
      {k:'c',c:'control',t:['如果',B({r:{c:'looks',t:['尺寸']}},'>',N(100)),'那麼'],body:[DSIZE(-4)]}
    ]},
    WAIT(N(0.02))
  ]}
],
pick:[
  CLICKED({note:'角色：草莓蛋糕'}),
  {k:'c',c:'control',t:['如果',B(V('畫面'),'=',S('選單')),'那麼'],hl:1,note:'只有在選單畫面才算數',body:[
    PLAY('按鈕'),
    SETV('目前遊戲',V('我的編號'),{note:'蛋糕 1、布丁 2、馬卡龍 3'}),
    SETV('畫面',S('遊戲')),
    {k:'stack',c:'looks',t:['背景換成',{d:'遊戲畫面'}]},
    MSG('切換畫面')
  ]}
],
smallBtn:[
  CLICKED({note:'角色：小按鈕（三個分身）'}),
  {k:'c',c:'control',t:['如果',AND(B(V('畫面'),'=',S('選單')),B(V('編號'),'>',N(0))),'那麼'],body:[
    PLAY('按鈕'),
    SETV('回到哪',S('選單'),{hl:1,note:'關鍵：先說好「看完要回選單」'}),
    {k:'c',c:'control',t:['如果',B(V('編號'),'=',N(1)),'那麼'],body:[SETV('畫面',S('片頭'))]},
    {k:'c',c:'control',t:['如果',B(V('編號'),'=',N(2)),'那麼'],body:[SETV('畫面',S('故事'))]},
    {k:'c',c:'control',t:['如果',B(V('編號'),'=',N(3)),'那麼'],body:[SETV('畫面',S('說明'))]},
    SETV('跳過',N(0)),
    MSG('切換畫面')
  ]}
],

/* ---------- 遊戲標題畫面 ---------- */
gameTitle:[
  WHEN('切換畫面',{note:'角色：遊戲標題'}),
  {k:'ce',c:'control',t:['如果',B(V('畫面'),'=',S('遊戲')),'那麼'],body:[
    {k:'c',c:'control',t:['如果',B(V('目前遊戲'),'=',N(1)),'那麼'],body:[COS({d:'遊戲一'})]},
    {k:'c',c:'control',t:['如果',B(V('目前遊戲'),'=',N(2)),'那麼'],body:[COS({d:'遊戲二'})]},
    {k:'c',c:'control',t:['如果',B(V('目前遊戲'),'=',N(3)),'那麼'],body:[COS({d:'遊戲三'})]},
    GOTO(0,40),SIZE(70),GHOST(100),SHOW(),PLAY('登場'),
    {k:'c',c:'control',t:['重複',N(10),'次'],loop:1,body:[DSIZE(3),DGHOST(-10),WAIT(N(0.02))]},
    SIZE(100),GHOST(0,{hl:1,note:'👉 學生就是在這裡接上自己的遊戲程式'})
  ],body2:[
    HIDE()
  ]}
],

/* ---------- 小裝飾（分身）---------- */
particle:[
  {k:'hat',c:'control',t:['當分身產生'],note:'角色：小裝飾'},
  COS({d:'愛心'}),
  {k:'c',c:'control',t:['如果',B(RND(1,3),'>',N(1)),'那麼'],body:[COS({d:'星星'})]},
  {k:'c',c:'control',t:['如果',B(RND(1,3),'>',N(2)),'那麼'],body:[COS({d:'泡泡'})]},
  GOTO(0,-190,{note:'x 用「隨機取數 −210 到 210」'}),
  SIZE(90),GHOST(20),SHOW(),
  {k:'c',c:'control',t:['重複',N(30),'次'],loop:1,hl:1,note:'往上飄、左右搖、慢慢變透明、順便轉一點點',body:[
    DY(5),DGHOST(2.6),
    {k:'stack',c:'motion',t:['右轉',N(2),'度']},
    WAIT(N(0.03))
  ]},
  {k:'cap',c:'control',t:['刪除這個分身'],hl:1,note:'一定要刪掉，不然分身越來越多會變慢'}
]
};
