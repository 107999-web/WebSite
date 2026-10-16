/* =========================================================
   blk.js — 把資料畫成 Scratch 積木（只負責「看」，不會執行）
   積木文字依 Scratch 官方繁體中文翻譯（scratch-l10n zh-tw）
   Handpose2Scratch 的積木沿用本校 Handpose2Scratch 教材的中文說法
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
var LM={1:'手腕',9:'食指尖',21:'小指尖'};
function V(n){return {r:{c:'variables',t:[n]}};}
function HX(i){return {r:{c:'ext',t:[{d:LM[i]+' ('+i+')'},'的 x 座標']}};}
function HY(i){return {r:{c:'ext',t:[{d:LM[i]+' ('+i+')'},'的 y 座標']}};}
function OP(a,o,b){return {r:{c:'operators',t:[a,o,b]}};}
function B(a,o,b){return {b:{c:'operators',t:[a,o,b]}};}
function AND(a,b){return {b:{c:'operators',t:[a,'且',b]}};}
function OR(a,b){return {b:{c:'operators',t:[a,'或',b]}};}
function NOT(a){return {b:{c:'operators',t:[a,'不成立']}};}
function MATH(f,x){return {r:{c:'operators',t:[{d:f},'數值',x]}};}
function JOIN(a,b){return {r:{c:'operators',t:['字串組合',a,b]}};}
function SETV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'設為',x]};for(var k in o)b[k]=o[k];return b;}
function CHV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'改變',x]};for(var k in o)b[k]=o[k];return b;}
function MSG(n,w,o){var b={k:'stack',c:'events',t:['廣播訊息',{d:n}].concat(w?['並等待']:[])};for(var k in o)b[k]=o[k];return b;}
function WHEN(n,o){var b={k:'hat',c:'events',t:['當收到訊息',{d:n}]};for(var k in o)b[k]=o[k];return b;}
function FLAG(o){var b={k:'hat',c:'events',t:['當',{flag:1},'被點擊']};for(var k in o)b[k]=o[k];return b;}
function COS(x,o){var b={k:'stack',c:'looks',t:['造型換成',x]};for(var k in o)b[k]=o[k];return b;}
function SAY(t,s){return {k:'stack',c:'looks',t:['說出',{s:t},'持續',{n:s},'秒']};}
function S(n){return {s:n};}
function N(n){return {n:n};}
var TIMER={r:{c:'sensing',t:['計時器']}};
function RND(a,b){return {r:{c:'operators',t:['隨機取數',N(a),'到',N(b)]}};}

var SCRIPTS = {

/* ---------- 測試：看得到手嗎？ ---------- */
setupTest:[
  FLAG(),
  {k:'stack',c:'ext',t:['將攝影機',{d:'開啟'}],note:'像照鏡子，你往右它也往右'},
  {k:'stack',c:'ext',t:['將攝影機的透明度設為',N(60)]},
  {k:'stack',c:'ext',t:['將倍率設為',{d:'0.75'}]},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    SETV('手腕y',HY(1),{hl:1}),
    {k:'stack',c:'looks',t:['說出',V('手腕y')],note:'手舉高 → 數字變大；手放低 → 數字變小'}
  ]}
],

