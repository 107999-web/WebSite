/* =========================================================
   blk.js — 把資料畫成 Scratch 積木（只負責「看」，不會執行）
   積木文字依 Scratch 官方繁體中文翻譯（scratch-l10n zh-tw）
   Facemesh2Scratch 的積木沿用本校 Facemesh2Scratch 教材的中文說法
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

/* ---------- 小幫手（Handpose2Scratch）---------- */
var LM={1:'1 手腕',5:'5 拇指尖',6:'6 食指第三關節',7:'7 食指第二關節',9:'9 食指尖',
        10:'10 中指第三關節',11:'11 中指第二關節',13:'13 中指尖',
        15:'15 無名指第二關節',17:'17 無名指尖',18:'18 小指第三關節',
        19:'19 小指第二關節',21:'21 小指尖'};
function ABS(x){return {r:{c:'operators',t:[{d:'絕對值'},'數值',x]}};}
function V(n){return {r:{c:'variables',t:[n]}};}
function LS(n){return {r:{c:'listtone',t:[n]}};}
function HX(i){return {r:{c:'ext',t:[{d:LM[i]},'的 x 座標']}};}
function HY(i){return {r:{c:'ext',t:[{d:LM[i]},'的 y 座標']}};}
function OP(a,o,b){return {r:{c:'operators',t:[a,o,b]}};}
function B(a,o,b){return {b:{c:'operators',t:[a,o,b]}};}
function AND(a,b){return {b:{c:'operators',t:[a,'且',b]}};}
function OR(a,b){return {b:{c:'operators',t:[a,'或',b]}};}
function NOT(a){return {b:{c:'operators',t:['不成立',a]}};}
function JOIN(a,b){return {r:{c:'operators',t:['字串組合',a,b]}};}
function MOD(a,b){return {r:{c:'operators',t:[a,'除以',b,'的餘數']}};}
function RND(a,b){return {r:{c:'operators',t:['隨機取數',N(a),'到',N(b)]}};}
function ITEM(i,l){return {r:{c:'listtone',t:['第',i,'項的',{d:l}]}};}
function REPL(i,l,x,o){var b={k:'stack',c:'listtone',t:['把',{d:l},'的第',i,'項換成',x]};for(var k in o)b[k]=o[k];return b;}
function SETV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'設為',x]};for(var k in o)b[k]=o[k];return b;}
function CHV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'改變',x]};for(var k in o)b[k]=o[k];return b;}
function MSG(n,w,o){var b={k:'stack',c:'events',t:['廣播訊息',{d:n}].concat(w?['並等待']:[])};for(var k in o)b[k]=o[k];return b;}
function WHEN(n,o){var b={k:'hat',c:'events',t:['當收到訊息',{d:n}]};for(var k in o)b[k]=o[k];return b;}
function FLAG(o){var b={k:'hat',c:'events',t:['當',{flag:1},'被點擊']};for(var k in o)b[k]=o[k];return b;}
function KEY(k2,o){var b={k:'hat',c:'events',t:['當',{d:k2},'鍵被按下']};for(var k in o)b[k]=o[k];return b;}
function COS(x,o){var b={k:'stack',c:'looks',t:['造型換成',x]};for(var k in o)b[k]=o[k];return b;}
function CALL(t,o){var b={k:'stack',c:'myblocks',t:t};for(var k in o)b[k]=o[k];return b;}
function WAIT(x,o){var b={k:'stack',c:'control',t:['等待',x,'秒']};for(var k in o)b[k]=o[k];return b;}
function S(n){return {s:n};}
function N(n){return {n:n};}
var TIMER={r:{c:'sensing',t:['計時器']}};

var SCRIPTS = {

/* ---------- 0 先量量看 ---------- */
setup:[
  FLAG(),
  {k:'stack',c:'ext',t:['將攝影機',{d:'鏡像開啟'}],hl:1,note:'選「像照鏡子」的那一個（英文值 on）'},
  {k:'stack',c:'ext',t:['將攝影機的透明度設為',N(55)]},
  {k:'stack',c:'ext',t:['將倍率設為',{d:'0.75'}],note:'倍率決定座標怎麼換算，設好就不要再改'},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    SETV('指尖y',HY(9),{hl:1,note:'把食指伸直、再彎下來，\n盯著這兩個數字看'}),
    SETV('關節y',HY(7))
  ]}
],

