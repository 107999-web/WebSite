/* =========================================================
   lesson.js — 動畫製作互動教學的所有示範
   ========================================================= */
(function(){
'use strict';
function $(id){return document.getElementById(id);}
function store(key,val){
  try{
    if(val===undefined){var r=localStorage.getItem(key);return r?JSON.parse(r):null;}
    localStorage.setItem(key,JSON.stringify(val));return true;
  }catch(e){return val===undefined?null:false;}
}

/* ---------- 積木 ---------- */
if(window.BLK&&window.SCRIPTS)BLK.auto(SCRIPTS);

/* ---------- 0 投影片翻閱器 ---------- */
var SLIDES=[
 '封面：「嚴禁不思考原理就直接複製！請好好理解」',
 '自我介紹：很多同學在製作動畫時無法流暢切換畫面，這個教學就是要來拯救你們',
 '第 1 章：製作動畫的步驟（僅供參考）',
 '看題目 → 想劇情 → 決定架構；手繪分鏡「貓的幸福人生」',
 '分鏡的結尾要呼應主題；事先規劃才不會手忙腳亂',
 '不建議動畫一次播到底；秒數不要寫死，一個廣播一個動作才能同步',
 '有時間的話，做一段開頭動畫',
 '第 2 章：廣播訊息',
 '在某個地方廣播訊息，在其他地方接收後執行動作；命名要清楚',
 '每個角色負責不同畫面；也可以用分身，依條件判斷各做各的事',
 '先想好誰在什麼時候要出現・消失；角色命名加上畫面編號',
 '第 3 章：動畫應該要有哪些元素',
 '畫面・劇情・字幕・配音——好看、好看、看得懂、聽得見',
 '第 4 章：我的程式機密',
 '機密一（前）：每一頁都拼「造型換成」＋「播放音效直到結束」，太麻煩了',
 '機密一：用「定義」積木做「換頁（造型）」，造型和音效名稱統一',
 '機密二：用幻影慢慢浮現；機密三：用 sin 讓角色擺動',
 '結語：可以看看這個教學內部程式，有更多教學'
];
var CHIPS=[['封面',1],['1 步驟',3],['2 廣播',8],['3 元素',12],['4 機密',14],['結語',18]];
var cur=1, N=SLIDES.length;
function src(i){return 'assets/slides/s'+(i<10?'0':'')+i+'.jpg';}
function show(i){
  cur=Math.max(1,Math.min(N,i));
  $('vImg').src=src(cur); $('vImg').alt='原作投影片第 '+cur+' 頁';
  $('vCnt').textContent=cur+' / '+N;
  $('vCap').innerHTML='<b>第 '+cur+' 頁</b>　'+SLIDES[cur-1];
  $('vPrev').disabled=cur===1; $('vNext').disabled=cur===N;
  var on=0; CHIPS.forEach(function(c,k){if(cur>=c[1])on=k;});
  [].forEach.call($('vChips').children,function(b,k){b.classList.toggle('on',k===on);});
  [].forEach.call($('vThumbs').children,function(b,k){b.classList.toggle('on',k+1===cur);});
}
if($('viewer')){
  CHIPS.forEach(function(c){
    var b=document.createElement('button');b.textContent=c[0];
    b.addEventListener('click',function(){show(c[1]);});$('vChips').appendChild(b);
  });
  for(var i=1;i<=N;i++)(function(i){
    var b=document.createElement('button');b.setAttribute('aria-label','第 '+i+' 頁');
    b.innerHTML='<img loading="lazy" src="'+src(i)+'" alt=""><span>'+i+'</span>';
    b.addEventListener('click',function(){show(i);$('viewer').scrollIntoView({behavior:'smooth',block:'center'});});
    $('vThumbs').appendChild(b);
  })(i);
  $('vPrev').addEventListener('click',function(){show(cur-1);});
  $('vNext').addEventListener('click',function(){show(cur+1);});
  document.addEventListener('keydown',function(e){
    if($('lbx').classList.contains('on')){if(e.key==='Escape')closeLbx();return;}
    var t=e.target.tagName; if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;
    var r=$('viewer').getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight)return;
    if(e.key==='ArrowLeft'){show(cur-1);e.preventDefault();}
    if(e.key==='ArrowRight'){show(cur+1);e.preventDefault();}
  });
  show(1);
}

/* 引用處的「看原投影片」→ 燈箱 */
function openLbx(i){
  $('lbxImg').src=src(i); $('lbxImg').alt='原作投影片第 '+i+' 頁';
  $('lbxCap').innerHTML='<b>原作第 '+i+' 頁</b>　'+SLIDES[i-1];
  $('lbx').classList.add('on'); $('lbxClose').focus();
}
function closeLbx(){$('lbx').classList.remove('on');}
document.addEventListener('click',function(e){
  var a=e.target.closest('[data-slide]'); if(!a)return;
  e.preventDefault(); openLbx(+a.getAttribute('data-slide'));
});
if($('lbx')){
  $('lbxClose').addEventListener('click',closeLbx);
  $('lbx').addEventListener('click',function(e){if(e.target===$('lbx'))closeLbx();});
}

/* ---------- 1.1 流程 ---------- */
var FLOW=[
 '<b>看題目：</b>把題目要求的每一項列出來（例如「至少三種生物」「兩種結局」），做完一項打一個勾。<b>先看懂題目在考什麼</b>，後面才不會做白工。',
 '<b>想劇情：</b>把故事分成幾段，每段一句話寫下來。像昀宸把「貓的幸福人生」分成<b>出生、流浪、領養</b>三段，第 2 段再展開成好幾個小情節。',
 '<b>決定架構：</b>每一段是一個分鏡，寫下<b>哪些角色出現、哪些要消失、結束時廣播什麼</b>。這一步做完，寫程式就只是照表施工。下面的「我的分鏡表」就是用來做這件事的。'
];
if($('flow')){
  var fb=$('flow').querySelectorAll('.st');
  fb.forEach(function(b){b.addEventListener('click',function(){
    fb.forEach(function(x){x.classList.toggle('on',x===b);});
    $('flowdet').innerHTML=FLOW[+b.getAttribute('data-i')];
  });});
  $('flowdet').innerHTML=FLOW[0];
}

/* ---------- 1.2 分鏡表 ---------- */
var SBKEY='anim2026.storyboard';
var SBEX=[
 ['開頭','標題「貓的幸福人生」出現','開頭動畫','—','1 出生'],
 ['1','貓咪出生，離開媽媽','貓媽媽、小貓、字幕','開頭動畫','2 流浪'],
 ['2','開始流浪：好心人餵飯、流浪狗出場、好餓','小貓、好心人、流浪狗、字幕','貓媽媽','3 領養'],
 ['3','動保人員把小貓送到中途之家','小貓、動保人員、字幕','好心人、流浪狗','結尾'],
 ['結尾','小貓有了家，呼應「幸福人生」','小貓、新主人、字幕','動保人員','（無）']
];
function sbRows(){return [].map.call($('sbTable').tBodies[0].rows,function(tr){
  return [].map.call(tr.querySelectorAll('input,textarea'),function(x){return x.value;});});}
function sbSave(){
  var ok=store(SBKEY,sbRows());
  $('sbSave').textContent=ok?'已自動儲存　'+new Date().toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'}):'這個瀏覽器不讓網頁儲存資料，請記得列印或截圖保存。';
}
function sbAdd(v){
  v=v||['','','','',''];
  var tr=document.createElement('tr');
  tr.innerHTML='<td><input value=""></td><td><textarea></textarea></td><td><textarea></textarea></td><td><textarea></textarea></td><td><input value=""></td>';
  var f=tr.querySelectorAll('input,textarea'); f.forEach(function(x,i){x.value=v[i]||'';});
  $('sbTable').tBodies[0].appendChild(tr);
}
if($('sbTable')){
  var saved=store(SBKEY);
  (saved&&saved.length?saved:[['開頭'],['1'],['2'],['3'],['結尾']]).forEach(sbAdd);
  $('sbTable').addEventListener('input',sbSave);
  $('sbAdd').addEventListener('click',function(){sbAdd([String($('sbTable').tBodies[0].rows.length)]);sbSave();});
  $('sbDel').addEventListener('click',function(){var b=$('sbTable').tBodies[0];if(b.rows.length>1){b.deleteRow(-1);sbSave();}});
  $('sbEx').addEventListener('click',function(){
    var has=sbRows().some(function(r){return r.slice(1).some(function(x){return x.trim();});});
    if(has&&!window.confirm('要用範例蓋掉你已經填的內容嗎？'))return;
    $('sbTable').tBodies[0].innerHTML=''; SBEX.forEach(sbAdd); sbSave();
  });
  $('sbPrint').addEventListener('click',function(){
    var w=window.open('','_blank'); if(!w)return;
    var rows=sbRows().map(function(r){return '<tr>'+r.map(function(c){return '<td>'+c.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/\n/g,'<br>')+'</td>';}).join('')+'</tr>';}).join('');
    w.document.write('<!doctype html><meta charset="utf-8"><title>我的分鏡表</title><style>body{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;padding:14mm}h1{font-size:18pt}table{border-collapse:collapse;width:100%;font-size:11pt}th,td{border:1px solid #666;padding:6px 8px;vertical-align:top}th{background:#eee}td:first-child{white-space:nowrap}p{font-size:10pt;color:#555}</style><h1>我的分鏡表</h1><p>姓名：＿＿＿＿＿＿　作品名稱：＿＿＿＿＿＿＿＿＿＿</p><table><tr><th>分鏡</th><th>畫面內容</th><th>出現的角色</th><th>要消失的角色</th><th>結束時廣播</th></tr>'+rows+'</table><script>setTimeout(function(){print()},300)<\/script>');
    w.document.close();
  });
}