/* ---------- 三個動作的辨識 ---------- */
classify:[
  {k:'def',t:['辨識手勢'],note:'右鍵 → 編輯 → 勾選「執行時不重新整理畫面」'},
  {k:'ce',c:'control',t:['如果',B(HX(1),'>',N(-250)),'那麼'],note:'先確認看得到手（偵測不到時積木是空白）',body:[
    SETV('手腕x',HX(1)),
    SETV('手腕y',HY(1)),
    SETV('張開幅度',MATH('絕對值',OP(HX(9),'-',HX(21))),{hl:1,note:'食指尖與小指尖差多遠＝手張開的寬度'}),
    {k:'ce',c:'control',t:['如果',B(V('手腕y'),'<',N(-40)),'那麼'],hl:1,note:'① 手放低＝預備姿勢',body:[
      SETV('手勢',S('預備'))
    ],body2:[
      {k:'ce',c:'control',t:['如果',B(V('手腕y'),'>',N(80)),'那麼'],hl:1,note:'② 手舉高＝種樹',body:[
        SETV('手勢',S('舉高'))
      ],body2:[
        {k:'ce',c:'control',t:['如果',B(V('手腕x'),'<',N(-80)),'那麼'],hl:1,note:'③ 手在左邊（揮動的前半段）',body:[
          SETV('手勢',S('左'))
        ],body2:[
          {k:'ce',c:'control',t:['如果',B(V('手腕x'),'>',N(80)),'那麼'],hl:1,note:'④ 手在右邊（揮動的後半段）',body:[SETV('手勢',S('右'))],body2:[
            {k:'ce',c:'control',t:['如果',B(V('張開幅度'),'>',N(90)),'那麼'],hl:1,note:'⑤ 手在中間又張開手掌＝擋住廢水',body:[SETV('手勢',S('張開'))],body2:[SETV('手勢',S('中間'))]}
          ]}
        ]}
      ]}
    ]}
  ],body2:[
    SETV('手勢',S('無'))
  ]}
],

/* ---------- 預備姿勢與觸發 ---------- */
detectLoop:[
  FLAG({note:'角色：手勢偵測'}),
  SETV('可以觸發',N(0)),
  SETV('揮動階段',N(0)),
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'stack',c:'myblocks',t:['辨識手勢']},
    COS(V('手勢'),{note:'畫面下方的牌子顯示電腦看到什麼'}),
    {k:'c',c:'control',t:['如果',B(V('手勢'),'=',S('預備')),'那麼'],hl:1,note:'回到預備姿勢 → 才能再做一次動作。\n注意：這裡「不要」把揮動階段歸零',body:[
      SETV('可以觸發',N(1))
    ]},
    {k:'c',c:'control',t:['如果',AND(B(V('可以觸發'),'=',N(1)),B(V('手勢'),'=',S('左'))),'那麼'],body:[
      SETV('揮動階段',N(1),{note:'到左邊了'}),SETV('揮動時間',TIMER,{note:'記下現在幾秒，用來算有沒有超時'})
    ]},
    {k:'c',c:'control',t:['如果',AND(B(V('可以觸發'),'=',N(1)),AND(B(V('揮動階段'),'=',N(1)),B(V('手勢'),'=',S('右')))),'那麼'],hl:1,
     note:'再揮到右邊 → 撈起一件垃圾',body:[
      SETV('可以觸發',N(0)),SETV('揮動階段',N(0)),MSG('撈垃圾')
    ]},
    {k:'c',c:'control',t:['如果',AND(B(V('揮動階段'),'=',N(1)),B(TIMER,'>',OP(V('揮動時間'),'+',N(2)))),'那麼'],hl:1,
     note:'超過 2 秒還沒揮到右邊 → 這次揮動作廢',body:[
      SETV('揮動階段',N(0))
    ]},
    {k:'c',c:'control',t:['如果',AND(B(V('可以觸發'),'=',N(1)),AND(B(V('揮動階段'),'=',N(0)),B(V('手勢'),'=',S('舉高')))),'那麼'],hl:1,
     note:'揮動中（揮動階段 ＝ 1）不接受種樹，\n免得揮手畫弧線時被誤判',body:[
      SETV('可以觸發',N(0)),MSG('種樹')
    ]},
    {k:'c',c:'control',t:['如果',AND(B(V('可以觸發'),'=',N(1)),AND(B(V('揮動階段'),'=',N(0)),B(V('手勢'),'=',S('張開')))),'那麼'],body:[
      SETV('可以觸發',N(0)),MSG('擋住')
    ]}
  ]}
],
keys:[
  {k:'hat',c:'events',t:['當',{d:'向上'},'鍵被按下'],note:'← 撈垃圾、B 擋住也各做一組，沒有攝影機也能測試'},
  MSG('種樹')
],

