/* =========================================================
   blk.js — 把簡單的資料畫成 Scratch 積木（只負責「看」，不會執行）
   積木文字依 Scratch 官方繁體中文翻譯（scratch-l10n zh-tw）
   ---------------------------------------------------------
   一段程式 = 陣列，每一塊積木是一個物件：
     {k:'hat',   c:'events',  t:[...]}          帽子積木
     {k:'stack', c:'looks',   t:[...]}          一般積木
     {k:'c',     c:'control', t:[...], body:[]} 重複／如果
     {k:'ce',    c:'control', t:[...], body:[], t2:['否則'], body2:[]}
     {k:'def',   t:[...]}                        定義（函式積木）
   t 裡面可以放：
     '文字'  {n:'10'} 數字  {s:'文字'} 文字格  {d:'選單'} 下拉選單
     {r:{c:'sensing',t:[...]}} 圓角回報積木
     {b:{c:'operators',t:[...]}} 六角形條件
     {p:'造型'} 參數（粉紅色）
     {flag:1} 綠旗圖示
   另外每一塊積木可以加 note:'說明' 顯示在右邊，或 hl:1 醒目提示
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
  /* 自動把 data-blk="名稱" 的元素畫出來 */
  function auto(lib){
    document.querySelectorAll('[data-blk]').forEach(function(el){
      var k=el.getAttribute('data-blk'); if(lib[k])render(el,lib[k]);
    });
  }
  return {render:render,stack:stack,auto:auto,part:part};
})();

/* =========================================================
   這份教材用到的所有程式片段
   前半部：李昀宸同學投影片裡的程式
   後半部：.sb3 專案裡實際的程式（含同學自己寫的註解）
   ========================================================= */
var SCRIPTS = {

/* ---------- 投影片第 9 頁：廣播與接收 ---------- */
sendMsg:[
  {k:'stack',c:'control',t:['等待',{n:5},'秒']},
  {k:'c',c:'control',t:['重複',{n:10},'次'],body:[
    {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'改變',{n:10}]}
  ],loop:1},
  {k:'stack',c:'events',t:['廣播訊息',{d:'1 主'}],hl:1,note:'① 在這裡「喊出」訊息'},
  {k:'cap',c:'control',t:['分身刪除']}
],
recvMsg:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'1 主'}],hl:1,note:'② 其他角色「聽到」就開始做事'},
  {k:'stack',c:'myblocks',t:['復原']},
  {k:'stack',c:'looks',t:['造型換成',{d:''}]},
  {k:'stack',c:'looks',t:['顯示']},
  {k:'c',c:'control',t:['重複',{n:7},'次'],body:[
    {k:'stack',c:'myblocks',t:['換頁']}
  ],loop:1}
],

/* ---------- 投影片第 10 頁：分身依條件分工 ---------- */
cloneMain:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'myblocks',t:['復原']},
  {k:'stack',c:'variables',t:['變數',{d:'開場 控制1'},'設為',{n:0}]},
  {k:'stack',c:'looks',t:['造型換成',{d:'空'}]},
  {k:'stack',c:'looks',t:['隱藏']},
  {k:'stack',c:'looks',t:['背景換成',{d:'開場'}]},
  {k:'stack',c:'myblocks',t:['建立分身',{n:8}],hl:1},
  {k:'stack',c:'myblocks',t:['建立分身',{n:9}],hl:1,note:'本體負責「製造」分身'}
],
cloneWork:[
  {k:'hat',c:'control',t:['當分身產生']},
  {k:'c',c:'control',t:['如果',{b:{c:'operators',t:[{r:{c:'looks',t:['造型',{d:'名稱'}]}},'=',{s:'8'}]}},'那麼'],hl:1,
   note:'分身先「看看自己是誰」，再決定要做什麼',body:[
    {k:'stack',c:'motion',t:['定位到 x:',{n:0},'y:',{n:300}]},
    {k:'stack',c:'looks',t:['顯示']},
    {k:'stack',c:'variables',t:['變數',{d:'開場 落下速度'},'設為',{n:-10}]},
    {k:'c',c:'control',t:['重複直到',{b:{c:'operators',t:[
        {b:{c:'operators',t:[{r:{c:'motion',t:['y 座標']}},'<',{n:100}]}},'或',
        {b:{c:'operators',t:[{r:{c:'motion',t:['y 座標']}},'=',{n:100}]}}]}}],body:[
      {k:'stack',c:'motion',t:['y 改變',{r:{c:'variables',t:['開場 落下速度']}}]},
      {k:'stack',c:'variables',t:['變數',{d:'開場 落下速度'},'改變',{n:-2}]}
    ]},
    {k:'stack',c:'myblocks',t:['彈']},
    {k:'stack',c:'variables',t:['變數',{d:'開場 控制1'},'設為',{n:1}]}
  ]}
],