/* ---------- 1.4 秒數寫死 vs 廣播 ---------- */
var SPAN=7;
function seg(track,a,b,cls,txt){
  if(b<=a)return;
  var d=document.createElement('div');d.className='tseg '+cls;
  d.style.left=(a/SPAN*100)+'%';d.style.width=((b-a)/SPAN*100)+'%';d.textContent=txt||'';track.appendChild(d);
}
function syncDraw(){
  var L=+$('syncLen').value; $('syncLenO').textContent=L;
  ['trA1','trB1','trA2','trB2'].forEach(function(id){$(id).innerHTML='<div class="tplay"></div>';});
  seg($('trA1'),0,L,'a','說話 '+L+' 秒');
  if(L>3){seg($('trB1'),3,SPAN,'b','出場');seg($('trB1'),3,L,'clash','搶話');}
  else seg($('trB1'),3,SPAN,'b','出場');
  seg($('trA2'),0,L,'a','說話 '+L+' 秒');
  seg($('trB2'),L,SPAN,'b','出場');
  var v=$('syncV1');
  if(L>3){v.className='verdict no';v.textContent='✗ 媽媽還沒講完，小貓就出場了：搶話 '+(L-3)+' 秒';}
  else if(L<3){v.className='verdict mid';v.textContent='△ 媽媽講完後，畫面空等了 '+(3-L)+' 秒才輪到小貓（冷場）';}
  else {v.className='verdict ok';v.textContent='✓ 剛好 3 秒——但只要重錄一次台詞，就可能不準了';}
  $('syncV2').textContent='✓ 不管台詞多長，小貓都在媽媽講完的那一刻出場';
  var ax=$('syncAxis'); ax.innerHTML='';
  for(var s=0;s<=SPAN;s++){var sp=document.createElement('span');sp.style.left=(s/SPAN*100)+'%';sp.textContent=s+'s';ax.appendChild(sp);}
}
if($('syncLab')){
  $('syncLen').addEventListener('input',syncDraw); syncDraw();
  $('syncPlay').addEventListener('click',function(){
    var ph=document.querySelectorAll('#syncLab .tplay'), t0=performance.now(), dur=3500;
    (function step(now){
      var k=Math.min(1,(now-t0)/dur);
      ph.forEach(function(p){p.style.left=(k*100)+'%';});
      if(k<1)requestAnimationFrame(step);
    })(t0);
  });
}