/* ---------- 主流程 ---------- */
main:[
  FLAG({note:'角色：舞台'}),
  {k:'stack',c:'myblocks',t:['（設定水質 45、垃圾 5、遮蔭 1、攝影機…）']},
  MSG('重畫'),
  MSG('開場',true,{note:'青蛙用自己的視角說故事'}),
  MSG('說明',true),
  {k:'stack',c:'control',t:['等待直到',OR(B(V('手勢'),'=',S('預備')),{b:{c:'sensing',t:[{d:'空白'},'鍵被按下？']}})],note:'把手放低就開始'},
  SETV('階段',S('行動')),
  {k:'stack',c:'myblocks',t:['抽事件回合'],hl:1,note:'先抽好這一局哪幾個回合會有事件'},
  {k:'c',c:'control',t:['重複',N(4),'次'],loop:1,body:[
    CHV('回合',N(1)),
    MSG('回合開始',true),
    SETV('開始時間',TIMER),
    {k:'c',c:'control',t:['如果',OR(B(V('回合'),'=',V('偷倒回合A')),B(V('回合'),'=',V('偷倒回合B'))),'那麼'],hl:1,note:'抽到的兩個回合會有人偷倒廢水',body:[
      {k:'stack',c:'control',t:['等待直到',B(TIMER,'>',OP(V('開始時間'),'+',N(5)))]},
      MSG('偷倒開始',true)
    ]},
    {k:'c',c:'control',t:['如果',B(V('回合'),'=',V('垃圾回合')),'那麼'],hl:1,note:'另一個回合有人亂丟垃圾',body:[
      {k:'stack',c:'control',t:['等待直到',B(TIMER,'>',OP(V('開始時間'),'+',N(5)))]},
      MSG('亂丟垃圾',true)
    ]},
    {k:'stack',c:'control',t:['等待直到',B(TIMER,'>',OP(V('開始時間'),'+',N(12)))],note:'每回合 12 秒'},
    MSG('回合結束',true)
  ]},
  SETV('階段',S('結局')),
  {k:'ce',c:'control',t:['如果',AND(B(V('水質'),'>',N(69)),B(V('垃圾'),'<',N(3))),'那麼'],hl:1,note:'水質 ≥ 70 且 垃圾 ≤ 2',body:[
    SETV('結局',S('好'))
  ],body2:[
    {k:'ce',c:'control',t:['如果',B(V('水質'),'<',N(40)),'那麼'],body:[SETV('結局',S('壞'))],body2:[SETV('結局',S('普通'))]}
  ]},
  MSG('結局')
],

/* ---------- 抽事件回合（隨機） ---------- */
pickRounds:[
  {k:'def',t:['抽事件回合'],note:'角色：舞台；勾選「執行時不重新整理畫面」'},
  SETV('偷倒回合A',RND(1,4),{hl:1,note:'第一個偷倒的回合：1～4 隨機'}),
  SETV('偷倒回合B',RND(1,4)),
  {k:'c',c:'control',t:['重複直到',NOT(B(V('偷倒回合B'),'=',V('偷倒回合A')))],loop:1,hl:1,
   note:'抽到跟 A 一樣就重抽，兩個回合才不會撞在一起',body:[
    SETV('偷倒回合B',RND(1,4))
  ]},
  SETV('垃圾回合',RND(1,4)),
  {k:'c',c:'control',t:['重複直到',AND(NOT(B(V('垃圾回合'),'=',V('偷倒回合A'))),NOT(B(V('垃圾回合'),'=',V('偷倒回合B'))))],loop:1,
   note:'亂丟垃圾的回合也要跟前面兩個不一樣',body:[
    SETV('垃圾回合',RND(1,4))
  ]}
],