/* ---------- 投影片第 15 頁：不要再這樣啦 ---------- */
longWay:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'1 主'}]},
  {k:'stack',c:'looks',t:['造型換成',{d:'1'}]},
  {k:'stack',c:'sound',t:['播放音效',{d:'1'},'直到結束']},
  {k:'stack',c:'looks',t:['造型換成',{d:'2'}]},
  {k:'stack',c:'sound',t:['播放音效',{d:'2'},'直到結束']},
  {k:'stack',c:'looks',t:['造型換成',{d:'3'}]},
  {k:'stack',c:'sound',t:['播放音效',{d:'3'},'直到結束']},
  {k:'stack',c:'looks',t:['造型換成',{d:'4'}]},
  {k:'stack',c:'sound',t:['播放音效',{d:'4'},'直到結束'],note:'……每一頁都要拼兩塊，一直往下接'}
],

/* ---------- 投影片第 16 頁：定義積木 ---------- */
defPage:[
  {k:'def',t:['換頁',{p:'造型'}],note:'「造型」是參數：呼叫時填進來的值'},
  {k:'stack',c:'looks',t:['造型換成',{p:'造型'}]},
  {k:'stack',c:'sound',t:['播放音效',{p:'造型'},'直到結束'],note:'所以造型和音效要取一樣的名字'}
],
usePage:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'1 主'}]},
  {k:'stack',c:'myblocks',t:['換頁',{s:'1'}]},
  {k:'stack',c:'myblocks',t:['換頁',{s:'2'}]},
  {k:'stack',c:'myblocks',t:['換頁',{s:'3'}]},
  {k:'stack',c:'myblocks',t:['換頁',{s:'4'}],note:'一頁只要一塊積木'}
],

/* ---------- 投影片第 17 頁：幻影淡入 ---------- */
fadeIn:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',{n:100}],note:'100 ＝ 完全透明'},
  {k:'c',c:'control',t:['重複',{n:10},'次'],body:[
    {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'改變',{n:-10}]}
  ],loop:1,note:'每次少 10，10 次後變成 0（完全看得見）'}
],

/* ---------- 投影片第 17 頁：sin 擺動 ---------- */
sinSwing:[
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'stack',c:'motion',t:['面朝',
      {r:{c:'operators',t:[
        {r:{c:'operators',t:[
          {r:{c:'operators',t:[{d:'sin'},'數值',{r:{c:'operators',t:[{r:{c:'sensing',t:['計時器']}},'*',{n:100}]}}]}},
          '*',{n:10}]}},
        '+',{n:90}]}},
      '度']}
  ]}
],

/* ---------- .sb3：舞台的背景音樂 ---------- */
bgmGood:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'stack',c:'sound',t:['播放音效',{d:'Chill'},'直到結束'],hl:1}
  ]}
],
bgmBad:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'forever',c:'control',t:['重複無限次'],body:[
    {k:'stack',c:'sound',t:['播放音效',{d:'Chill'}],hl:1}
  ]}
],

