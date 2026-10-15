/* 爆炸頭節奏大師：教學頁互動示範 */
(function(){
  BLK.auto(SCRIPTS);
  var $ = function(id){return document.getElementById(id);};

  /* ================= 手勢判斷實驗室 ================= */
  var NS='http://www.w3.org/2000/svg';
  var svg=$('gsvg');
  if(svg){
    // 舞台座標（y 往上）；畫到 SVG 時 y 取負號
    var P={1:[0,-110],6:[-24,-38],10:[0,-35],9:[-22,25],13:[2,-55]};
    var STATIC=[ // 其他手指（示意，固定不動）
      [[0,-110],[30,-95],[42,-72],[36,-58]],     // 拇指
      [[20,-40],[26,-52],[18,-62]],               // 無名指（彎）
      [[36,-50],[40,-60],[33,-68]]                // 小指（彎）
    ];
    var PRESET={fist:{9:[-18,-62],13:[2,-58]},left:{9:[-88,-40],13:[2,-58]},right:{9:[40,-40],13:[2,-58]},
                up:{9:[-22,26],13:[2,-58]},open:{9:[-22,26],13:[4,32]}};
    var thr=0.6, drag=null;
    function el(n,a){var e=document.createElementNS(NS,n);for(var k in a)e.setAttribute(k,a[k]);return e;}
    function draw(){
      svg.innerHTML='';
      svg.appendChild(el('path',{d:'M-150 0H150M0 -150V150',stroke:'#34445C','stroke-width':1}));
      svg.appendChild(el('path',{d:'M'+P[1][0]+' '+(-P[1][1])+' L'+P[6][0]+' '+(-P[6][1])+' L'+P[10][0]+' '+(-P[10][1])+' Z',fill:'#FFD9B033',stroke:'#FFD9B0','stroke-width':2}));
      STATIC.forEach(function(f){
        svg.appendChild(el('polyline',{points:f.map(function(p){return p[0]+','+(-p[1]);}).join(' '),fill:'none',stroke:'#8FA3BF','stroke-width':4,'stroke-linecap':'round','stroke-linejoin':'round'}));
      });
      svg.appendChild(el('line',{x1:P[1][0],y1:-P[1][1],x2:P[10][0],y2:-P[10][1],stroke:'#FF8C1A','stroke-width':3,'stroke-dasharray':'5 4'}));
      svg.appendChild(el('line',{x1:P[6][0],y1:-P[6][1],x2:P[9][0],y2:-P[9][1],stroke:'#4C97FF','stroke-width':6,'stroke-linecap':'round'}));
      svg.appendChild(el('line',{x1:P[10][0],y1:-P[10][1],x2:P[13][0],y2:-P[13][1],stroke:'#CF63CF','stroke-width':6,'stroke-linecap':'round'}));
      [1,6,10].forEach(function(k){
        svg.appendChild(el('circle',{cx:P[k][0],cy:-P[k][1],r:6,fill:'#fff'}));
        var t=el('text',{x:P[k][0]+8,y:-P[k][1]+4,fill:'#fff','font-size':11});t.textContent=k;svg.appendChild(t);
      });
      [9,13].forEach(function(k){
        var c=el('circle',{cx:P[k][0],cy:-P[k][1],r:11,fill:'#FFC83D',stroke:'#fff','stroke-width':2,'class':'pt','data-k':k});
        svg.appendChild(c);
        var t=el('text',{x:P[k][0],y:-P[k][1]+4,fill:'#3B2A00','font-size':10,'text-anchor':'middle','pointer-events':'none','font-weight':'bold'});t.textContent=k;svg.appendChild(t);
      });
      var lg=el('text',{x:-144,y:-134,fill:'#9FB3CC','font-size':10});lg.textContent='橘虛線＝手掌（尺）　藍＝食指　紫＝中指';svg.appendChild(lg);
      calc();
    }
    function d(a,b){return Math.sqrt(Math.pow(a[0]-b[0],2)+Math.pow(a[1]-b[1],2));}
    function calc(){
      var palm=d(P[1],P[10]),idx=d(P[6],P[9]),mid=d(P[10],P[13]),dx=P[9][0]-P[6][0],dy=P[9][1]-P[6][1],lim=palm*thr;
      $('gPalm').textContent=palm.toFixed(1);$('gIdx').textContent=idx.toFixed(1);$('gMid').textContent=mid.toFixed(1);
      $('gTh').textContent=lim.toFixed(1);$('gDx').textContent=dx.toFixed(1);$('gDy').textContent=dy.toFixed(1);
      var res,step;
      if(mid>lim){res='其他（手張開）';step=1;}
      else if(idx<lim){res='拳 ✊';step=2;}
      else if(Math.abs(dx)>Math.abs(dy)){res=dx>0?'右 👉':'左 👈';step=3;}
      else {res=dy>0?'上 ☝️':'其他（往下指）';step=4;}
      $('gRes').textContent=res;
      document.querySelectorAll('#gSteps li').forEach(function(li){li.classList.toggle('on',+li.getAttribute('data-s')<=step);});
    }
    function toStage(ev){
      var r=svg.getBoundingClientRect();
      var x=(ev.clientX-r.left)/r.width*300-150, y=(ev.clientY-r.top)/r.height*300-150;
      return [Math.max(-145,Math.min(145,x)),Math.max(-145,Math.min(145,-y))];
    }
    svg.addEventListener('pointerdown',function(ev){
      var k=ev.target.getAttribute&&ev.target.getAttribute('data-k');
      if(k){drag=+k;svg.setPointerCapture(ev.pointerId);ev.preventDefault();}
    });
    svg.addEventListener('pointermove',function(ev){if(drag){P[drag]=toStage(ev);draw();}});
    svg.addEventListener('pointerup',function(){drag=null;});
    document.querySelectorAll('[data-pose]').forEach(function(b){
      b.addEventListener('click',function(){var p=PRESET[b.getAttribute('data-pose')];P[9]=p[9].slice();P[13]=p[13].slice();draw();});
    });
    $('gThr').addEventListener('input',function(){thr=+this.value;$('gThrO').textContent=thr.toFixed(2);calc();});
    draw();
  }

  /* ================= 上膛模擬器 ================= */
  var armed=0,cnt=0,first=true;
  document.querySelectorAll('#armBtns button').forEach(function(b){
    b.addEventListener('click',function(){
      var g=b.getAttribute('data-g'),log=$('armLog'),msg,cls='no';
      if(first){log.innerHTML='';first=false;}
      if(g==='拳'){ if(armed){msg='看到「拳」：已經上膛了，保持 1';} else {armed=1;msg='看到「拳」：上膛 ＝ 1（裝好了）';} }
      else if(g==='左'||g==='上'||g==='右'){
        if(armed){armed=0;cnt++;msg='看到「'+g+'」＋有上膛 → 💥 出招「'+g+'」！上膛 ＝ 0';cls='fire';}
        else msg='看到「'+g+'」，但沒有上膛 → 不算（要先握拳）';
      } else msg='看到「'+g+'」：什麼都不做（上膛維持 '+armed+'）';
      var div=document.createElement('div');div.className=cls;div.textContent=msg;log.prepend(div);
      $('armGun').textContent='上膛 ＝ '+armed;$('armGun').classList.toggle('on',!!armed);$('armCnt').textContent=cnt;
    });
  });

  /* ================= 節奏判定實驗室 ================= */
  var CYCLE=['-','左','上','右'], IMG={'左':'assets/img/hand_left.png','上':'assets/img/hand_up.png','右':'assets/img/hand_right.png'};
  var pattern=['左','-','右','-','左','-','右','-'];
  var slotsEl=$('rSlots');
  var R={phase:'待機',start:0,beat:0.8,tol:0.3,notes:[],next:0,err:0,hits:[],cur:0,raf:0};
  var AC=null;
  function beep(f,dur,vol){
    try{ if(!AC)AC=new (window.AudioContext||window.webkitAudioContext)();
      var o=AC.createOscillator(),g=AC.createGain();o.frequency.value=f;o.connect(g);g.connect(AC.destination);
      var t=AC.currentTime;g.gain.setValueAtTime(vol||0.25,t);g.gain.exponentialRampToValueAtTime(0.001,t+(dur||0.08));o.start(t);o.stop(t+(dur||0.08)+0.02);
    }catch(e){}
  }
  var TONE={'左':220,'上':330,'右':440};
  function renderSlots(){
    slotsEl.innerHTML='';
    pattern.forEach(function(c,i){
      var b=document.createElement('button');b.type='button';
      b.innerHTML='<small>'+(i+1)+'</small>'+(IMG[c]?'<img src="'+IMG[c]+'" alt="'+c+'">':'<span>·</span>');
      b.setAttribute('aria-label','第 '+(i+1)+' 拍：'+(c==='-'?'休息':c));
      if(R.cur===i+1&&(R.phase==='示範'||R.phase==='玩家'))b.classList.add('now');
      b.addEventListener('click',function(){if(R.phase!=='待機'&&R.phase!=='結果')return;pattern[i]=CYCLE[(CYCLE.indexOf(c)+1)%4];renderSlots();drawLine();});
      slotsEl.appendChild(b);
    });
  }
  function checkRule(){
    var bad=[];for(var i=0;i<7;i++){if(pattern[i]!=='-'&&pattern[i+1]!=='-')bad.push((i+1)+'、'+(i+2));}
    var e=$('rRule');if(!e)return;
    if(bad.length){e.textContent='⚠️ 第 '+bad.join('／')+' 拍的動作連在一起了，玩家來不及回到握拳。比賽規則要求動作之間要回到預備姿勢，請在中間加一個「-」。';e.style.color='var(--no)';}
    else{e.textContent='✓ 符合出題規則：每個動作後面都有休息拍。';e.style.color='var(--ok)';}
  }
  function drawLine(){
    var L=$('rLine'),W=8*R.beat,h='';
    pattern.forEach(function(c,i){
      var t=i*R.beat;
      h+='<span class="tick" style="left:'+(t/W*100)+'%">'+(i+1)+'</span>';
      if(c!=='-'){
        var a=Math.max(0,t-R.tol)/W*100,b=Math.min(W,t+R.tol)/W*100;
        h+='<div class="win" style="left:'+a+'%;width:'+(b-a)+'%"><span>'+c+'</span></div>';
      }
    });
    R.hits.forEach(function(x){h+='<div class="hit '+(x.g?'g':'b')+'" style="left:'+(Math.max(0,Math.min(W,x.t))/W*100)+'%"></div>';});
    if(R.phase==='玩家'){var now=performance.now()/1000-R.start;h+='<div class="cursor" style="left:'+(Math.max(0,Math.min(W,now))/W*100)+'%"></div>';}
    L.innerHTML=h;checkRule();
  }
  function setPhase(p){R.phase=p;$('rPhase').textContent=p;}
  function showJudge(j){var e=$('rJudge');e.textContent=j;e.className='judge '+j;$('rErr').textContent=R.err;
    if(j==='GOOD')beep(1320,0.12,0.2);else beep(140,0.18,0.2);}
  function sleepUntil(t){return new Promise(function(res){(function chk(){if(performance.now()/1000>=t)res();else R.raf=requestAnimationFrame(chk);})();});}
  async function runBeats(n,onBeat){
    R.start=performance.now()/1000;
    for(var k=1;k<=n;k++){R.cur=k;await sleepUntil(R.start+(k-1)*R.beat);if(R.stop)return;beep(1600,0.03,0.15);onBeat&&onBeat(k);renderSlots();}
    await sleepUntil(R.start+n*R.beat);
  }
  async function play(){
    R.stop=false;R.beat=+$('rBeat').value;R.tol=+$('rTol').value;R.hits=[];R.err=0;$('rErr').textContent=0;$('rJudge').textContent='';
    R.notes=[];pattern.forEach(function(c,i){if(c!=='-')R.notes.push({b:i+1,d:c});});
    drawLine();
    setPhase('示範');
    await runBeats(8,function(k){var c=pattern[k-1];if(c!=='-')beep(TONE[c],0.25,0.35);});
    setPhase('倒數');R.cur=0;renderSlots();
    await runBeats(4,function(k){$('rPhase').textContent=k<4?'倒數 '+(4-k):'GO!';});
    R.next=0;setPhase('玩家');
    var watch=setInterval(function(){
      if(R.phase!=='玩家')return;
      var t=performance.now()/1000-R.start;
      if(R.next<R.notes.length&&t>(R.notes[R.next].b-1)*R.beat+R.tol){R.err++;R.next++;showJudge('MISS');}
      drawLine();
    },20);
    await runBeats(8);
    clearInterval(watch);
    R.err+=Math.max(0,R.notes.length-R.next);R.next=R.notes.length;
    setPhase('結果');R.cur=0;renderSlots();drawLine();
    $('rPhase').textContent=R.err<2?'過關！🎉':'失敗…';$('rErr').textContent=R.err;
    if(R.err<2){[523,659,784,1047].forEach(function(f,i){setTimeout(function(){beep(f,0.15,0.25);},i*120);});}
    $('rStart').textContent='▶ 再玩一次';
  }
  function hit(d){
    if(R.phase!=='玩家'){ if(R.phase==='待機'||R.phase==='結果')beep(TONE[d],0.2,0.3); return; }
    beep(TONE[d],0.2,0.3);
    var t=performance.now()/1000-R.start, j;
    if(R.next<R.notes.length&&Math.abs(t-(R.notes[R.next].b-1)*R.beat)<R.tol){
      if(d===R.notes[R.next].d)j='GOOD';else{j='BAD';R.err++;}
      R.next++;
    } else {j='BAD';R.err++;}
    R.hits.push({t:t,g:j==='GOOD'});showJudge(j);drawLine();
  }
  if(slotsEl){
    renderSlots();drawLine();
    $('rBeat').addEventListener('input',function(){R.beat=+this.value;$('rBeatO').textContent=R.beat.toFixed(2);if(R.phase==='待機'||R.phase==='結果')drawLine();});
    $('rTol').addEventListener('input',function(){R.tol=+this.value;$('rTolO').textContent=R.tol.toFixed(2);if(R.phase==='待機'||R.phase==='結果')drawLine();});
    $('rStart').addEventListener('click',function(){if(R.phase==='待機'||R.phase==='結果')play();});
    document.querySelectorAll('.padbtns button').forEach(function(b){b.addEventListener('click',function(){hit(b.getAttribute('data-d'));});});
    document.addEventListener('keydown',function(e){
      var m={ArrowLeft:'左',ArrowUp:'上',ArrowRight:'右'}[e.key];
      if(m&&R.phase!=='待機'&&R.phase!=='結果'){e.preventDefault();if(!e.repeat)hit(m);}
    });
  }

  /* ================= 自我檢核（自動儲存） ================= */
  var KEY='afro2026.check', boxes=[].slice.call(document.querySelectorAll('#chk input'));
  function save(){
    var v=boxes.map(function(b){return b.checked?1:0;});
    try{localStorage.setItem(KEY,JSON.stringify(v));$('chkNote').textContent='已自動儲存在這台電腦的瀏覽器。';}
    catch(e){$('chkNote').textContent='這個瀏覽器不允許儲存，勾選結果在關閉頁面後會消失。';}
    var n=v.reduce(function(a,b){return a+b;},0);$('pbar').style.width=(n/boxes.length*100)+'%';
  }
  try{var old=JSON.parse(localStorage.getItem(KEY)||'[]');boxes.forEach(function(b,i){b.checked=!!old[i];});}catch(e){}
  boxes.forEach(function(b){b.addEventListener('change',save);});
  var n0=boxes.filter(function(b){return b.checked;}).length;if($('pbar'))$('pbar').style.width=(n0/Math.max(1,boxes.length)*100)+'%';

  /* ================= 目錄目前位置 ================= */
  var links=[].slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  function onScroll(){
    var cur=null;links.forEach(function(a){var s=document.querySelector(a.getAttribute('href'));if(s&&s.getBoundingClientRect().top<120)cur=a;});
    links.forEach(function(a){a.classList.toggle('on',a===cur);});
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
})();