/* ---------- 2.1 廣播示範 ---------- */
if($('bcLab')){
  var bcT=[];
  function bcReset(){
    bcT.forEach(clearTimeout);bcT=[];
    $('bcTitle').classList.remove('off');$('bcCat').classList.add('off');$('bcSub').classList.add('off');
    $('bcCat').style.top='38%';
    ['rc1','rc2','rc3'].forEach(function(id){$(id).classList.remove('fire');});
  }
  $('bcGo').addEventListener('click',function(){
    bcReset();
    var w=$('bcWave');w.classList.remove('go');void w.offsetWidth;w.classList.add('go');
    ['rc1','rc2','rc3'].forEach(function(id){$(id).classList.add('fire');});
    $('bcTitle').classList.add('off');
    $('bcSub').classList.remove('off');
    $('bcCat').classList.remove('off');
    bcT.push(setTimeout(function(){$('bcCat').style.top='56%';},60));
    bcT.push(setTimeout(function(){['rc1','rc2','rc3'].forEach(function(id){$(id).classList.remove('fire');});},1400));
  });
  $('bcReset').addEventListener('click',bcReset);
}

/* ---------- 2.2 命名測驗 ---------- */
var NAMES=[
 {t:'message1',k:'訊息',g:0,why:'這是 Scratch 自動取的名字。訊息一多，完全看不出 message1 是哪一段、要做什麼。'},
 {t:'第1段 開始',k:'訊息',g:1,why:'一看就知道是第 1 段要開始了，所有角色收到後各自進場。'},
 {t:'角色7',k:'角色',g:0,why:'不知道它長什麼樣、在哪個畫面出現。出問題時要一個一個點開找。'},
 {t:'動畫1-1 貓媽媽',k:'角色',g:1,why:'這就是昀宸建議的：名字裡加上「在哪個畫面出現」，再加上它是誰。'},
 {t:'開場 落下速度',k:'變數',g:1,why:'昀宸自己作品裡的變數名稱：哪一段（開場）、做什麼用（落下速度）都寫清楚了。'},
 {t:'a',k:'變數',g:0,why:'一個字母，過一個禮拜連你自己都忘記它是什麼。'},
 {t:'costume3',k:'造型',g:0,why:'預設名字看不出內容。如果你要用第 4 章的「換頁」定義積木，造型還必須和音效同名，更要好好取名。'},
 {t:'2-3 小貓被領養',k:'訊息',g:1,why:'第 2 段的第 3 個畫面、發生什麼事，一清二楚。照編號排也不會亂。'},
 {t:'my variable',k:'變數',g:0,why:'新專案預設就有的變數。用不到就刪掉——昀宸在專案裡特地留了一個變數叫「像這種變數，用不到，就應該刪掉」。'}
];
if($('names')){
  var right=0;
  function nmBuild(){
    right=0;$('nmScore').textContent=0;$('nmTotal').textContent=NAMES.length;$('names').innerHTML='';
    NAMES.forEach(function(n){
      var d=document.createElement('div');d.className='nm';
      d.innerHTML='<div class="nt">'+n.t+'<small>'+n.k+'名稱</small></div>'+
        '<div class="bt"><button data-v="1">👍 好</button><button data-v="0">👎 不好</button></div>'+
        '<div class="fb"></div>';
      d.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){
        if(d.classList.contains('done'))return;
        var ok=(+b.getAttribute('data-v'))===n.g;
        d.classList.add('done',ok?'right':'wrong');
        if(ok){right++;$('nmScore').textContent=right;}
        d.querySelector('.fb').innerHTML=(ok?'✓ 答對了！':'✗ 再想想。')+(n.g?'這是好名字：':'這個名字不好：')+n.why;
      });});
      $('names').appendChild(d);
    });
  }
  nmBuild(); $('nmReset').addEventListener('click',nmBuild);
}

