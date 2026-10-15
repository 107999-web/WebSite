/* =========================================================
   blk.js — 把簡單的資料畫成 Scratch 積木（只負責「看」，不會執行）
   沿用「Scratch 動畫製作教學」的積木繪製方式。
   積木文字依 Scratch 官方繁體中文翻譯（scratch-l10n zh-tw）；
   Handpose2Scratch 的積木文字沿用本校「Handpose2Scratch 教學」的中文說法。
   ---------------------------------------------------------
     {k:'hat',   c:'events',  t:[...]}          帽子積木
     {k:'stack', c:'looks',   t:[...]}          一般積木
     {k:'c',     c:'control', t:[...], body:[]} 重複／如果
     {k:'ce',    c:'control', t:[...], body:[], t2:['否則'], body2:[]}
     {k:'def',   t:[...]}                        定義（函式積木）
   t 裡面可以放：
     '文字'  {n:'10'} 數字  {s:'文字'} 文字格  {d:'選單'} 下拉選單
     {r:{c:'sensing',t:[...]}} 圓角回報積木
     {b:{c:'operators',t:[...]}} 六角形條件
     {p:'參數'} 參數（粉紅色）  {flag:1} 綠旗圖示
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

/* ---------- 小幫手：讓下面的程式片段好寫一點 ---------- */
var LM={1:'手腕',6:'食指第三關節',9:'食指尖',10:'中指第三關節',13:'中指尖'};
function V(n){return {r:{c:'variables',t:[n]}};}
function HX(i){return {r:{c:'ext',t:[{d:LM[i]+' ('+i+')'},'的 x 座標']}};}
function HY(i){return {r:{c:'ext',t:[{d:LM[i]+' ('+i+')'},'的 y 座標']}};}
function OP(a,o,b){return {r:{c:'operators',t:[a,o,b]}};}
function B(a,o,b){return {b:{c:'operators',t:[a,o,b]}};}
function AND(a,b){return {b:{c:'operators',t:[a,'且',b]}};}
function OR(a,b){return {b:{c:'operators',t:[a,'或',b]}};}
function NOT(a){return {b:{c:'operators',t:[a,'不成立']}};}
function MATH(f,x){return {r:{c:'operators',t:[{d:f},'數值',x]}};}
function LETTER(i,s){return {r:{c:'operators',t:['字串',s,'的第',i,'字']}};}
function ITEM(i,l){return {r:{c:'listtone',t:[{d:l},'的第',i,'項']}};}
function LLEN(l){return {r:{c:'listtone',t:['清單',{d:l},'的長度']}};}
function SETV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'設為',x]};for(var k in o)b[k]=o[k];return b;}
function CHV(n,x,o){var b={k:'stack',c:'variables',t:['變數',{d:n},'改變',x]};for(var k in o)b[k]=o[k];return b;}
function MSG(n,w,o){var b={k:'stack',c:'events',t:['廣播訊息',{d:n}].concat(w?['並等待']:[])};for(var k in o)b[k]=o[k];return b;}
function WHEN(n,o){var b={k:'hat',c:'events',t:['當收到訊息',{d:n}]};for(var k in o)b[k]=o[k];return b;}
var TIMER={r:{c:'sensing',t:['計時器']}};
function DIST(a,b){
  return MATH('平方根',OP(OP(OP(HX(a),'-',HX(b)),'*',OP(HX(a),'-',HX(b))),'+',OP(OP(HY(a),'-',HY(b)),'*',OP(HY(a),'-',HY(b)))));
}
function S(n){return {s:n};}
function N(n){return {n:n};}

var SCRIPTS = {

/* ---------- 步驟一：開機測試 ---------- */
setupTest:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'ext',t:['將攝影機',{d:'開啟'}],note:'畫面像照鏡子，你往右它也往右'},
  {k:'stack',c:'ext',t:['將攝影機的透明度設為',N(50)]},
  {k:'stack',c:'ext',t:['將倍率設為',{d:'0.75'}]},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    SETV('dx',OP(HX(9),'-',HX(6)),{hl:1,note:'食指尖 x － 食指第三關節 x'}),
    {k:'stack',c:'looks',t:['說出',V('dx')]}
  ]}
],

