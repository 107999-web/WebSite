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

/* ---------- 小幫手 ---------- */
var PART={2:'鼻尖 (2)',11:'額頭頂端 (11)',153:'下巴 (153)',235:'臉部右緣 (235)',455:'臉部左緣 (455)'};
function V(n){return {r:{c:'variables',t:[n]}};}
function LS(n){return {r:{c:'listtone',t:[n]}};}
function FX(i){return {r:{c:'ext',t:['第',{d:'1'},'人的',{d:PART[i]},'的 x 座標']}};}
function FY(i){return {r:{c:'ext',t:['第',{d:'1'},'人的',{d:PART[i]},'的 y 座標']}};}
var FCNT={r:{c:'ext',t:['人數']}};
function OP(a,o,b){return {r:{c:'operators',t:[a,o,b]}};}
function B(a,o,b){return {b:{c:'operators',t:[a,o,b]}};}
function AND(a,b){return {b:{c:'operators',t:[a,'且',b]}};}
function OR(a,b){return {b:{c:'operators',t:[a,'或',b]}};}
function MATH(f,x){return {r:{c:'operators',t:[{d:f},'數值',x]}};}
function RND(a,b){return {r:{c:'operators',t:['隨機取數',N(a),'到',N(b)]}};}
function ITEM(i,l){return {r:{c:'listtone',t:['第',i,'項的',{d:l}]}};}
function LEN(l){return {r:{c:'listtone',t:[{d:l},'的長度']}};}
function LADD(x,l,o){var b={k:'stack',c:'listtone',t:['添加',x,'到',{d:l}]};for(var k in o)b[k]=o[k];return b;}
function LCLR(l,o){var b={k:'stack',c:'listtone',t:['刪除',{d:l},'的全部項目']};for(var k in o)b[k]=o[k];return b;}
function SETV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'設為',x]};for(var k in o)b[k]=o[k];return b;}
function CHV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'改變',x]};for(var k in o)b[k]=o[k];return b;}
function MSG(n,w,o){var b={k:'stack',c:'events',t:['廣播訊息',{d:n}].concat(w?['並等待']:[])};for(var k in o)b[k]=o[k];return b;}
function WHEN(n,o){var b={k:'hat',c:'events',t:['當收到訊息',{d:n}]};for(var k in o)b[k]=o[k];return b;}
function FLAG(o){var b={k:'hat',c:'events',t:['當',{flag:1},'被點擊']};for(var k in o)b[k]=o[k];return b;}
function COS(x,o){var b={k:'stack',c:'looks',t:['造型換成',x]};for(var k in o)b[k]=o[k];return b;}
function SAY(t,s){return {k:'stack',c:'looks',t:['說出',{s:t},'持續',{n:s},'秒']};}
function CALL(t,o){var b={k:'stack',c:'myblocks',t:t};for(var k in o)b[k]=o[k];return b;}
function WAIT(x,o){var b={k:'stack',c:'control',t:['等待',x,'秒']};for(var k in o)b[k]=o[k];return b;}
function S(n){return {s:n};}
function N(n){return {n:n};}
var TIMER={r:{c:'sensing',t:['計時器']}};

var SCRIPTS = {

/* ---------- 先量自己的數字 ---------- */
setupTest:[
  FLAG(),
  {k:'stack',c:'ext',t:['將攝影機',{d:'鏡像開啟'}],hl:1,note:'要選「像照鏡子」的那一個（英文值 on）。\n選到不鏡像的模式，x 座標會整個變號，左右就會相反'},
  {k:'stack',c:'ext',t:['將攝影機的透明度設為',N(70)]},
  {k:'stack',c:'ext',t:['將倍率設為',{d:'0.75'}]},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'c',c:'control',t:['如果',B(FCNT,'>',N(0)),'那麼'],hl:1,note:'先用「人數」確認看得到臉',body:[
      SETV('臉寬',MATH('絕對值',OP(FX(455),'-',FX(235)))),
      SETV('臉中心x',OP(OP(FX(455),'+',FX(235)),'/',N(2))),
      SETV('轉頭比',OP(OP(OP(FX(2),'-',V('臉中心x')),'/',V('臉寬')),'×',N(100)),{hl:1,note:'把頭轉左右，看這個數字怎麼變'})
    ]}
  ]}
],