/* ---------- 3 字幕比較 ---------- */
var SUBTXT={
 say:'<b style="color:var(--no)">用「說出」的問題</b><ul style="margin:6px 0 0;padding-left:1.2em"><li>泡泡的字體、大小、顏色都不能改。</li><li>字一多，泡泡就變得很大，<b>擋住畫面</b>。</li><li>泡泡跟著角色走，角色一移動或靠近舞台邊緣，泡泡位置就跑掉。</li></ul>',
 cos:'<b style="color:var(--ok)">用字幕造型的好處</b><ul style="margin:6px 0 0;padding-left:1.2em"><li>固定在畫面下方，<b>觀眾永遠知道往哪裡看</b>。</li><li>字體、大小、顏色自己決定，還能標出是誰在說話。</li><li>字幕造型和配音取一樣的名字，就能搭配第 4 章的「換頁」定義積木，一塊積木同時換字幕、放配音。</li></ul>'
};
if($('subSeg')){
  function subSet(m){
    [].forEach.call($('subSeg').children,function(b){b.classList.toggle('on',b.getAttribute('data-m')===m);});
    $('subBub').style.display=m==='say'?'':'none'; $('subBar').style.display=m==='cos'?'':'none';
    $('subTxt').innerHTML=SUBTXT[m];
  }
  $('subSeg').addEventListener('click',function(e){var b=e.target.closest('button');if(b)subSet(b.getAttribute('data-m'));});
  subSet('say');
}