/* ---------- 步驟二：辨識手勢 ---------- */
palm:[
  SETV('手掌',DIST(1,10),{note:'兩點距離公式：√(x差² + y差²)'})
],
classify:[
  {k:'def',t:['辨識手勢'],note:'右鍵 → 編輯 → 勾選「執行時不重新整理畫面」'},
  {k:'ce',c:'control',t:['如果',B(HX(1),'>',N(-250)),'那麼'],note:'看得到手才計算（看不到手時積木是空白）',body:[
    SETV('手掌',{r:{c:'operators',t:['平方根 ( 手腕 ↔ 中指第三關節 )']}},{note:'當作「尺」，手靠近或離遠都能用'}),
    SETV('食指長',{r:{c:'operators',t:['平方根 ( 食指第三關節 ↔ 食指尖 )']}}),
    SETV('中指長',{r:{c:'operators',t:['平方根 ( 中指第三關節 ↔ 中指尖 )']}}),
    SETV('dx',OP(HX(9),'-',HX(6))),
    SETV('dy',OP(HY(9),'-',HY(6))),
    {k:'ce',c:'control',t:['如果',B(V('中指長'),'>',OP(V('手掌'),'*',V('門檻'))),'那麼'],hl:1,note:'① 中指伸直 → 手是張開的',body:[
      SETV('手勢',S('其他'))
    ],body2:[
      {k:'ce',c:'control',t:['如果',B(V('食指長'),'<',OP(V('手掌'),'*',V('門檻'))),'那麼'],hl:1,note:'② 食指也彎著 → 握拳',body:[
        SETV('手勢',S('拳'))
      ],body2:[
        {k:'ce',c:'control',t:['如果',B(MATH('絕對值',V('dx')),'>',MATH('絕對值',V('dy'))),'那麼'],hl:1,note:'③ 食指伸直：橫的多還是直的多？',body:[
          {k:'ce',c:'control',t:['如果',B(V('dx'),'>',N(0)),'那麼'],body:[SETV('手勢',S('右'))],body2:[SETV('手勢',S('左'))]}
        ],body2:[
          {k:'ce',c:'control',t:['如果',B(V('dy'),'>',N(0)),'那麼'],body:[SETV('手勢',S('上'))],body2:[SETV('手勢',S('其他'))]}
        ]}
      ]}
    ]}
  ],body2:[
    SETV('手勢',S('無'))
  ]}
],

/* ---------- 步驟三：上膛與出招 ---------- */
detectLoop:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊'],note:'角色：手勢偵測'},
  SETV('上膛',N(0)),
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'stack',c:'myblocks',t:['辨識手勢']},
    {k:'stack',c:'looks',t:['造型換成',V('手勢')],note:'畫面下方的小牌子會顯示電腦看到什麼'},
    {k:'c',c:'control',t:['如果',B(V('手勢'),'=',S('拳')),'那麼'],hl:1,body:[SETV('上膛',N(1))],note:'握拳 ＝ 裝好子彈'},
    {k:'c',c:'control',t:['如果',AND(B(V('上膛'),'=',N(1)),OR(B(V('手勢'),'=',S('左')),OR(B(V('手勢'),'=',S('上')),B(V('手勢'),'=',S('右'))))),'那麼'],hl:1,
     note:'有子彈又比出方向 ＝ 發射一次',body:[
      SETV('出招方向',V('手勢')),
      SETV('上膛',N(0)),
      MSG('出招')
    ]}
  ]}
],
keys:[
  {k:'hat',c:'events',t:['當',{d:'向左'},'鍵被按下'],note:'↑、→ 也各做一組'},
  SETV('出招方向',S('左')),
  MSG('出招')
],