/* ---------- 定義：辨識動作 ---------- */
classify:[
  {k:'def',t:['辨識動作'],note:'右鍵 → 編輯 → 勾選「執行時不重新整理畫面」'},
  {k:'ce',c:'control',t:['如果',B(FCNT,'>',N(0)),'那麼'],hl:1,note:'偵測不到臉時座標積木回傳空白，一定要先擋',body:[
    SETV('臉寬',MATH('絕對值',OP(FX(455),'-',FX(235))),{note:'臉部左緣 − 臉部右緣'}),
    SETV('臉高',MATH('絕對值',OP(FY(11),'-',FY(153))),{note:'額頭頂端 − 下巴'}),
    {k:'ce',c:'control',t:['如果',B(V('臉寬'),'>',N(10)),'那麼'],note:'臉太小或抓錯時不要拿去除',body:[
      SETV('臉中心x',OP(OP(FX(455),'+',FX(235)),'/',N(2))),
      SETV('臉中心y',OP(OP(FY(11),'+',FY(153)),'/',N(2))),
      SETV('轉頭比',OP(OP(OP(FX(2),'-',V('臉中心x')),'/',V('臉寬')),'×',N(100)),{hl:1,note:'鼻尖偏離臉中心「臉寬的百分之幾」'}),
      {k:'c',c:'control',t:['如果',B(V('左右相反'),'=',N(1)),'那麼'],hl:1,
       note:'保險開關：如果玩起來左右相反，\n把「左右相反」改成 1 就好',body:[
        SETV('轉頭比',OP(N(0),'-',V('轉頭比')))
      ]},
      SETV('點頭比',OP(OP(OP(V('臉中心y'),'-',FY(2)),'/',V('臉高')),'×',N(100)),{hl:1,note:'低頭時鼻尖會跑到臉中心下面，數字變大'}),
      {k:'ce',c:'control',t:['如果',B(V('轉頭比'),'<',OP(N(0),'-',V('轉頭門檻'))),'那麼'],hl:1,note:'① 向左轉頭 → 木鼓',body:[
        SETV('動作',S('左'))
      ],body2:[
        {k:'ce',c:'control',t:['如果',B(V('轉頭比'),'>',V('轉頭門檻')),'那麼'],hl:1,note:'② 向右轉頭 → 沙鈴',body:[
          SETV('動作',S('右'))
        ],body2:[
          {k:'ce',c:'control',t:['如果',B(V('點頭比'),'>',V('點頭門檻')),'那麼'],hl:1,note:'③ 點頭 → 竹鐘（先排除左右，臉在正中間才判斷）',body:[
            SETV('動作',S('點頭'))
          ],body2:[
            SETV('動作',S('預備'),{note:'臉朝正前方＝預備姿勢'})
          ]}
        ]}
      ]}
    ],body2:[SETV('動作',S('無'))]}
  ],body2:[
    SETV('動作',S('無'))
  ]}
],

/* ---------- 偵測主迴圈：避免重複判定 ---------- */
detectLoop:[
  FLAG({note:'角色：動作牌'}),
  SETV('可以觸發',N(0)),
  SETV('動作',S('無')),
  {k:'forever',c:'control',t:['重複無限次'],body:[
    CALL(['辨識動作']),
    COS(V('動作'),{note:'牌子直接顯示電腦現在看到什麼'}),
    {k:'c',c:'control',t:['如果',B(V('動作'),'=',S('預備')),'那麼'],hl:1,note:'臉轉回正前方 → 才能再做一次動作',body:[
      SETV('可以觸發',N(1))
    ]},
    {k:'c',c:'control',t:['如果',AND(B(V('可以觸發'),'=',N(1)),B(V('動作'),'=',S('左'))),'那麼'],hl:1,body:[
      SETV('可以觸發',N(0)),CALL(['送出動作',N(1)])
    ]},
    {k:'c',c:'control',t:['如果',AND(B(V('可以觸發'),'=',N(1)),B(V('動作'),'=',S('點頭'))),'那麼'],body:[
      SETV('可以觸發',N(0)),CALL(['送出動作',N(2)])
    ]},
    {k:'c',c:'control',t:['如果',AND(B(V('可以觸發'),'=',N(1)),B(V('動作'),'=',S('右'))),'那麼'],body:[
      SETV('可以觸發',N(0)),CALL(['送出動作',N(3)])
    ]}
  ]}
],
sendAction:[
  {k:'def',t:['送出動作',{p:'編號'}]},
  {k:'c',c:'control',t:['如果',B(V('階段'),'=',S('等待')),'那麼'],hl:1,note:'只有輪到玩家的時候才算數',body:[
    SETV('玩家答案',{p:'編號'})
  ]},
  {k:'c',c:'control',t:['如果',B(V('階段'),'=',S('開場')),'那麼'],note:'開場可以先試做，只會發出聲音',body:[
    SETV('目前音',{p:'編號'}),MSG('試音')
  ]}
],
keys:[
  {k:'hat',c:'events',t:['當',{d:'向左'},'鍵被按下'],note:'沒有攝影機也能測試：← 木鼓、↓ 竹鐘、→ 沙鈴'},
  CALL(['送出動作',N(1)])
],