/* ---------- .sb3：幻燈片角色 ---------- */
slideInit:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'looks',t:['圖層移到',{d:'最上'},'層']},
  {k:'stack',c:'looks',t:['圖層',{d:'下'},'移',{n:2},'層'],note:'圖層要注意！'},
  {k:'stack',c:'looks',t:['造型換成',{d:'costume1'}],note:'初始化要記得！'},
  {k:'stack',c:'motion',t:['定位到 x:',{n:0},'y:',{n:0}]}
],
slideNext:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'下一頁'}]},
  {k:'stack',c:'looks',t:['造型換成下一個']}
],
slidePrev:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'上一頁'}]},
  {k:'stack',c:'looks',t:['造型換成',{r:{c:'operators',t:[{r:{c:'looks',t:['造型',{d:'編號'}]}},'-',{n:1}]}}],
   hl:1,note:'造型編號減 1，就是上一個造型'}
],

/* ---------- .sb3：箭頭角色 ---------- */
arrowMain:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'looks',t:['隱藏'],note:'主體隱藏，分身工作'},
  {k:'stack',c:'looks',t:['造型換成',{d:'costume1'}]},
  {k:'stack',c:'control',t:['建立',{d:'自己'},'的分身'],hl:1},
  {k:'stack',c:'looks',t:['造型換成',{d:'costume2'}]},
  {k:'stack',c:'control',t:['建立',{d:'自己'},'的分身'],hl:1}
],
arrowClone:[
  {k:'hat',c:'control',t:['當分身產生']},
  {k:'stack',c:'motion',t:['定位到 x:',{n:0},'y:',{n:0}]},
  {k:'stack',c:'looks',t:['顯示']},
  {k:'c',c:'control',t:['如果',{b:{c:'operators',t:[{r:{c:'looks',t:['造型',{d:'編號'}]}},'=',{s:'1'}]}},'那麼'],hl:1,
   note:'判斷造型編號，各自做自己的工作',body:[
    {k:'stack',c:'looks',t:['圖層移到',{d:'最上'},'層']},
    {k:'forever',c:'control',t:['重複無限次'],body:[
      {k:'ce',c:'control',t:['如果',{b:{c:'sensing',t:['碰到',{d:'鼠標'},'？']}},'那麼'],body:[
        {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',{n:20}],note:'碰到時變清楚，讓人知道可以點'},
        {k:'c',c:'control',t:['如果',{b:{c:'sensing',t:['滑鼠鍵被按下？']}},'那麼'],body:[
          {k:'stack',c:'events',t:['廣播訊息',{d:'下一頁'}]},
          {k:'stack',c:'control',t:['等待直到',{b:{c:'operators',t:[{b:{c:'sensing',t:['滑鼠鍵被按下？']}},'不成立']}}],
           hl:1,note:'避免按住時一直重複廣播'}
        ]}
      ],body2:[
        {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',{n:80}]}
      ]}
    ]}
  ]}
],
arrowCloneShort:[
  {k:'c',c:'control',t:['如果',{b:{c:'operators',t:[{r:{c:'looks',t:['造型',{d:'編號'}]}},'=',{s:'2'}]}},'那麼'],body:[
    {k:'stack',c:'looks',t:['圖層移到',{d:'最上'},'層']},
    {k:'stack',c:'looks',t:['圖層',{d:'下'},'移',{n:1},'層']},
    {k:'forever',c:'control',t:['重複無限次'],body:[
      {k:'stack',c:'control',t:['……和上面一樣，只是改成廣播',{d:'上一頁'}]}
    ]}
  ]}
],

/* ---------- 按住滑鼠：兩種寫法 ---------- */
holdBad:[
  {k:'c',c:'control',t:['如果',{b:{c:'sensing',t:['滑鼠鍵被按下？']}},'那麼'],body:[
    {k:'stack',c:'events',t:['廣播訊息',{d:'下一頁'}]}
  ]}
],
holdGood:[
  {k:'c',c:'control',t:['如果',{b:{c:'sensing',t:['滑鼠鍵被按下？']}},'那麼'],body:[
    {k:'stack',c:'events',t:['廣播訊息',{d:'下一頁'}]},
    {k:'stack',c:'control',t:['等待直到',{b:{c:'operators',t:[{b:{c:'sensing',t:['滑鼠鍵被按下？']}},'不成立']}}],hl:1}
  ]}
],

/* ---------- 秒數寫死 vs 廣播 ---------- */
syncBadA:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'sound',t:['播放音效',{d:'貓媽媽的台詞'},'直到結束']}
],
syncBadB:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'control',t:['等待',{n:3},'秒'],hl:1,note:'猜台詞大概 3 秒……'},
  {k:'stack',c:'looks',t:['顯示']}
],
syncGoodA:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'sound',t:['播放音效',{d:'貓媽媽的台詞'},'直到結束']},
  {k:'stack',c:'events',t:['廣播訊息',{d:'1-2 小貓出場'}],hl:1,note:'講完才喊'}
],
syncGoodB:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'1-2 小貓出場'}],hl:1,note:'聽到才出場'},
  {k:'stack',c:'looks',t:['顯示']}
],