/* ---------- 步驟四：譜面與節拍器 ---------- */
songs:[
  {k:'stack',c:'listtone',t:['刪除',{d:'譜面清單'},'的所有項目']},
  {k:'stack',c:'listtone',t:['添加',S('左-右-左-右-'),'到',{d:'譜面清單'}],note:'第 1 關'},
  {k:'stack',c:'listtone',t:['添加',S('上-上-左-右-'),'到',{d:'譜面清單'}]},
  {k:'stack',c:'listtone',t:['添加',S('左右-上-左右-'),'到',{d:'譜面清單'}]},
  {k:'stack',c:'listtone',t:['添加',S('上左右-上右左-'),'到',{d:'譜面清單'}]},
  {k:'stack',c:'listtone',t:['添加',S('左上右上左上右-'),'到',{d:'譜面清單'}],note:'第 5 關，最難'}
],
readPattern:[
  {k:'def',t:['讀取譜面'],note:'角色：舞台'},
  {k:'stack',c:'listtone',t:['刪除',{d:'音符拍'},'的所有項目']},
  {k:'stack',c:'listtone',t:['刪除',{d:'音符方向'},'的所有項目']},
  SETV('i',N(1)),
  {k:'c',c:'control',t:['重複',{r:{c:'operators',t:['字串',V('譜面'),'的長度']}},'次'],loop:1,body:[
    {k:'c',c:'control',t:['如果',NOT(B(LETTER(V('i'),V('譜面')),'=',S('-'))),'那麼'],hl:1,note:'不是休息（-）就是音符',body:[
      {k:'stack',c:'listtone',t:['添加',V('i'),'到',{d:'音符拍'}],note:'記下「第幾拍」'},
      {k:'stack',c:'listtone',t:['添加',LETTER(V('i'),V('譜面')),'到',{d:'音符方向'}],note:'記下「哪個方向」'}
    ]},
    CHV('i',N(1))
  ]}
],
beat:[
  {k:'def',t:['打拍',{p:'拍數'}],note:'右鍵 → 新增參數「拍數」'},
  SETV('目前拍',N(0)),
  {k:'c',c:'control',t:['重複',{p:'拍數'},'次'],loop:1,body:[
    CHV('目前拍',N(1),{note:'先加 1，再廣播（順序很重要）'}),
    {k:'stack',c:'control',t:['等待直到',B(TIMER,'>',OP(V('開始時間'),'+',OP(OP(V('目前拍'),'-',N(1)),'*',V('拍長'))))],hl:1,
     note:'第 n 拍的時間 ＝ 開始時間 ＋ (n−1) × 拍長'},
    MSG('拍')
  ]},
  {k:'stack',c:'control',t:['等待直到',B(TIMER,'>',OP(V('開始時間'),'+',OP({p:'拍數'},'*',V('拍長'))))],note:'等最後一拍也走完'}
],
beatBad:[
  {k:'c',c:'control',t:['重複',N(8),'次'],loop:1,body:[
    MSG('拍'),
    {k:'stack',c:'control',t:['等待',N(0.8),'秒']}
  ]}
],
tick:[
  WHEN('拍',{note:'角色：舞台'}),
  {k:'stack',c:'sound',t:['播放音效',{d:'拍'}]}
],