/* ---------- 4.1 積木數量 ---------- */
if($('pgN')){
  function pg(){
    var n=+$('pgN').value; $('pgNO').textContent=n;
    var a=2*n,b=3+n; $('pgA').textContent=a; $('pgB').textContent=b;
    $('pgTxt').innerHTML=a>b?'少拼 <b>'+(a-b)+'</b> 塊積木。更重要的是：哪天想改成「換造型後先等 0.5 秒再播音效」，只要改定義裡那一處，不用改 '+n+' 次。'
      :'頁數很少時差不多；但頁數一多，差距就越來越大。';
  }
  $('pgN').addEventListener('input',pg); pg();
}

/* ---------- 4.2 幻影淡入 ---------- */
if($('fdGo')){
  var fdTimer=null;
  function fdCalc(){
    var n=+$('fdN').value,s=+$('fdS').value,w=+$('fdW').value;
    $('fdNO').textContent=n;$('fdSO').textContent=s;
    var raw=100+n*s, end=Math.max(0,Math.min(100,raw)), frame=Math.max(w,1/30);
    $('fdEnd').textContent=end; $('fdT').textContent=(n*frame).toFixed(2);
    var v=$('fdVerdict');
    if(raw===0){v.className='verdict ok';v.textContent='✓ 剛好：'+n+' × '+(-s)+' = 100，最後完全看得見。';}
    else if(raw>0){v.className='verdict no';v.textContent='✗ 只減了 '+(n*-s)+'，最後停在幻影 '+raw+'，角色還是半透明的。';}
    else{v.className='verdict mid';v.textContent='△ 看起來沒問題，但做到第 '+Math.ceil(100/-s)+' 次就已經到 0 了，後面幾次是白做（Scratch 會把幻影限制在 0～100）。';}
    return {n:n,s:s,frame:frame};
  }
  function fdShow(g){$('fdV').textContent=g;$('fdWho').style.opacity=(100-g)/100;$('fdBar').style.width=(100-g)+'%';}
  ['fdN','fdS','fdW'].forEach(function(id){$(id).addEventListener('input',fdCalc);});
  $('fdGo').addEventListener('click',function(){
    clearTimeout(fdTimer); var c=fdCalc(), g=100, k=0; fdShow(g);
    var slow=c.frame<0.05?3:1; /* 太快看不清楚時放慢 3 倍顯示 */
    (function step(){
      if(k>=c.n)return; k++; g=Math.max(0,Math.min(100,g+c.s)); fdShow(g);
      fdTimer=setTimeout(step,c.frame*1000*slow);
    })();
  });
  fdCalc(); fdShow(0);
}