/* ---------- 三個動作的結果 ---------- */
clamp:[
  {k:'def',t:['整理水質'],note:'水質只能是 0～100'},
  {k:'c',c:'control',t:['如果',B(V('水質'),'>',N(100)),'那麼'],body:[SETV('水質',N(100))]},
  {k:'c',c:'control',t:['如果',B(V('水質'),'<',N(0)),'那麼'],body:[SETV('水質',N(0))]}
],
actPick:[
  WHEN('撈垃圾',{note:'角色：舞台'}),
  {k:'c',c:'control',t:['如果',B(V('階段'),'=',S('行動')),'那麼'],body:[
    {k:'ce',c:'control',t:['如果',B(V('垃圾'),'>',N(0)),'那麼'],body:[
      CHV('垃圾',N(-1)),CHV('水質',N(5),{hl:1}),
      {k:'stack',c:'myblocks',t:['整理水質']},
      MSG('重畫')
    ],body2:[
      MSG('沒垃圾了',false,{hl:1,note:'已經撈乾淨了也要回話，玩家才知道動作有被認出來'})
    ]}
  ]}
],
actTree:[
  WHEN('種樹'),
  {k:'c',c:'control',t:['如果',B(V('階段'),'=',S('行動')),'那麼'],body:[
    {k:'ce',c:'control',t:['如果',B(V('遮蔭'),'<',N(8)),'那麼'],hl:1,note:'最多 8 棵（樹的位置只排了 8 個）',body:[
      CHV('遮蔭',N(1)),
      MSG('重畫')
    ],body2:[
      MSG('樹滿了',false,{hl:1,note:'種滿了就讓青蛙說一句話，玩家才知道不是壞掉'})
    ]}
  ]}
],

/* ---------- 亂丟垃圾事件 ---------- */
litter:[
  WHEN('亂丟垃圾',{note:'角色：舞台'}),
  {k:'ce',c:'control',t:['如果',B(V('垃圾'),'<',N(5)),'那麼'],hl:1,note:'一次丟兩件',body:[
    CHV('垃圾',N(2))
  ],body2:[
    {k:'c',c:'control',t:['如果',B(V('垃圾'),'<',N(6)),'那麼'],body:[CHV('垃圾',N(1),{note:'只剩一個位置就只加 1（分身只有 6 個）'})]}
  ]},
  CHV('水質',N(-3),{hl:1,note:'環境惡化：水質 −3'}),
  {k:'stack',c:'myblocks',t:['整理水質']},
  MSG('重畫'),
  {k:'stack',c:'control',t:['等待',N(2),'秒'],note:'讓提示卡有時間顯示'}
],
actBlock:[
  WHEN('擋住'),
  {k:'c',c:'control',t:['如果',B(V('偷倒中'),'=',N(1)),'那麼'],hl:1,note:'只有正在偷倒時，張開手掌才有用',body:[
    SETV('擋下成功',N(1)),CHV('擋下次數',N(1))
  ]}
],

/* ---------- 偷倒廢水事件 ---------- */
pipe:[
  WHEN('偷倒開始',{note:'角色：廢水管'}),
  SETV('擋下成功',N(0)),SETV('偷倒中',N(1)),
  COS({d:'流廢水'}),
  {k:'stack',c:'looks',t:['顯示']},
  {k:'stack',c:'sound',t:['播放音效',{d:'警告'}]},
  SETV('事件開始',TIMER),
  {k:'stack',c:'control',t:['等待直到',OR(B(V('擋下成功'),'=',N(1)),B(TIMER,'>',OP(V('事件開始'),'+',N(4))))],hl:1,note:'給玩家 4 秒'},
  SETV('偷倒中',N(0)),
  {k:'ce',c:'control',t:['如果',B(V('擋下成功'),'=',N(1)),'那麼'],body:[
    {k:'stack',c:'sound',t:['播放音效',{d:'擋下'}]},
    COS({d:'管子'}),
    {k:'stack',c:'looks',t:['隱藏']}
  ],body2:[
    {k:'stack',c:'sound',t:['播放音效',{d:'污染'}]},
    CHV('水質',N(-20),{hl:1,note:'環境惡化：水質 −20'}),
    {k:'c',c:'control',t:['如果',B(V('垃圾'),'<',N(6)),'那麼'],body:[CHV('垃圾',N(1))]},
    MSG('污染',false,{note:'水蠆消失'}),
    {k:'stack',c:'looks',t:['隱藏']}
  ]},
  MSG('重畫')
],