/* ---------- 步驟五：師傅與節拍列 ---------- */
master:[
  WHEN('拍',{note:'角色：師傅'}),
  {k:'ce',c:'control',t:['如果',B(V('階段'),'=',S('示範')),'那麼'],body:[
    {k:'c',c:'control',t:['如果',NOT(B(LETTER(V('目前拍'),V('譜面')),'=',S('-'))),'那麼'],body:[
      {k:'stack',c:'looks',t:['造型換成',LETTER(V('目前拍'),V('譜面'))],hl:1,note:'造型名稱就叫「左」「上」「右」'},
      {k:'stack',c:'sound',t:['播放音效',LETTER(V('目前拍'),V('譜面'))],note:'音效也取一樣的名字'},
      {k:'stack',c:'control',t:['等待',N(0.4),'秒']},
      {k:'stack',c:'looks',t:['造型換成',{d:'拳'}]}
    ]}
  ],body2:[
    {k:'stack',c:'motion',t:['y 改變',N(6)],note:'其他時候跟著拍子點頭'},
    {k:'stack',c:'control',t:['等待',N(0.1),'秒']},
    {k:'stack',c:'motion',t:['y 改變',N(-6)]}
  ]}
],
rowMain:[
  WHEN('看師傅',{note:'角色：節拍列（我的拍是「僅適用當前角色」的變數）'}),
  {k:'ce',c:'control',t:['如果',B(V('我的拍'),'=',N(0)),'那麼'],note:'本體負責做分身；舊分身刪掉自己',body:[
    {k:'c',c:'control',t:['重複',N(8),'次'],loop:1,body:[
      CHV('我的拍',N(1)),
      {k:'stack',c:'control',t:['建立',{d:'自己'},'的分身']}
    ]},
    SETV('我的拍',N(0))
  ],body2:[
    {k:'cap',c:'control',t:['分身刪除']}
  ]}
],
rowClone:[
  {k:'hat',c:'control',t:['當分身產生']},
  {k:'stack',c:'motion',t:['定位到 x:',OP(OP(V('我的拍'),'*',N(55)),'-',N(247.5)),'y:',N(110)],note:'8 格排成一排'},
  {k:'stack',c:'looks',t:['造型換成',LETTER(V('我的拍'),V('譜面'))],hl:1,note:'第幾個分身就顯示譜面的第幾個字'},
  {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',N(30)]},
  {k:'stack',c:'looks',t:['顯示']}
],
rowBeat:[
  WHEN('拍'),
  {k:'c',c:'control',t:['如果',B(V('我的拍'),'>',N(0)),'那麼'],body:[
    {k:'ce',c:'control',t:['如果',AND(B(V('目前拍'),'=',V('我的拍')),NOT(B(V('階段'),'=',S('倒數')))),'那麼'],hl:1,note:'輪到我這一格就放大',body:[
      {k:'stack',c:'looks',t:['尺寸設為',N(140),'%']},
      {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',N(0)]}
    ],body2:[
      {k:'stack',c:'looks',t:['尺寸設為',N(100),'%']},
      {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',N(30)]}
    ]}
  ]}
],

/* ---------- 步驟六：判定 ---------- */
judgeHit:[
  WHEN('出招',{note:'角色：判定'}),
  {k:'c',c:'control',t:['如果',B(V('階段'),'=',S('玩家')),'那麼'],body:[
    SETV('出招時間',OP(OP(TIMER,'-',V('開始時間')),'-',V('延遲補償')),{note:'這一段開始後，過了幾秒？'}),
    {k:'ce',c:'control',t:['如果',AND(B(V('下一個'),'<',OP(LLEN('音符拍'),'+',N(1))),
        B(MATH('絕對值',OP(V('出招時間'),'-',OP(OP(ITEM(V('下一個'),'音符拍'),'-',N(1)),'*',V('拍長')))),'<',V('容許'))),'那麼'],hl:1,
     note:'時間差夠小 → 有對到拍子',body:[
      {k:'ce',c:'control',t:['如果',B(V('出招方向'),'=',ITEM(V('下一個'),'音符方向')),'那麼'],body:[
        SETV('判定',S('GOOD'))
      ],body2:[
        SETV('判定',S('BAD')),CHV('錯誤',N(1))
      ]},
      CHV('下一個',N(1),{note:'換看下一個音符'})
    ],body2:[
      SETV('判定',S('BAD'),{note:'沒拍子亂出招'}),CHV('錯誤',N(1))
    ]},
    MSG('顯示判定')
  ]}
],
judgeMiss:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊'],note:'角色：判定'},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'c',c:'control',t:['如果',AND(B(V('階段'),'=',S('玩家')),AND(B(V('下一個'),'<',OP(LLEN('音符拍'),'+',N(1))),
        B(OP(OP(TIMER,'-',V('開始時間')),'-',V('延遲補償')),'>',OP(OP(OP(ITEM(V('下一個'),'音符拍'),'-',N(1)),'*',V('拍長')),'+',V('容許'))))),'那麼'],hl:1,
     note:'音符時間＋容許 都過了還沒出招 → MISS',body:[
      SETV('判定',S('MISS')),CHV('錯誤',N(1)),CHV('下一個',N(1)),MSG('顯示判定')
    ]}
  ]}
],
judgeShow:[
  WHEN('顯示判定'),
  {k:'stack',c:'looks',t:['造型換成',V('判定')],note:'造型名稱：GOOD、BAD、MISS'},
  {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',N(0)]},
  {k:'stack',c:'looks',t:['顯示']},
  {k:'c',c:'control',t:['重複',N(10),'次'],loop:1,body:[
    {k:'stack',c:'motion',t:['y 改變',N(2)]},
    {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'改變',N(10)]}
  ]},
  {k:'stack',c:'looks',t:['隱藏']}
],