/* ---------- 1 數手指 ---------- */
count:[
  {k:'def',t:['數手指'],note:'右鍵 → 編輯 → 勾選「執行時不重新整理畫面」'},
  {k:'stack',c:'control',t:['—— 兩把尺 ——']},
  SETV('手長',OP(HY(10),'-',HY(1)),{hl:1,note:'直向的尺：手腕 → 中指第三關節'}),
  SETV('餘裕',OP(V('手長'),'×',V('餘裕比例'))),
  SETV('手寬',ABS(OP(HX(6),'-',HX(18))),{hl:1,note:'橫向的尺：食指掌根 ↔ 小指掌根\n用絕對值，左手右手都一樣'}),
  {k:'stack',c:'control',t:['—— 拇指：比橫向 ——']},
  SETV('拇指跨距',ABS(OP(HX(5),'-',HX(18))),{hl:1,
    note:'★ 量到「小指掌根」，不是食指掌根 ★\n拇指收起來時常常整個橫過手掌，\n那時它離食指掌根反而變遠，會被誤判成張開。\n量到手掌的另一邊，收起來就一定變近'}),
  SETV('拇指門檻',OP(V('手寬'),'×',V('拇指比例')),{note:'拇指比例預設 1.35（也就是「比手掌還寬 1.35 倍」）'}),
  SETV('拇指餘裕',OP(V('手寬'),'×',V('餘裕比例'))),
  {k:'ce',c:'control',t:['如果',B(V('拇指'),'=',N(1)),'那麼'],hl:1,
   note:'拇指是往「旁邊」伸的，y 幾乎不變，\n所以改成量橫向跨距：\n　跨距 > 手寬 × 1.35 ＝ 伸直\n一樣用餘裕做遲滯',body:[
    {k:'c',c:'control',t:['如果',B(V('拇指跨距'),'<',OP(V('拇指門檻'),'-',V('拇指餘裕'))),'那麼'],body:[SETV('拇指',N(0))]}
  ],body2:[
    {k:'c',c:'control',t:['如果',B(V('拇指跨距'),'>',OP(V('拇指門檻'),'+',V('拇指餘裕'))),'那麼'],body:[SETV('拇指',N(1))]}
  ]},
  {k:'stack',c:'control',t:['—— 其他四根：比直向 ——']},
  {k:'ce',c:'control',t:['如果',B(V('食指'),'=',N(1)),'那麼'],hl:1,
   note:'本來伸直 → 要比關節低「餘裕」以上才改成彎曲\n本來彎著 → 要比關節高出「餘裕」才改成伸直',body:[
    {k:'c',c:'control',t:['如果',B(HY(9),'<',OP(HY(7),'-',V('餘裕'))),'那麼'],body:[SETV('食指',N(0))]}
  ],body2:[
    {k:'c',c:'control',t:['如果',B(HY(9),'>',OP(HY(7),'+',V('餘裕'))),'那麼'],body:[SETV('食指',N(1))]}
  ]},
  {k:'stack',c:'control',t:['（中指 11／13、無名指 15／17、小指 19／21 同理）']},
  {k:'stack',c:'control',t:['—— 兩個輸出 ——']},
  SETV('手指數',OP(OP(V('拇指'),'+',OP(V('食指'),'+',V('中指'))),'+',OP(V('無名指'),'+',V('小指'))),
       {hl:1,note:'五個 0 或 1 加起來 ＝ 比了幾根（0～5）'}),
  SETV('指型',JOIN(JOIN(V('拇指'),V('食指')),JOIN(V('中指'),JOIN(V('無名指'),V('小指')))),
       {hl:1,note:'五位密碼（拇食中無小），例如 01100'}),
  SETV('四指型',JOIN(JOIN(V('食指'),V('中指')),JOIN(V('無名指'),V('小指'))),
       {hl:1,note:'不含拇指的四位密碼，給猜拳用'}),
  REPL(N(1),'指狀態',V('拇指'),{note:'給手指燈用（2～5 項同理）'})
],

