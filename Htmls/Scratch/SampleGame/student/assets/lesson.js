/* 部落樂舞・火堆旁的節奏：教學頁互動示範 */
(function(){
  BLK.auto(SCRIPTS);
  var $=function(id){return document.getElementById(id);};
  var NAME={1:'向左轉頭',2:'點頭',3:'向右轉頭'};
  var INST={1:'木鼓',2:'竹鐘',3:'沙鈴'};
  var ICON={1:'🥁',2:'🎐',3:'🪘'};
  var CLS={1:'a',2:'b',3:'c'};

  /* ============ 小小合成器（和 .sb3 的三個音色對應）============ */
  var AC=null;
  function ctx(){ if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}} return AC; }
  function beep(kind){
    var a=ctx(); if(!a)return;
    var t=a.currentTime, g=a.createGain(); g.connect(a.destination);
    if(kind===3){                                   // 沙鈴：雜訊
      var n=a.sampleRate*0.22, buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
      for(var i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.exp(-15*i/a.sampleRate);
      var src=a.createBufferSource();src.buffer=buf;
      var hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=2200;
      src.connect(hp);hp.connect(g);g.gain.value=0.35;src.start(t);return;
    }
    var o=a.createOscillator();o.connect(g);
    if(kind===1){o.type='sine';o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(70,t+0.3);g.gain.setValueAtTime(0.6,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.34);o.start(t);o.stop(t+0.36);}
    else{o.type='triangle';o.frequency.setValueAtTime(1319,t);g.gain.setValueAtTime(0.28,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.45);o.start(t);o.stop(t+0.47);}
  }
  function buzz(){
    var a=ctx(); if(!a)return; var t=a.currentTime,o=a.createOscillator(),g=a.createGain();
    o.type='square';o.frequency.setValueAtTime(196,t);o.frequency.exponentialRampToValueAtTime(120,t+0.4);
    g.gain.setValueAtTime(0.22,t);g.gain.exponentialRampToValueAtTime(0.001,t+0.42);
    o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+0.44);
  }

  /* ============ 1. 頭部動作實驗室 ============ */
  var yaw=0, pitch=0;                      // −1～1（轉頭）、−1～1（點頭）
  var TH={turn:18, nod:8};
  function ratios(){
    return {turn:Math.round(yaw*40), nod:Math.round(pitch*35)};
  }
  function judge(r){
    if(r.turn < -TH.turn)return ['左',1];
    if(r.turn >  TH.turn)return ['右',2];
    if(r.nod  >  TH.nod )return ['點頭',3];
    return ['預備',4];
  }
  function drawFace(){
    var r=ratios(), w=70, cx=240+yaw*0, nx=240+r.turn*1.6, ny=180-r.nod*1.5;
    var h=['<svg viewBox="0 0 480 360">',
      '<ellipse cx="240" cy="188" rx="'+w+'" ry="92" fill="#F3D3B3" stroke="#2B2233" stroke-width="4"/>',
      '<path d="M170 150 Q240 96 310 150" fill="#4A3A2E"/>',
      '<line x1="240" y1="96" x2="240" y2="280" stroke="#B07A55" stroke-dasharray="6 6" stroke-width="2"/>',
      '<line x1="170" y1="188" x2="310" y2="188" stroke="#B07A55" stroke-dasharray="6 6" stroke-width="2"/>',
      '<circle cx="'+(nx-34)+'" cy="'+(ny-26)+'" r="8" fill="#2B2233"/>',
      '<circle cx="'+(nx+34)+'" cy="'+(ny-26)+'" r="8" fill="#2B2233"/>',
      '<path d="M'+nx+' '+ny+' l-10 22 h20 Z" fill="#E0A97C" stroke="#2B2233" stroke-width="3"/>',
      '<circle cx="'+nx+'" cy="'+ny+'" r="6" fill="#D9534F"/>',
      '<path d="M'+(nx-24)+' '+(ny+50)+' Q'+nx+' '+(ny+64)+' '+(nx+24)+' '+(ny+50)+'" fill="none" stroke="#2B2233" stroke-width="4" stroke-linecap="round"/>',
      '<circle cx="170" cy="188" r="6" fill="#4C97FF"/><circle cx="310" cy="188" r="6" fill="#4C97FF"/>',
      '<circle cx="240" cy="96" r="6" fill="#3FAE6A"/><circle cx="240" cy="280" r="6" fill="#3FAE6A"/>',
      '<text x="318" y="192" font-size="13" fill="#9FB6CC">臉部左緣</text>',
      '<text x="96" y="192" font-size="13" fill="#9FB6CC">臉部右緣</text>',
      '<text x="250" y="92" font-size="13" fill="#9FB6CC">額頭頂端</text>',
      '<text x="250" y="296" font-size="13" fill="#9FB6CC">下巴</text>',
      '</svg>'];
    var r2=judge(r);
    // 標籤要和 SVG 一起重畫，不然 innerHTML 會把它刪掉
    $('fStage').innerHTML=h.join('')+'<div class="lab" id="fLab">'+r2[0]+'</div>';
    $('fTurn').textContent=r.turn; $('fNod').textContent=r.nod;
    $('fRes').textContent={'左':'向左轉頭 → 木鼓','右':'向右轉頭 → 沙鈴','點頭':'點頭 → 竹鐘','預備':'預備（臉朝正前方）'}[r2[0]];
    document.querySelectorAll('#fSteps li').forEach(function(li){li.classList.toggle('on',+li.getAttribute('data-s')===r2[1]);});
  }
  if($('fStage')){
    $('fYaw').addEventListener('input',function(){yaw=+this.value/100;$('fYawO').textContent=this.value;drawFace();});
    $('fPitch').addEventListener('input',function(){pitch=+this.value/100;$('fPitchO').textContent=this.value;drawFace();});
    $('fTh').addEventListener('input',function(){TH.turn=+this.value;$('fThO').textContent=this.value;drawFace();});
    $('fThN').addEventListener('input',function(){TH.nod=+this.value;$('fThNO').textContent=this.value;drawFace();});
    drawFace();
  }

  /* ============ 2. 亂數節奏產生器 ============ */
  var seq=[];
  function paintSeq(id,arr,opt){
    opt=opt||{};
    var h=arr.map(function(a,i){
      var cls='cell '+CLS[a]+(opt.on===i?' on':'')+(opt.mark&&opt.mark[i]?' '+opt.mark[i]:'');
      return '<div class="'+cls+'" title="'+NAME[a]+'（'+INST[a]+'）">'+ICON[a]+'</div>';
    });
    if(opt.ghost)for(var g=0;g<opt.ghost;g++)h.push('<div class="cell ghost">?</div>');
    $(id).innerHTML=h.join('')||'<span style="color:var(--ink2)">（清單是空的）</span>';
  }
  function seqNote(){
    $('genLen').textContent=seq.length;
    $('genList').textContent=seq.length?('['+seq.join(', ')+']'):'[ ]';
  }
  if($('genRow')){
    document.querySelectorAll('[data-gen]').forEach(function(b){
      b.addEventListener('click',function(){
        var a=b.getAttribute('data-gen');
        if(a==='一'){ seq=[]; var n=3+Math.floor(Math.random()*3);
          for(var i=0;i<n;i++)seq.push(1+Math.floor(Math.random()*3));
          $('genMsg').textContent='第一關：先清空清單，再用「隨機取數 1 到 3」放進 '+n+' 個動作。'; }
        else if(a==='接'){ if(seq.length===0){for(var j=0;j<3;j++)seq.push(1+Math.floor(Math.random()*3));$('genMsg').textContent='剛進第二關：先給 3 個動作。';}
          else{seq.push(1+Math.floor(Math.random()*3));$('genMsg').textContent='第二關接龍：前面的都不動，只在最後面「添加」一個 → 現在 '+seq.length+' 個。';} }
        else { seq=[]; $('genMsg').textContent='已經刪除清單的全部項目。'; }
        paintSeq('genRow',seq); seqNote();
      });
    });
    paintSeq('genRow',seq); seqNote();
  }

  /* ============ 3. 節奏接龍試玩台 ============ */
  var G={on:false,level:1,score:0,life:3,streak:0,gap:0.9,seq:[],idx:0,full:false,round:0,phase:'待機',armed:true};
  function hud(){
    $('pScore').textContent=G.score; $('pLife').textContent=G.life;
    $('pLevel').textContent=G.level; $('pLen').textContent=G.seq.length;
    $('pGap').textContent=G.gap.toFixed(2);
    $('pStreak').textContent=G.streak+(G.full?'（火光全開 ×2）':'');
  }
  function scene(fireLv,lit){
    var col=[['#6E4B33','#8A5A3A'],['#C1541F','#F6C445'],['#D2591C','#FFD75A'],['#E4611A','#FFE884'],['#F26B1D','#FFF6B8']][fireLv];
    var hh=[0,30,52,72,96][fireLv];
    var h=['<svg viewBox="0 0 480 360">',
      '<rect width="480" height="360" fill="#212B44"/>'];
    for(var i=0;i<40;i++){var sx=(i*97)%470+5,sy=(i*53)%170+8;h.push('<circle cx="'+sx+'" cy="'+sy+'" r="1.3" fill="#FFF6D8" opacity=".8"/>');}
    h.push('<path d="M0 214 L90 140 L170 214 Z" fill="#1C2340"/><path d="M120 218 L230 128 L330 218 Z" fill="#2A3358"/><path d="M280 218 L372 150 L480 218 Z" fill="#1C2340"/>');
    h.push('<path d="M0 214 H480 V360 H0 Z" fill="#3A2F3F"/>');
    // 三個樂器
    [[1,90],[2,240],[3,390]].forEach(function(p){
      var n=p[0],x=p[1],on=(lit===n);
      h.push('<g transform="translate('+x+',262)">');
      if(on)h.push('<ellipse cx="0" cy="-26" rx="52" ry="54" fill="#FFD75A" opacity=".35"/>');
      h.push('<rect x="-7" y="-14" width="14" height="42" rx="6" fill="#6B4A2E" stroke="#2B2233" stroke-width="3"/>');
      var body=on?'#C98A2E':'#6B5B46', hi=on?'#FFE9A8':'#8B7A61';
      if(n===1){h.push('<rect x="-38" y="-70" width="76" height="58" rx="10" fill="'+body+'" stroke="#2B2233" stroke-width="3.5"/><ellipse cx="0" cy="-70" rx="38" ry="13" fill="'+hi+'" stroke="#2B2233" stroke-width="3.5"/>');}
      else if(n===2){[[-24,52],[-9,64],[6,58],[21,44]].forEach(function(c,i){h.push('<rect x="'+c[0]+'" y="'+(-12-c[1])+'" width="11" height="'+c[1]+'" rx="5" fill="'+(i%2?hi:body)+'" stroke="#2B2233" stroke-width="3"/>');});h.push('<rect x="-34" y="-82" width="68" height="10" rx="5" fill="#6B4A2E" stroke="#2B2233" stroke-width="3"/>');}
      else{h.push('<ellipse cx="0" cy="-46" rx="28" ry="32" fill="'+body+'" stroke="#2B2233" stroke-width="3.5"/><path d="M-21 -56 Q0 -68 21 -56" fill="none" stroke="'+hi+'" stroke-width="3.5"/>');}
      var ly=(n===2)?-96:46;                       // 中間的竹鐘標籤放上面，才不會被火堆壓住
      h.push('<text x="0" y="'+ly+'" text-anchor="middle" font-size="15" font-weight="700" fill="'+(on?'#FFE9A8':'#8B93A8')+'">'+INST[n]+'</text></g>');
    });
    // 火堆
    h.push('<g transform="translate(240,306)">');
    if(hh>0){
      h.push('<ellipse cx="0" cy="4" rx="'+(46+hh*0.2)+'" ry="13" fill="'+col[1]+'" opacity=".3"/>');
      h.push('<path d="M0 0 C-34 '+(-hh*0.45)+', -28 '+(-hh*0.8)+', 0 '+(-hh)+' C28 '+(-hh*0.8)+', 34 '+(-hh*0.45)+', 0 0 Z" fill="'+col[0]+'"/>');
      h.push('<path d="M0 0 C-20 '+(-hh*0.42)+', -16 '+(-hh*0.62)+', 0 '+(-hh*0.8)+' C16 '+(-hh*0.62)+', 20 '+(-hh*0.42)+', 0 0 Z" fill="'+col[1]+'"/>');
    }
    h.push('<rect x="-44" y="-6" width="88" height="14" rx="7" fill="#7A5334" stroke="#2B2233" stroke-width="3" transform="rotate(-9)"/>');
    h.push('<rect x="-44" y="-6" width="88" height="14" rx="7" fill="#8C6140" stroke="#2B2233" stroke-width="3" transform="rotate(9)"/></g>');
    h.push('</svg>');
    $('pScene').innerHTML=h.join('');   // 只換畫面，訊息列是另一個元素
  }
  function msg(t,c){ var m=$('pMsg'); m.textContent=t; m.style.color=c||'#2B2233'; }
  var fireLv=0;
  function resetGame(){
    G={on:false,level:1,score:0,life:3,streak:0,gap:0.9,seq:[],idx:0,full:false,round:0,phase:'待機',armed:true};
    fireLv=0; scene(0,0); hud(); paintSeq('pRow',[]); msg('按「開始」就可以玩');
  }
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  async function playPrompt(){
    G.phase='提示'; msg('看好囉——','#E8A33A');
    paintSeq('pRow',G.seq);
    await sleep(500);
    for(var i=0;i<G.seq.length;i++){
      var a=G.seq[i];
      paintSeq('pRow',G.seq,{on:i}); scene(fireLv,a); beep(a);
      await sleep(G.gap*1000);
      scene(fireLv,0); paintSeq('pRow',G.seq);
      await sleep(G.gap*450);
      if(!G.on)return;
    }
  }
  function newRound(){
    G.round++;
    if(G.level===1){ G.seq=[]; var n=3+Math.floor(Math.random()*3);
      for(var i=0;i<n;i++)G.seq.push(1+Math.floor(Math.random()*3)); }
    else { if(G.seq.length===0){for(var j=0;j<3;j++)G.seq.push(1+Math.floor(Math.random()*3));}
           else G.seq.push(1+Math.floor(Math.random()*3)); }
    fireLv=0; G.idx=0; G.mark=[];
  }
  async function runRound(){
    newRound(); hud(); scene(0,0);
    await playPrompt();
    if(!G.on)return;
    G.phase='等待'; msg('換你做！','#7ED0F2'); paintSeq('pRow',G.seq,{mark:G.mark});
  }
  function roundOk(){
    G.streak++; if(G.streak>2)G.full=true;
    var pts=10*G.seq.length; if(G.full)pts*=2;
    G.score+=pts; G.gap=Math.max(0.25,+(G.gap-0.04).toFixed(2));
    msg('答對了！＋'+pts+' 分'+(G.full?'（火光全開 ×2）':''),'#3FAE6A');
    hud();
    setTimeout(async function(){
      if(G.level===1&&G.streak>2){ G.level=2;G.streak=0;G.full=false;G.seq=[];
        msg('連續三輪全對，進入第二關・節奏接龍！','#B05CD6'); hud(); await sleep(1400); }
      else if(G.level===2&&G.seq.length>9){
        G.on=false;G.phase='結束';msg('挑戰成功：今晚的樂舞之王！總分 '+G.score,'#3FAE6A');return; }
      else await sleep(900);
      if(G.on)runRound();
    },900);
  }
  function roundFail(){
    G.life--; G.streak=0; G.full=false; fireLv=0; buzz();
    scene(0,0); hud(); msg('節奏斷掉了，扣一把火把','#D9534F');
    setTimeout(function(){
      if(G.life<=0){ G.on=false;G.phase='結束';msg('火把熄滅了，遊戲結束。總分 '+G.score,'#D9534F'); }
      else if(G.on)runRound();
    },1300);
  }
  function doAction(a){
    if(!G.on||G.phase!=='等待')return;
    if(a===G.seq[G.idx]){
      G.mark[G.idx]='ok'; G.idx++; fireLv=Math.min(4,fireLv+1);
      beep(a); scene(fireLv,a); paintSeq('pRow',G.seq,{mark:G.mark});
      setTimeout(function(){scene(fireLv,0);},160);
      if(G.idx>=G.seq.length){G.phase='結果';roundOk();}
    } else {
      G.mark[G.idx]='bad'; paintSeq('pRow',G.seq,{mark:G.mark});
      G.phase='結果'; roundFail();
    }
  }
  if($('pStage')){
    document.querySelectorAll('[data-play]').forEach(function(b){
      b.addEventListener('click',function(){
        var a=b.getAttribute('data-play');
        if(a==='start'){ if(G.on)return; resetGame(); G.on=true; ctx(); runRound(); }
        else if(a==='reset'){ G.on=false; resetGame(); }
        else doAction(+a);
      });
    });
    document.addEventListener('keydown',function(e){
      if(!G.on)return;
      var k={'ArrowLeft':1,'ArrowDown':2,'ArrowRight':3}[e.key];
      if(k){e.preventDefault();doAction(k);}
    });
    resetGame();
  }

  /* ============ 4. 計分試算 ============ */
  function calc(){
    var n=+$('cLen').value, r=+$('cStreak').value;
    $('cLenO').textContent=n; $('cStreakO').textContent=r;
    var base=10*n, full=r>=3, pts=full?base*2:base;
    $('cBase').textContent=base;
    $('cFull').textContent=full?'是（×2）':'否';
    $('cPts').textContent=pts;
    var gap=Math.max(0.25,+(0.9-0.04*r).toFixed(2));
    $('cGap').textContent=gap.toFixed(2)+' 秒';
  }
  if($('cLen')){ $('cLen').addEventListener('input',calc); $('cStreak').addEventListener('input',calc); calc(); }

  /* ============ 自我檢核 ============ */
  var KEY='fire2026.check', boxes=[].slice.call(document.querySelectorAll('#chk input'));
  function save(){
    var v=boxes.map(function(b){return b.checked?1:0;});
    try{localStorage.setItem(KEY,JSON.stringify(v));$('chkNote').textContent='已自動儲存在這台電腦的瀏覽器。';}
    catch(e){$('chkNote').textContent='這個瀏覽器不允許儲存，勾選結果關閉頁面後會消失。';}
    var done=v.reduce(function(a,b){return a+b;},0);
    if($('pbar'))$('pbar').style.width=(boxes.length?done/boxes.length*100:0)+'%';
  }
  try{ var saved=JSON.parse(localStorage.getItem(KEY)||'[]');
       boxes.forEach(function(b,i){b.checked=!!saved[i];}); }catch(e){}
  boxes.forEach(function(b){b.addEventListener('change',save);});
  if(boxes.length)save();
})();