/* ---------- 亂數節奏產生 ---------- */
makeSeq:[
  {k:'def',t:['出題'],note:'角色：舞台；勾選「執行時不重新整理畫面」'},
  {k:'ce',c:'control',t:['如果',B(V('關卡'),'=',N(1)),'那麼'],hl:1,note:'第一關：每輪重新出題',body:[
    LCLR('節奏'),
    {k:'c',c:'control',t:['重複',RND(3,5),'次'],loop:1,hl:1,note:'亂數決定這輪有幾個動作（3～5）',body:[
      LADD(RND(1,3),'節奏',{note:'1 = 向左轉頭　2 = 點頭　3 = 向右轉頭'})
    ]}
  ],body2:[
    {k:'ce',c:'control',t:['如果',B(LEN('節奏'),'=',N(0)),'那麼'],note:'剛進第二關：先給 3 個',body:[
      {k:'c',c:'control',t:['重複',N(3),'次'],loop:1,body:[LADD(RND(1,3),'節奏')]}
    ],body2:[
      LADD(RND(1,3),'節奏',{hl:1,note:'接龍：在最後面「再加一個」，前面的都不動'})
    ]}
  ]},
  SETV('節奏長度',LEN('節奏'))
],

/* ---------- 播放提示 ---------- */
playPrompt:[
  {k:'def',t:['播放提示']},
  SETV('階段',S('提示')),
  SETV('播放第幾個',N(0)),
  WAIT(N(0.6)),
  {k:'c',c:'control',t:['重複',V('節奏長度'),'次'],loop:1,body:[
    CHV('播放第幾個',N(1)),
    SETV('目前音',ITEM(V('播放第幾個'),'節奏'),{hl:1,note:'把清單的第 1、2、3… 個拿出來'}),
    MSG('亮起',true,{note:'對應的樂器亮起、發出聲音，亮的時間 = 提示間隔'}),
    WAIT(OP(V('提示間隔'),'×',N(0.45)),{note:'中間的休息'})
  ]}
],

/* ---------- 等待玩家 ---------- */
waitPlayer:[
  {k:'def',t:['等待玩家']},
  SETV('階段',S('等待')),
  SETV('玩家第幾個',N(0)),
  SETV('這輪正確',N(1)),
  SETV('玩家答案',N(0)),
  SETV('可以觸發',N(0),{note:'要先把臉轉正，才能開始做第一個動作'}),
  LCLR('玩家動作'),
  {k:'c',c:'control',t:['重複直到',OR(B(V('玩家第幾個'),'=',V('節奏長度')),B(V('這輪正確'),'=',N(0)))],loop:1,body:[
    {k:'stack',c:'control',t:['等待直到',B(V('玩家答案'),'>',N(0))]},
    SETV('這次動作',V('玩家答案'),{hl:1,note:'先搬到「這次動作」'}),
    SETV('玩家答案',N(0),{hl:1,note:'⚠️ 立刻歸零！等動畫播完才歸零的話，玩家在動畫期間做的下一個動作會被一起清掉'}),
    CHV('玩家第幾個',N(1)),
    LADD(V('這次動作'),'玩家動作',{note:'把玩家做的動作記到清單裡'}),
    SETV('目前音',V('這次動作')),
    {k:'ce',c:'control',t:['如果',B(V('這次動作'),'=',ITEM(V('玩家第幾個'),'節奏')),'那麼'],hl:1,note:'和節奏的同一個位置比對',body:[
      MSG('打對了',true,{note:'火堆竄高一截、樂器響一聲'})
    ],body2:[
      SETV('這輪正確',N(0),{note:'錯一個就結束這一輪，不用做完'})
    ]}
  ]}
],