/* ---------- 2 認猜拳 ---------- */
rps:[
  {k:'def',t:['認猜拳'],note:'用「四指型」，故意不看拇指'},
  {k:'ce',c:'control',t:['如果',B(V('四指型'),'=',S('0000')),'那麼'],hl:1,body:[SETV('猜拳號',N(1),{note:'1 ＝ 石頭'})],body2:[
    {k:'ce',c:'control',t:['如果',B(V('四指型'),'=',S('1100')),'那麼'],body:[SETV('猜拳號',N(2),{note:'2 ＝ 剪刀'})],body2:[
      {k:'ce',c:'control',t:['如果',B(V('四指型'),'=',S('1111')),'那麼'],body:[SETV('猜拳號',N(3),{note:'3 ＝ 布'})],
       body2:[SETV('猜拳號',N(0),{note:'0 ＝ 看不懂，請玩家再比一次'})]}
    ]}
  ]}
],

/* ---------- 3 穩定判斷 ---------- */
stable:[
  {k:'def',t:['穩定判斷']},
  {k:'ce',c:'control',t:['如果',B(V('指型'),'=',V('上次指型')),'那麼'],body:[
    {k:'c',c:'control',t:['如果',B(OP(TIMER,'-',V('穩定起點')),'>',V('穩定門檻')),'那麼'],hl:1,
     note:'同一組手勢已經撐超過 0.15 秒 → 才承認',body:[
      SETV('確定指型',V('指型')),SETV('確定手指數',V('手指數')),SETV('確定猜拳號',V('猜拳號'))
    ]}
  ],body2:[
    SETV('穩定起點',TIMER,{hl:1,note:'手勢一變就重新計時'}),
    SETV('上次指型',V('指型'))
  ]}
],

/* ---------- 3b 清空手勢 ---------- */
clear:[
  {k:'def',t:['清空手勢'],note:'手真的離開鏡頭超過 0.4 秒才會呼叫'},
  SETV('拇指',N(0)),SETV('食指',N(0)),SETV('中指',N(0)),SETV('無名指',N(0)),SETV('小指',N(0)),
  SETV('手指數',N(-1)),SETV('指型',S('-----')),SETV('四指型',S('----')),SETV('猜拳號',N(0)),
  SETV('確定手指數',N(-1)),SETV('確定猜拳號',N(0)),SETV('確定指型',S('-----')),
  SETV('上次指型',S('-----')),SETV('穩定起點',TIMER),
  REPL(N(1),'指狀態',N(0),{note:'手指燈也熄掉（2～5 項同理）'})
],

/* ---------- 4 主偵測迴圈 ---------- */
main:[
  FLAG(),
  {k:'stack',c:'looks',t:['隱藏']},
  {k:'stack',c:'ext',t:['將攝影機',{d:'鏡像開啟'}]},
  {k:'stack',c:'ext',t:['將攝影機的透明度設為',N(55)]},
  {k:'stack',c:'ext',t:['將倍率設為',{d:'0.75'}]},
  SETV('穩定門檻',N(0.15)),SETV('餘裕比例',N(0.08)),
  SETV('拇指比例',N(1.35)),SETV('掉格容忍',N(0.4)),
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'ce',c:'control',t:['如果',AND(B(HX(1),'>',N(-250)),B(HY(10),'>',HY(1))),'那麼'],hl:1,
     note:'兩道守門：\n① 偵測不到手時積木回傳「空白」，x > −250 擋掉\n② 中指第三關節比手腕高 ＝ 手有立起來',body:[
      SETV('看得到手',N(1)),
      SETV('沒手起點',TIMER,{note:'每抓到一次就把「沒手」的碼錶歸零'}),
      CALL(['數手指']),CALL(['認猜拳']),CALL(['穩定判斷'])
    ],body2:[
      SETV('看得到手',N(0)),
      {k:'c',c:'control',t:['如果',B(OP(TIMER,'-',V('沒手起點')),'>',V('掉格容忍')),'那麼'],hl:1,
       note:'★ 抓不到手時不要馬上清空 ★\n攝影機每隔幾格就會漏掉一格，\n一漏掉就清空的話，玩家會覺得怎麼比都沒反應。\n要連續 0.4 秒都抓不到，才當作手真的離開了',body:[
        CALL(['清空手勢'])
      ]}
    ]},
    WAIT(N(0.02),{note:'讓電腦喘口氣，不要把 CPU 吃滿'})
  ]}
],