/* ---------- 廣播示範：三個角色同時接收 ---------- */
bcTitle:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'1 主'}]},
  {k:'stack',c:'looks',t:['隱藏']}
],
bcSub:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'1 主'}]},
  {k:'stack',c:'looks',t:['顯示']},
  {k:'stack',c:'looks',t:['造型換成',{d:'字幕1'}]}
],
bcCat:[
  {k:'hat',c:'events',t:['當收到訊息',{d:'1 主'}]},
  {k:'stack',c:'looks',t:['顯示']},
  {k:'stack',c:'motion',t:['滑行',{n:1},'秒到 x:',{n:0},'y:',{n:-60}]}
],
bcSend:[
  {k:'hat',c:'events',t:['當',{flag:1},'被點擊']},
  {k:'stack',c:'looks',t:['顯示']},
  {k:'stack',c:'control',t:['等待',{n:2},'秒']},
  {k:'stack',c:'events',t:['廣播訊息',{d:'1 主'}],hl:1}
]
};

/* ---------- 教師版：原作完整程式 ---------- */
SCRIPTS.arrowClone2Full=[
  {k:'c',c:'control',t:['如果',{b:{c:'operators',t:[{r:{c:'looks',t:['造型',{d:'編號'}]}},'=',{s:'2'}]}},'那麼'],body:[
    {k:'stack',c:'looks',t:['圖層移到',{d:'最上'},'層']},
    {k:'stack',c:'looks',t:['圖層',{d:'下'},'移',{n:1},'層']},
    {k:'forever',c:'control',t:['重複無限次'],hl:1,note:'外層這一個是多餘的（不影響功能）',body:[
      {k:'forever',c:'control',t:['重複無限次'],body:[
        {k:'ce',c:'control',t:['如果',{b:{c:'sensing',t:['碰到',{d:'鼠標'},'？']}},'那麼'],body:[
          {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',{n:20}]},
          {k:'c',c:'control',t:['如果',{b:{c:'sensing',t:['滑鼠鍵被按下？']}},'那麼'],body:[
            {k:'stack',c:'events',t:['廣播訊息',{d:'上一頁'}]},
            {k:'stack',c:'control',t:['等待直到',{b:{c:'operators',t:[{b:{c:'sensing',t:['滑鼠鍵被按下？']}},'不成立']}}]}
          ]}
        ],body2:[
          {k:'stack',c:'looks',t:['圖像效果',{d:'幻影'},'設為',{n:80}]}
        ]}
      ]}
    ]}
  ]}
];
SCRIPTS.looseSound=[
  {k:'stack',c:'sound',t:['播放音效',{d:'Chill'}],note:'沒有接在任何程式上；旁邊的註解說「不要傻傻的用下面那一個」'}
];
SCRIPTS.looseSin=[
  {k:'stack',c:'operators',t:[{d:'sin'},'數值',{s:''}],note:'沒有接在任何程式上；註解寫著「ＳＩＮ」'}
];