/* ---------- 每回合的自然變化 ---------- */
roundEnd:[
  WHEN('回合結束',{note:'角色：舞台'}),
  {k:'ce',c:'control',t:['如果',B(V('遮蔭'),'>',N(5)),'那麼'],hl:1,note:'遮蔭 ≥ 6：樹蔭很密，水質 +5',body:[
    CHV('水質',N(5))
  ],body2:[
  {k:'ce',c:'control',t:['如果',B(V('遮蔭'),'>',N(3)),'那麼'],note:'遮蔭 4～5：樹蔭讓水溫下降',body:[
    CHV('水質',N(3))
  ],body2:[
    {k:'ce',c:'control',t:['如果',B(V('遮蔭'),'>',N(2)),'那麼'],note:'遮蔭 ＝ 3：剛好打平',body:[
      CHV('水質',N(0))
    ],body2:[
      CHV('水質',N(-5),{note:'沒有樹蔭 → 水溫升高、水變少'})
    ]}
  ]}
  ]},
  {k:'c',c:'control',t:['如果',B(V('垃圾'),'>',N(3)),'那麼'],body:[CHV('水質',N(-3),{note:'垃圾太多也會讓水變髒'})]},
  {k:'c',c:'control',t:['如果',B(V('水質'),'>',N(69)),'那麼'],body:[SETV('水蠆在',N(1),{note:'水質變好 → 水蠆回來'})]},
  {k:'stack',c:'myblocks',t:['整理水質']},
  MSG('重畫')
],