/* ---------- 步驟七：主流程 ---------- */
main:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊'],note:'角色：舞台'},
  {k:'stack',c:'myblocks',t:['（設定變數、譜面清單、攝影機…）'],note:'前面步驟做過的初始設定'},
  MSG('開場'),
  {k:'stack',c:'control',t:['等待直到',OR(B(V('手勢'),'=',S('拳')),{b:{c:'sensing',t:[{d:'空白'},'鍵被按下？']}})],note:'握拳就開始'},
  SETV('回合',N(1)),
  {k:'c',c:'control',t:['重複',LLEN('譜面清單'),'次'],loop:1,body:[
    SETV('譜面',ITEM(V('回合'),'譜面清單')),
    {k:'stack',c:'myblocks',t:['讀取譜面']},
    MSG('看師傅',true,{note:'①'}),
    SETV('開始時間',TIMER),SETV('階段',S('示範')),
    {k:'stack',c:'myblocks',t:['打拍',N(8)],hl:1,note:'師傅示範 8 拍'},
    SETV('階段',S('倒數')),
    MSG('換你',true,{note:'②'}),
    SETV('開始時間',TIMER),
    {k:'stack',c:'myblocks',t:['打拍',N(4)],hl:1,note:'倒數 3、2、1、GO'},
    SETV('錯誤',N(0)),SETV('下一個',N(1)),
    SETV('開始時間',TIMER,{note:'先記時間，再改階段'}),SETV('階段',S('玩家')),
    {k:'stack',c:'myblocks',t:['打拍',N(8)],hl:1,note:'③ 換你打 8 拍'},
    SETV('階段',S('結果')),
    {k:'c',c:'control',t:['如果',B(V('下一個'),'<',OP(LLEN('音符拍'),'+',N(1))),'那麼'],note:'還沒輪到的音符都算漏掉',body:[
      CHV('錯誤',OP(OP(LLEN('音符拍'),'-',V('下一個')),'+',N(1)))
    ]},
    {k:'ce',c:'control',t:['如果',B(V('錯誤'),'<',N(2)),'那麼'],hl:1,note:'④ 最多錯 1 次就過關',body:[
      CHV('分數',N(1)),MSG('過關',true)
    ],body2:[
      MSG('失敗',true)
    ]},
    CHV('回合',N(1))
  ]},
  SETV('階段',S('結束')),
  MSG('遊戲結束')
],
afro:[
  WHEN('過關',{note:'角色：爆炸頭'}),
  {k:'stack',c:'sound',t:['播放音效',{d:'過關'}]},
  {k:'stack',c:'looks',t:['尺寸設為',OP(OP(N(40),'+',OP(V('分數'),'*',N(20))),'+',N(15)),'%'],note:'先誇張一下'},
  {k:'stack',c:'control',t:['等待',N(0.15),'秒']},
  {k:'stack',c:'looks',t:['尺寸設為',OP(N(40),'+',OP(V('分數'),'*',N(20))),'%'],hl:1,note:'再縮回正確大小'}
],
player:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊'],note:'角色：玩家'},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'c',c:'control',t:['如果',NOT(B(V('手勢'),'=',S('無'))),'那麼'],body:[
      {k:'ce',c:'control',t:['如果',OR(B(V('手勢'),'=',S('左')),OR(B(V('手勢'),'=',S('上')),B(V('手勢'),'=',S('右')))),'那麼'],body:[
        {k:'stack',c:'looks',t:['造型換成',V('手勢')]}
      ],body2:[
        {k:'stack',c:'looks',t:['造型換成',{d:'拳'}]}
      ]}
    ]}
  ]}
],
playerHit:[
  WHEN('出招',{note:'角色：玩家'}),
  {k:'stack',c:'looks',t:['造型換成',V('出招方向')]},
  {k:'stack',c:'sound',t:['播放音效',V('出招方向')]}
],
countdown:[
  WHEN('拍',{note:'角色：提示'}),
  {k:'c',c:'control',t:['如果',B(V('階段'),'=',S('倒數')),'那麼'],body:[
    {k:'stack',c:'looks',t:['造型換成',{r:{c:'operators',t:['字串組合',S('數'),OP(N(4),'-',V('目前拍'))]}}],hl:1,note:'目前拍 1→「數3」… 4→「數0」(GO!)'},
    {k:'stack',c:'looks',t:['顯示']},
    {k:'stack',c:'control',t:['等待',N(0.5),'秒']},
    {k:'stack',c:'looks',t:['隱藏']}
  ]}
]
};