/* ---------- 4b 題目卡：造型換成 ---------- */
cardBlk:[
  WHEN('出題',{note:'角色：題目卡'}),
  COS(JOIN(S('數'),V('題目')),{hl:1,
    note:'★ 很容易踩的雷 ★\n直接寫「造型換成 (題目)」看起來很直覺，\n但輸入是「數字」時，Scratch 會把它當成\n「第幾個造型」而不是造型的名稱 ——\n題目是 3 就換到第 3 個造型（造型「2」），\n畫面上的數字永遠少 1。\n用「字串組合」把它變成文字就正確了'}),
  {k:'stack',c:'motion',t:['定位到 x:',N(0),'y:',N(62)]},
  {k:'stack',c:'looks',t:['尺寸設為',N(46)]},
  {k:'stack',c:'looks',t:['顯示']},
  {k:'c',c:'control',t:['重複',N(8),'次'],loop:1,note:'卡片彈出來的小動畫',body:[
    {k:'stack',c:'looks',t:['尺寸改變',N(4)]}
  ]}
],

/* ---------- 5 數字關 ---------- */
numGame:[
  WHEN('開始數字',{note:'舞台'}),
  SETV('模式',S('數字')),SETV('分數',N(0)),SETV('題號',N(0)),SETV('上一題',N(-1)),
  MSG('進入數字',1),WAIT(N(2.3)),
  {k:'c',c:'control',t:['重複',N(8),'次'],loop:1,body:[
    CHV('題號',N(1)),
    SETV('題目',V('上一題')),
    {k:'c',c:'control',t:['重複直到',AND(NOT(B(V('題目'),'=',V('上一題'))),NOT(B(V('題目'),'=',V('確定手指數'))))],loop:1,
     hl:1,note:'避開「上一題」和「玩家現在比的數字」，\n玩家才一定要換手勢',body:[
      SETV('題目',RND(0,5))
    ]},
    SETV('上一題',V('題目')),
    MSG('出題',1),
    SETV('計時起點',TIMER),
    {k:'c',c:'control',t:['重複直到',OR(B(V('確定手指數'),'=',V('題目')),B(TIMER,'>',OP(V('計時起點'),'+',N(8))))],loop:1,
     note:'比對了就往下走；超過 8 秒就算時間到',body:[]},
    {k:'ce',c:'control',t:['如果',B(V('確定手指數'),'=',V('題目')),'那麼'],
     body:[CHV('分數',N(1)),MSG('答對',1)],body2:[MSG('時間到',1)]},
    WAIT(N(1.3))
  ]},
  MSG('結算',1),WAIT(N(2.6)),MSG('回選單')
],