/* ---------- 主流程 ---------- */
main:[
  FLAG({note:'角色：舞台'}),
  CALL(['（分數 0、命 3、關卡 1、提示間隔 0.9、門檻…）']),
  SETV('階段',S('開場')),
  MSG('開場',true,{note:'精靈說明玩法，這時候可以先試做三個動作'}),
  {k:'stack',c:'control',t:['等待直到',OR(B(V('動作'),'=',S('預備')),{b:{c:'sensing',t:[{d:'空白'},'鍵被按下？']}})],note:'把臉擺正就開始'},
  MSG('關卡卡',true),
  {k:'c',c:'control',t:['重複直到',OR(B(V('命'),'=',N(0)),B(V('通關'),'=',N(1)))],loop:1,hl:1,note:'遊戲結束條件：命歸零，或第二關接到 10 個',body:[
    CHV('輪數',N(1)),
    SETV('火高',N(0)),MSG('火堆變化'),
    CALL(['出題']),
    MSG('新回合',true),
    CALL(['播放提示']),
    CALL(['等待玩家']),
    SETV('階段',S('結果')),
    {k:'ce',c:'control',t:['如果',B(V('這輪正確'),'=',N(1)),'那麼'],body:[
      CALL(['算分數與過關'])
    ],body2:[
      CHV('命',N(-1),{hl:1,note:'答錯扣一把火把'}),
      SETV('連續正確',N(0)),SETV('火光全開',N(0)),SETV('火高',N(0)),
      MSG('答錯了',true)
    ]}
  ]},
  {k:'ce',c:'control',t:['如果',B(V('通關'),'=',N(1)),'那麼'],body:[MSG('通關了')],body2:[MSG('結束了')]}
],
score:[
  {k:'def',t:['算分數與過關']},
  CHV('連續正確',N(1)),
  {k:'c',c:'control',t:['如果',B(V('連續正確'),'>',N(2)),'那麼'],hl:1,note:'連續 3 輪不出錯 → 火光全開',body:[
    SETV('火光全開',N(1))
  ]},
  SETV('本輪得分',OP(N(10),'×',V('節奏長度')),{hl:1,note:'每輪得分 ＝ 10 × 動作數'}),
  {k:'c',c:'control',t:['如果',B(V('火光全開'),'=',N(1)),'那麼'],body:[
    SETV('本輪得分',OP(V('本輪得分'),'×',N(2)),{hl:1,note:'火光全開狀態：該輪 ×2'})
  ]},
  CHV('分數',V('本輪得分')),
  SETV('提示間隔',OP(V('提示間隔'),'-',N(0.04)),{note:'難度：每答對一輪，提示變快 40 毫秒'}),
  {k:'c',c:'control',t:['如果',B(V('提示間隔'),'<',N(0.25)),'那麼'],body:[SETV('提示間隔',N(0.25),{note:'下限 250 毫秒'})]},
  MSG('答對了',true),
  {k:'ce',c:'control',t:['如果',B(V('關卡'),'=',N(1)),'那麼'],body:[
    {k:'c',c:'control',t:['如果',B(V('連續正確'),'>',N(2)),'那麼'],hl:1,note:'第一關通過條件：連續 3 輪完全正確',body:[
      SETV('關卡',N(2)),SETV('連續正確',N(0)),SETV('火光全開',N(0)),
      LCLR('節奏',{note:'第二關從頭接起'}),
      MSG('過關了',true),MSG('關卡卡',true)
    ]}
  ],body2:[
    {k:'c',c:'control',t:['如果',B(V('節奏長度'),'>',N(9)),'那麼'],hl:1,note:'第二關通過條件：接到 10 個並且答對',body:[
      SETV('通關',N(1))
    ]}
  ]}
],

/* ---------- 樂器與火堆 ---------- */
totem:[
  FLAG({note:'角色：木鼓（竹鐘、沙鈴一模一樣，只改編號）'}),
  SETV('我的編號',N(1),{hl:1,note:'僅適用當前角色：木鼓 1、竹鐘 2、沙鈴 3'}),
  COS({d:'暗'}),
  {k:'hat',c:'events',t:['當收到訊息',{d:'亮起'}]},
  {k:'c',c:'control',t:['如果',B(V('我的編號'),'=',V('目前音')),'那麼'],hl:1,note:'只有被點到的樂器才亮',body:[
    COS({d:'亮'}),
    {k:'stack',c:'sound',t:['播放音效',{d:'木鼓'}]},
    {k:'stack',c:'looks',t:['尺寸改變',N(8)]},
    WAIT(V('提示間隔')),
    {k:'stack',c:'looks',t:['尺寸改變',N(-8)]},
    COS({d:'暗'})
  ]}
],
fireBlk:[
  WHEN('火堆變化',{note:'角色：火堆'}),
  {k:'ce',c:'control',t:['如果',B(V('火高'),'<',N(1)),'那麼'],body:[COS({d:'暗'})],body2:[
    {k:'ce',c:'control',t:['如果',B(V('火高'),'<',N(2)),'那麼'],body:[COS({d:'小'})],body2:[
      {k:'ce',c:'control',t:['如果',B(V('火高'),'<',N(3)),'那麼'],body:[COS({d:'中'})],body2:[
        {k:'ce',c:'control',t:['如果',B(V('火光全開'),'=',N(1)),'那麼'],hl:1,body:[COS({d:'全開'})],body2:[COS({d:'大'})]}
      ]}
    ]}
  ]},
  {k:'hat',c:'events',t:['當收到訊息',{d:'打對了'}]},
  {k:'c',c:'control',t:['如果',B(V('火高'),'<',N(4)),'那麼'],body:[CHV('火高',N(1),{hl:1,note:'每做對一個動作，火堆竄高一截'})]},
  MSG('火堆變化')
]
};