/* ---------- 4.3 sin 擺動 ---------- */
if($('snArm')){
  var snT=0,last=performance.now(),paused=false,hist=[];
  var cv=$('snC'),cx=cv.getContext('2d');
  function snUI(){
    var A=+$('snA').value,B=+$('snB').value;
    $('snAO').textContent=A;$('snBO').textContent=B;$('snAO2').textContent=A;$('snBO2').textContent=B;
    $('snR').textContent=(90-B)+'°～'+(90+B)+'°';
  }
  ['snA','snB'].forEach(function(id){$(id).addEventListener('input',snUI);}); snUI();
  $('snPause').addEventListener('click',function(){paused=!paused;this.textContent=paused?'▶ 繼續':'⏸ 暫停';last=performance.now();});
  function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#999';}
  (function loop(now){
    var dt=(now-last)/1000; last=now;
    if(!paused&&dt<0.5){
      snT+=dt;
      var A=+$('snA').value,B=+$('snB').value;
      var x=snT*A, s=Math.sin(x*Math.PI/180), m=s*B, d=m+90;
      $('snArm').style.transform='rotate('+(d-90)+'deg)';
      $('snT').textContent=snT.toFixed(2);$('snX').textContent=Math.round(x);
      $('snS').textContent=s.toFixed(2);$('snM').textContent=m.toFixed(1);$('snD').textContent=d.toFixed(1)+'°';
      hist.push([snT,d]); while(hist.length&&hist[0][0]<snT-6)hist.shift();
      var W=cv.width,H=cv.height; cx.clearRect(0,0,W,H);
      cx.font='20px sans-serif'; cx.fillStyle=css('--ink2');
      [[150,'150°'],[90,'90°'],[30,'30°']].forEach(function(r){
        var y=H/2-(r[0]-90)/60*(H/2-16);
        cx.strokeStyle=css('--line');cx.lineWidth=r[0]===90?2:1;cx.beginPath();cx.moveTo(52,y);cx.lineTo(W,y);cx.stroke();
        cx.fillText(r[1],2,y+7);
      });
      cx.strokeStyle=css('--accent');cx.lineWidth=4;cx.beginPath();
      hist.forEach(function(p,i){var X=52+(p[0]-(snT-6))/6*(W-56),Y=H/2-(p[1]-90)/60*(H/2-16);if(i)cx.lineTo(X,Y);else cx.moveTo(X,Y);});
      cx.stroke();
    }
    requestAnimationFrame(loop);
  })(last);
}

/* ---------- 5.1 背景音樂 ---------- */
if($('mzGo')){
  var mzRun=null;
  $('mzGo').addEventListener('click',function(){
    cancelAnimationFrame(mzRun); var t0=performance.now(), LEN=4, TOTAL=6;
    $('mzV').className='verdict';$('mzV').textContent='';
    (function step(now){
      var t=Math.min(TOTAL,(now-t0)/1000);
      $('mzA').style.width=((t%LEN)/LEN*100)+'%'; $('mzAn').textContent='第 '+(Math.floor(t/LEN)+1)+' 次';
      var fr=Math.floor(t*30); $('mzB').style.width=(((t*30)%1)/30/LEN*100)+'%'; $('mzBn').textContent='第 '+(fr+1)+' 次';
      if(t<TOTAL)mzRun=requestAnimationFrame(step);
      else{$('mzV').className='verdict ok';$('mzV').innerHTML='6 秒裡：「直到結束」完整播完一次、開始第 2 次；只有「播放音效」被重新開始了 <b>'+(fr+1)+'</b> 次，每次都只播了 1/30 秒。';}
    })(t0);
  });
}

/* ---------- 5.3 造型編號循環 ---------- */
if($('cyc')){
  var CN=18,cc=1;
  for(var j=1;j<=CN;j++){var sp=document.createElement('span');sp.textContent=j;$('cyc').appendChild(sp);}
  function cyShow(msg){[].forEach.call($('cyc').children,function(s,k){s.classList.toggle('on',k+1===cc);});$('cyLog').innerHTML=msg||'';}
  $('cyP').addEventListener('click',function(){
    var want=cc-1;
    if(want<1){cc=CN;cyShow('造型換成 <b>'+want+'</b> → 超出範圍，Scratch 繞一圈到<b>最後一個</b>（第 '+CN+' 個）');}
    else{cc=want;cyShow('造型換成 '+(cc+1)+' − 1 = <b>'+cc+'</b>');}
  });
  $('cyN').addEventListener('click',function(){
    if(cc===CN){cc=1;cyShow('已經是最後一個，「造型換成下一個」會<b>回到第 1 個</b>');}
    else{cc++;cyShow('換成下一個：第 <b>'+cc+'</b> 個');}
  });
  $('cyR').addEventListener('click',function(){cc=1;cyShow('回到第 1 個（這就是「初始化」）');});
  cyShow('目前是第 1 個造型');
}