/* ---------- 畫面跟著變 ---------- */
water:[
  WHEN('重畫',{note:'角色：水面'}),
  {k:'ce',c:'control',t:['如果',B(V('水質'),'<',N(40)),'那麼'],body:[
    COS({d:'混濁'}),{k:'stack',c:'looks',t:['尺寸設為',N(80),'%']}
  ],body2:[
    {k:'ce',c:'control',t:['如果',B(V('水質'),'<',N(70)),'那麼'],body:[
      COS({d:'普通'}),{k:'stack',c:'looks',t:['尺寸設為',N(95),'%']}
    ],body2:[
      COS({d:'清澈'}),{k:'stack',c:'looks',t:['尺寸設為',N(112),'%'],hl:1,note:'水質越好，水潭越大越清澈'}
    ]}
  ]}
],
nymph:[
  WHEN('重畫',{note:'角色：水蠆'}),
  {k:'ce',c:'control',t:['如果',AND(B(V('水蠆在'),'=',N(1)),AND(B(V('水質'),'>',N(44)),B(V('垃圾'),'<',N(4)))),'那麼'],hl:1,
   note:'水蠆對水質最敏感',body:[
    {k:'stack',c:'looks',t:['顯示']}
  ],body2:[
    {k:'stack',c:'looks',t:['隱藏']}
  ]}
],
bird:[
  WHEN('重畫',{note:'角色：翠鳥'}),
  {k:'ce',c:'control',t:['如果',AND(B(V('水質'),'>',N(64)),B(V('遮蔭'),'>',N(1))),'那麼'],hl:1,
   note:'水要乾淨，還要有樹可以停 → 動物重新出現',body:[
    {k:'stack',c:'looks',t:['顯示']}
  ],body2:[
    {k:'stack',c:'looks',t:['隱藏']}
  ]}
],
trashMain:[
  FLAG({note:'角色：垃圾（本體）'}),
  {k:'stack',c:'looks',t:['隱藏'],note:'本體永遠不顯示'},
  SETV('編號',N(0),{hl:1,note:'本體的「編號」要一直保持 0'}),
  SETV('計數',N(0)),
  {k:'c',c:'control',t:['重複',N(6),'次'],loop:1,body:[
    CHV('計數',N(1)),
    {k:'stack',c:'control',t:['建立',{d:'自己'},'的分身']}
  ]}
],
trashBorn:[
  {k:'hat',c:'control',t:['當分身產生']},
  SETV('編號',V('計數'),{hl:1,note:'分身把「產生當下的計數」設成自己的編號'}),
  {k:'stack',c:'myblocks',t:['（依編號移到自己的位置、換造型）']},
  {k:'ce',c:'control',t:['如果',B(V('編號'),'>',V('垃圾')),'那麼'],body:[
    {k:'stack',c:'looks',t:['隱藏']}
  ],body2:[
    {k:'stack',c:'looks',t:['顯示']}
  ]}
],
trashClone:[
  WHEN('重畫',{note:'角色：垃圾（分身）'}),
  {k:'c',c:'control',t:['如果',B(V('編號'),'>',N(0)),'那麼'],note:'「編號」是只屬於這個角色的變數',body:[
    {k:'ce',c:'control',t:['如果',B(V('編號'),'>',V('垃圾')),'那麼'],hl:1,note:'第 4 個分身，在垃圾剩 3 個時就隱藏',body:[
      {k:'stack',c:'looks',t:['隱藏']}
    ],body2:[
      {k:'stack',c:'looks',t:['顯示']}
    ]}
  ]}
],
treeClone:[
  {k:'hat',c:'control',t:['當分身產生'],note:'角色：小樹（本體用「計數」做出 8 個分身）'},
  SETV('編號',V('計數')),
  {k:'stack',c:'motion',t:['定位到 x:',OP(OP(V('編號'),'×',N(52)),'-',N(236)),'y:',OP(OP(V('編號'),'×',N(2)),'+',N(6))],hl:1,
   note:'位置用編號算出來，不用一棵一棵拖：\nx ＝ 編號 × 52 − 236（第 1 棵 −184、第 8 棵 180）\ny ＝ 編號 × 2 ＋ 6（讓樹稍微高低錯開）'},
  COS({d:'幼苗'}),
  {k:'stack',c:'looks',t:['尺寸設為',N(70),'%']},
  {k:'ce',c:'control',t:['如果',B(V('編號'),'>',V('遮蔭')),'那麼'],body:[
    {k:'stack',c:'looks',t:['隱藏']}
  ],body2:[
    {k:'stack',c:'looks',t:['顯示']}
  ]}
],
frogFace:[
  WHEN('重畫',{note:'角色：青蛙'}),
  {k:'ce',c:'control',t:['如果',B(V('水質'),'<',N(40)),'那麼'],body:[COS({d:'難過'})],body2:[
    {k:'ce',c:'control',t:['如果',B(V('水質'),'<',N(70)),'那麼'],body:[COS({d:'普通'})],body2:[COS({d:'開心'})]}
  ]}
],
opening:[
  WHEN('開場',{note:'角色：青蛙'}),
  SAY('我是住在這條溪流上游的青蛙。',2.5),
  SAY('以前這裡的水又深又涼，翠鳥會來抓魚，石頭下面全是水蠆。',4),
  SAY('可是溪邊的樹被砍掉以後，太陽整天曬著水面，水一天比一天淺。',4),
  SAY('垃圾卡在石頭中間，還有人半夜把廢水倒進溪裡。',3.5),
  SAY('我的同伴一隻一隻離開了……你可以幫我把家救回來嗎？',4)
],
ending:[
  WHEN('結局',{note:'角色：結局卡'}),
  {k:'c',c:'control',t:['如果',B(V('結局'),'=',S('好')),'那麼'],body:[
    COS({d:'好'}),{k:'stack',c:'sound',t:['播放音效',{d:'好結局'}]},MSG('好結局')
  ]},
  {k:'c',c:'control',t:['如果',B(V('結局'),'=',S('普通')),'那麼'],body:[
    COS({d:'普通'}),MSG('普通結局')
  ]},
  {k:'c',c:'control',t:['如果',B(V('結局'),'=',S('壞')),'那麼'],body:[
    COS({d:'壞'}),{k:'stack',c:'sound',t:['播放音效',{d:'壞結局'}]},MSG('壞結局')
  ]},
  {k:'stack',c:'looks',t:['顯示']}
]
};