/* ---------- 6 猜拳關 ---------- */
rpsGame:[
  WHEN('開始猜拳',{note:'舞台'}),
  SETV('模式',S('猜拳')),SETV('分數',N(0)),SETV('回合',N(0)),SETV('空手次數',N(0)),
  MSG('進入猜拳',1),WAIT(N(2.3)),
  {k:'c',c:'control',t:['重複直到',OR(B(V('回合'),'>',N(4)),B(V('空手次數'),'>',N(5)))],loop:1,body:[
    MSG('準備',1),WAIT(N(0.4)),
    MSG('倒數',1,{note:'剪刀 → 石頭 → 布 → 出拳！'}),
    SETV('玩家號',V('確定猜拳號'),{hl:1,note:'喊完才抓，抓的是「確定」的值'}),
    {k:'ce',c:'control',t:['如果',B(V('玩家號'),'=',N(0)),'那麼'],body:[
      CHV('空手次數',N(1)),
      {k:'ce',c:'control',t:['如果',B(V('看得到手'),'=',N(1)),'那麼'],body:[MSG('看不懂',1)],body2:[MSG('找不到手',1)]},
      WAIT(N(1.4))
    ],body2:[
      SETV('空手次數',N(0)),CHV('回合',N(1)),
      SETV('電腦號',RND(1,3)),
      MSG('出拳',1),
      {k:'ce',c:'control',t:['如果',B(V('玩家號'),'=',V('電腦號')),'那麼'],body:[SETV('結果',S('平手'))],body2:[
        {k:'ce',c:'control',t:['如果',B(OP(MOD(V('玩家號'),N(3)),'+',N(1)),'=',V('電腦號')),'那麼'],hl:1,
         note:'我的編號 ÷3 的餘數 ＋1 ＝ 對方編號 → 我贏\n1→2 石頭贏剪刀　2→3 剪刀贏布　3→1 布贏石頭',
         body:[SETV('結果',S('你贏了')),CHV('分數',N(1))],body2:[SETV('結果',S('你輸了'))]}
      ]},
      MSG('顯示結果',1),WAIT(N(1.6))
    ]}
  ]},
  MSG('結算',1),WAIT(N(2.6)),MSG('回選單')
],

/* ---------- 7 手指燈 ---------- */
lamp:[
  FLAG({note:'角色：手指燈'}),
  {k:'stack',c:'looks',t:['隱藏']},SETV('編號',N(0)),
  {k:'c',c:'control',t:['重複',N(5),'次'],loop:1,body:[
    CHV('編號',N(1)),
    {k:'stack',c:'control',t:['建立','分身']}
  ]},
  {k:'hat',c:'control',t:['當分身產生']},
  {k:'stack',c:'motion',t:['定位到 x:',OP(OP(V('編號'),'×',N(72)),'-',N(216)),'y:',N(-152)],
   note:'編號 1～5 → x = −144, −72, 0, 72, 144'},
  {k:'stack',c:'looks',t:['尺寸設為',N(70)]},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'ce',c:'control',t:['如果',OR(B(V('模式'),'=',S('數字')),B(V('模式'),'=',S('猜拳'))),'那麼'],body:[
      {k:'stack',c:'looks',t:['顯示']},
      COS(JOIN(ITEM(V('編號'),'指名'),ITEM(V('編號'),'指狀態')),{hl:1,
        note:'造型名稱直接用組合字串：\n「食」＋「1」＝ 造型「食1」'})
    ],body2:[{k:'stack',c:'looks',t:['隱藏']}]}
  ]}
],

/* ---------- 8 鍵盤模式 ---------- */
keyboard:[
  {k:'def',t:['讀鍵盤'],note:'沒有攝影機也能上課'},
  SETV('看得到手',N(1)),
  {k:'c',c:'control',t:['如果',{b:{c:'sensing',t:[{d:'0'},'鍵被按下？']}},'那麼'],body:[
    SETV('確定手指數',N(0)),SETV('確定猜拳號',N(1)),SETV('確定指型',S('00000'))
  ]},
  {k:'c',c:'control',t:['如果',{b:{c:'sensing',t:[{d:'2'},'鍵被按下？']}},'那麼'],body:[
    SETV('確定手指數',N(2)),SETV('確定猜拳號',N(2)),SETV('確定指型',S('01100'))
  ]},
  {k:'stack',c:'control',t:['（1、3、4、5 同理）']},
  KEY('k',{note:'切換開關：1 − 鍵盤模式'}),
  SETV('鍵盤模式',OP(N(1),'-',V('鍵盤模式')))
]
};