/* ---------- 5.5 按住滑鼠 ---------- */
function holdPad(id,good){
  var el=$(id),n=0,page=1,timer=null,down=false,waiting=false;
  function ui(){$(id+'N').textContent=n;$(id+'P').textContent='第 '+page+' 頁';}
  function tick(){
    if(!down){waiting=false;return;}
    if(good&&waiting)return;
    n++; page=page%18+1; ui(); if(good)waiting=true;
  }
  function start(e){e.preventDefault();down=true;el.classList.add('down');tick();clearInterval(timer);timer=setInterval(tick,1000/30);}
  function stop(){down=false;waiting=false;el.classList.remove('down');clearInterval(timer);}
  el.addEventListener('pointerdown',start);
  ['pointerup','pointerleave','pointercancel'].forEach(function(ev){el.addEventListener(ev,stop);});
  return {reset:function(){stop();n=0;page=1;ui();}};
}
if($('hpBad')){
  var h1=holdPad('hpBad',false),h2=holdPad('hpGood',true);
  $('hpR').addEventListener('click',function(){h1.reset();h2.reset();});
}

/* ---------- 6 自我檢核 ---------- */
var CHK=[
 '動手前先寫好<b>分鏡表</b>，記下每個角色在哪個分鏡出現。',
 '一個主題不只一個畫面，故事有開頭、發展、結尾，最後<b>呼應主題</b>。',
 '每一段都用<b>廣播</b>分開，可以單獨測試，不是一次播到底。',
 '沒有用「等待幾秒」去<b>猜</b>別的角色什麼時候做完。',
 '訊息、角色、變數、造型都取了<b>一看就懂</b>的名字。',
 '每個分鏡該出現、該消失的角色都處理了，沒有上一段的角色殘留。',
 '作品有<b>畫面、劇情、字幕、配音</b>四個元素。',
 '字幕用造型或固定位置的角色呈現，看得清楚、不擋畫面。',
 '重複的「換造型＋播音效」做成<b>定義積木</b>，而且造型和音效名稱一致。',
 '按綠旗時會<b>初始化</b>：造型、位置、圖層、圖像效果都回到開頭的樣子。',
 '背景音樂用「播放音效 … <b>直到結束</b>」放在重複無限次裡循環。',
 '可以點的按鈕有「碰到時變清楚」的提示，而且<b>按住不會重複觸發</b>。',
 '刪掉了<b>用不到</b>的變數、角色和零散積木。'
];
var CKEY='anim2026.check';
function tocProg(){
  var all=document.querySelectorAll('#chk input'),n=document.querySelectorAll('#chk input:checked').length;
  if($('tocProg'))$('tocProg').textContent=n+' / '+all.length;
  if($('tocBar'))$('tocBar').style.width=(all.length?n/all.length*100:0)+'%';
}
if($('chk')){
  var ck=store(CKEY)||{};
  CHK.forEach(function(t,i){
    var l=document.createElement('label');
    l.innerHTML='<input type="checkbox" data-i="'+i+'"'+(ck[i]?' checked':'')+'><span>'+t+'</span>';
    $('chk').appendChild(l);
  });
  $('chk').addEventListener('change',function(e){
    var i=e.target.getAttribute('data-i'); if(i==null)return;
    if(e.target.checked)ck[i]=1; else delete ck[i]; store(CKEY,ck); tocProg();
  });
  tocProg();
}

/* ---------- 6 小測驗 ---------- */
var QZ=[
 {q:'配音的長度常常會變。要讓小貓在貓媽媽<b>講完之後</b>才出場，最好的做法是？',
  o:['小貓「等待 3 秒」再顯示','貓媽媽「播放音效 … 直到結束」後廣播訊息，小貓收到訊息才顯示','兩個角色都從綠旗開始，希望剛好對上'],a:1,
  e:'這就是昀宸說的「一個廣播一個動作才能同步」。不管台詞多長，小貓都會在講完的那一刻出場。'},
 {q:'想讓背景音樂一直循環，「重複無限次」裡面要放哪一塊？',
  o:['播放音效 Chill','播放音效 Chill 直到結束','停播所有音效'],a:1,
  e:'「播放音效」不會等播完，每一圈都把音樂拉回開頭；「直到結束」會等整首播完才進入下一圈。'},
 {q:'「圖像效果 幻影 設為 100」之後重複 20 次，每次要改變多少，才會<b>剛好</b>變回完全看得見？',
  o:['−10','−5','−20'],a:1,
  e:'重複次數 × 每次改變的量 ＝ 100。20 × 5 ＝ 100，所以每次改變 −5。'},
 {q:'「面朝 ( sin 數值 (計時器 × 100) × 20 ＋ 90 ) 度」，角色會在什麼範圍擺動？',
  o:['70° 到 110°','80° 到 100°','0° 到 180°'],a:0,
  e:'sin 的結果在 −1 到 1 之間，乘 20 變成 −20 到 20，再加 90，就是 70° 到 110°。'},
 {q:'用「換頁（造型）」定義積木時，「換頁 3」造型有換，卻<b>沒有聲音</b>。最可能的原因是？',
  o:['造型 3 對應的音效，名字不是「3」','定義積木只能用一次','參數裡不能放數字'],a:0,
  e:'同一個參數同時拿去找造型和音效，所以兩邊名字必須一樣。名字不同時 Scratch 不會報錯，只是安靜無聲。'},
 {q:'「如果 滑鼠鍵被按下？那麼 廣播訊息 下一頁」後面要加什麼，<b>按住滑鼠</b>時才不會一直翻頁？',
  o:['等待 1 秒','等待直到 〈滑鼠鍵被按下？〉不成立','停止 全部'],a:1,
  e:'廣播完就停在原地，等滑鼠放開才繼續，所以按一次只算一次。「等待 1 秒」按太久還是會重複。'}
];
if($('qz')){
  var got=0,done=0;
  function qzBuild(){
    got=0;done=0;$('qz').innerHTML='';$('qzScore').textContent='';
    QZ.forEach(function(q,i){
      var d=document.createElement('div');d.className='qz';
      d.innerHTML='<div class="qq">'+(i+1)+'. '+q.q+'</div><div class="ops">'+
        q.o.map(function(o,k){return '<button data-k="'+k+'">'+String.fromCharCode(65+k)+'　'+o+'</button>';}).join('')+
        '</div><div class="ex">'+q.e+'</div>';
      d.querySelectorAll('.ops button').forEach(function(b){b.addEventListener('click',function(){
        if(d.classList.contains('done'))return;
        var k=+b.getAttribute('data-k'); d.classList.add('done'); done++;
        d.querySelectorAll('.ops button')[q.a].classList.add('r');
        if(k===q.a)got++; else b.classList.add('w');
        $('qzScore').textContent='　目前 '+got+' / '+done+(done===QZ.length?'（全部完成）':'');
      });});
      $('qz').appendChild(d);
    });
  }
  qzBuild(); $('qzReset').addEventListener('click',qzBuild);
}

/* ---------- 目錄：目前位置 ---------- */
if('IntersectionObserver' in window&&$('toc')){
  var links={};
  [].forEach.call(document.querySelectorAll('#toc a[href^="#"]'),function(a){links[a.getAttribute('href').slice(1)]=a;});
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting&&links[e.target.id]){
        [].forEach.call(document.querySelectorAll('#toc a'),function(a){a.classList.remove('on');});
        links[e.target.id].classList.add('on');
      }
    });
  },{rootMargin:'-20% 0px -70% 0px'});
  Object.keys(links).forEach(function(id){var el=$(id);if(el)io.observe(el);});
}
})();
