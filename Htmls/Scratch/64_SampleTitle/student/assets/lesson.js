/* 貓咪甜點店・片頭與選單：教學頁互動示範 */
(function(){
  BLK.auto(SCRIPTS);
  var $=function(id){return document.getElementById(id);};
  var LINE='#7A5B4C';

  /* ============ 小小音效 ============ */
  var AC=null;
  function ctx(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}}return AC;}
  function blip(f,dur,type,vol){
    var a=ctx();if(!a)return;var t=a.currentTime,o=a.createOscillator(),g=a.createGain();
    o.type=type||'sine';o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(vol||0.16,t);g.gain.exponentialRampToValueAtTime(0.001,t+(dur||0.12));
    o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+(dur||0.12)+0.02);
  }

  /* ============ 1. 畫面流程試玩台 ============ */
  var S={scene:'片頭',skip:false,back:'',game:0,alive:false,
         signY:300,titleS:40,titleA:0,subA:0,catX:-300,page:0,say:'',parts:[],hover:''};
  var FLOW=['片頭','故事','說明','選單','遊戲'];

  function sleepSkip(ms){
    return new Promise(function(res){
      var t0=performance.now();
      (function tick(){ if(!S.alive||S.skip||performance.now()-t0>ms) return res(); requestAnimationFrame(tick); })();
    });
  }
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}
  function glide(ms,from,to,set){
    return new Promise(function(res){
      var t0=performance.now();
      (function tick(){
        var k=Math.min(1,(performance.now()-t0)/ms); set(from+(to-from)*k);
        if(k<1&&S.alive){requestAnimationFrame(tick);}else{set(to);res();}
      })();
    });
  }

  /* ---- 畫面繪製 ---- */
  function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;');}
  function drawScene(){
    var sc=S.scene, h=['<svg viewBox="0 0 480 360">'];
    if(sc==='遊戲'){
      h.push('<rect width="480" height="360" fill="#FFF1F6"/>');
      for(var i=0;i<20;i++){var x=(i*83)%460+10,y=(i*61)%340+10;
        h.push('<path d="M'+x+' '+(y-4)+' l4 4 l-4 4 l-4 -4 Z" fill="#FFD3E0"/>');}
      var G=[['遊戲一','草莓蛋糕接接樂'],['遊戲二','布丁疊疊樂'],['遊戲三','馬卡龍配對']][S.game-1]||['遊戲','—'];
      h.push('<g transform="translate(240,150)"><rect x="-190" y="-54" width="380" height="108" rx="26" fill="#fff" stroke="#E86A8D" stroke-width="6"/>'+
             '<text x="0" y="-4" text-anchor="middle" font-size="40" font-weight="bold" fill="#E86A8D">'+G[0]+'</text>'+
             '<text x="0" y="30" text-anchor="middle" font-size="19" fill="#8B6B5B">'+G[1]+'</text></g>');
      h.push(btn(240,290,'回選單','#A8DADC','back'));
      h.push('</svg>'); $('dScene').innerHTML=h.join(''); return;
    }
    // 店內
    h.push('<rect width="480" height="360" fill="#FFE9F0"/>');
    for(var r=0;r<5;r++)for(var c=0;c<10;c++)h.push('<circle cx="'+(c*52+14)+'" cy="'+(r*52+16)+'" r="4" fill="#FFD3E0"/>');
    h.push('<rect x="30" y="40" width="112" height="86" rx="12" fill="#CDE8F5" stroke="'+LINE+'" stroke-width="4"/>'+
           '<path d="M86 40 V126 M30 83 H142" stroke="'+LINE+'" stroke-width="4"/>');
    h.push('<rect x="0" y="246" width="480" height="114" fill="#E8C9A8"/><rect x="0" y="246" width="480" height="16" fill="#D8B48E"/>');
    // 粒子
    S.parts.forEach(function(p){
      h.push('<g transform="translate('+p.x.toFixed(0)+','+p.y.toFixed(0)+') scale('+p.s.toFixed(2)+')" opacity="'+p.a.toFixed(2)+'">'+
        (p.k===0?'<path d="M0 8 C-9 1, -9 -7, 0 -3 C9 -7, 9 1, 0 8 Z" fill="#FFB3C6" stroke="'+LINE+'" stroke-width="2"/>'
         :p.k===1?'<path d="M0 -9 l3 6 l6 1 l-5 4 l2 6 l-6 -3 l-6 3 l2 -6 l-5 -4 l6 -1 Z" fill="#FFD98A" stroke="'+LINE+'" stroke-width="2"/>'
         :'<circle r="7" fill="#fff" fill-opacity=".7" stroke="'+LINE+'" stroke-width="2"/>')+'</g>');
    });
    if(sc==='片頭'){
      h.push('<g transform="translate(240,'+(180-S.signY).toFixed(0)+')">'+
        '<rect x="-174" y="-48" width="348" height="96" rx="20" fill="#C98A5B" stroke="'+LINE+'" stroke-width="6"/>'+
        '<rect x="-162" y="-36" width="324" height="72" rx="14" fill="#F6DFC4" stroke="'+LINE+'" stroke-width="4"/></g>');
      h.push('<g transform="translate(240,100) scale('+(S.titleS/100).toFixed(2)+')" opacity="'+S.titleA.toFixed(2)+'">'+
        '<text x="0" y="16" text-anchor="middle" font-size="44" font-weight="bold" fill="#E86A8D">貓咪甜點店</text></g>');
      h.push('<text x="240" y="196" text-anchor="middle" font-size="20" font-weight="bold" fill="#8B6B5B" opacity="'+S.subA.toFixed(2)+'">今天也要甜甜的</text>');
    }
    // 貓店長
    if(sc!=='遊戲'){
      var cx=(sc==='片頭'?S.catX:sc==='故事'?-150:sc==='說明'?-192:208),
          cy=(sc==='片頭'?-120:sc==='故事'?-96:sc==='說明'?-104:44),
          cs=(sc==='片頭'?0.95:sc==='故事'?0.86:sc==='說明'?0.68:0.56);
      h.push(cat(240+cx,180-cy,cs,sc==='選單'?'開心':'普通'));
      if(S.say){
        var w=Math.min(300,S.say.length*17+26);
        h.push('<g transform="translate('+(240+cx+46)+','+(180-cy-118)+')">'+
          '<rect x="0" y="0" width="'+w+'" height="46" rx="14" fill="#fff" stroke="'+LINE+'" stroke-width="3"/>'+
          '<path d="M14 46 l0 14 l16 -14 Z" fill="#fff" stroke="'+LINE+'" stroke-width="3"/>'+
          '<text x="14" y="30" font-size="17" fill="#5A4A3A">'+esc(S.say)+'</text></g>');
      }
    }
    if(sc==='說明'&&S.page>0){
      var P=[['① 用滑鼠點甜點','選一個你想玩的小遊戲','#3F7FC1'],
             ['② 每個甜點一個遊戲','遊戲一／二／三 各有不同玩法','#7FA83F'],
             ['③ 隨時可以回來','遊戲畫面按「回選單」就好','#C96AA8']][S.page-1];
      h.push('<g transform="translate(270,140)"><rect x="-180" y="-52" width="360" height="104" rx="24" fill="#fff" stroke="'+P[2]+'" stroke-width="6"/>'+
        '<text x="0" y="-6" text-anchor="middle" font-size="26" font-weight="bold" fill="'+P[2]+'">'+P[0]+'</text>'+
        '<text x="0" y="26" text-anchor="middle" font-size="18" fill="#8B6B5B">'+P[1]+'</text></g>');
    }
    if(sc==='選單'){
      h.push('<g transform="translate(240,48)"><rect x="-160" y="-30" width="320" height="60" rx="26" fill="#fff" stroke="#E86A8D" stroke-width="6"/>'+
        '<text x="0" y="9" text-anchor="middle" font-size="25" font-weight="bold" fill="#E86A8D">選擇今天的甜點</text></g>');
      [['cake','草莓蛋糕',90,'遊戲一'],['pud','布丁',240,'遊戲二'],['mac','馬卡龍',390,'遊戲三']].forEach(function(d){
        h.push(dessert(d[0],d[2],214,S.hover===d[0],d[3]));
      });
      h.push(btn(80,320,'重看片頭','#FFB3C6','b1'));
      h.push(btn(240,320,'看故事','#A8DADC','b2'));
      h.push(btn(400,320,'看說明','#FFD98A','b3'));
    }
    if(sc==='片頭'||sc==='故事'||sc==='說明') h.push(btn(416,330,'跳過 ▶▶','#FFD3E0','skip'));
    h.push('</svg>');
    $('dScene').innerHTML=h.join('');
  }
  function cat(x,y,s,mood){
    var eyes=mood==='開心'
      ? '<path d="M-19 -6 q6 -9 12 0 M7 -6 q6 -9 12 0" fill="none" stroke="'+LINE+'" stroke-width="4" stroke-linecap="round"/>'
      : '<circle cx="-13" cy="-6" r="4.6" fill="'+LINE+'"/><circle cx="13" cy="-6" r="4.6" fill="'+LINE+'"/>';
    return '<g transform="translate('+x.toFixed(0)+','+y.toFixed(0)+') scale('+s.toFixed(2)+')">'+
      '<g transform="translate(0,-78)">'+
      '<ellipse cx="0" cy="54" rx="40" ry="30" fill="#FFF6EC" stroke="'+LINE+'" stroke-width="4"/>'+
      '<rect x="-34" y="36" width="68" height="40" rx="12" fill="#FFD3E0" stroke="'+LINE+'" stroke-width="4"/>'+
      '<path d="M-34 -30 l-6 -30 l28 14 Z M34 -30 l6 -30 l-28 14 Z" fill="#FFF6EC" stroke="'+LINE+'" stroke-width="4" stroke-linejoin="round"/>'+
      '<circle cx="0" cy="0" r="38" fill="#FFF6EC" stroke="'+LINE+'" stroke-width="4"/>'+eyes+
      '<path d="M-8 7 q8 9 16 0" fill="none" stroke="'+LINE+'" stroke-width="3.5" stroke-linecap="round"/>'+
      '<circle cx="-24" cy="6" r="7" fill="#FFB3C6" opacity=".8"/><circle cx="24" cy="6" r="7" fill="#FFB3C6" opacity=".8"/>'+
      '<ellipse cx="0" cy="-44" rx="26" ry="14" fill="#fff" stroke="'+LINE+'" stroke-width="4"/>'+
      '</g></g>';
  }
  function dessert(id,x,y,on,label){
    var k=on?1.12:1;
    var art=id==='cake'
      ? '<path d="M-36 34 L-26 -14 H26 L36 34 Z" fill="#FFF0D6" stroke="'+LINE+'" stroke-width="4" stroke-linejoin="round"/>'+
        '<path d="M-30 10 H30" stroke="#FFD9E4" stroke-width="8"/><path d="M-26 -14 q26 -16 52 0" fill="#FFD9E4" stroke="'+LINE+'" stroke-width="4"/>'+
        '<path d="M0 -18 l-9 -14 h18 Z" fill="#F2637E" stroke="'+LINE+'" stroke-width="3" stroke-linejoin="round"/>'
      : id==='pud'
      ? '<path d="M-34 34 q6 -50 34 -50 q28 0 34 50 Z" fill="#FFD98A" stroke="'+LINE+'" stroke-width="4" stroke-linejoin="round"/>'+
        '<path d="M-26 -8 q26 -14 52 0 q-10 10 -26 10 q-16 0 -26 -10 Z" fill="#C98A2E" stroke="'+LINE+'" stroke-width="3.5"/>'
      : '<path d="M-38 4 q38 -34 76 0 q-38 14 -76 0 Z" fill="#C8E6C9" stroke="'+LINE+'" stroke-width="4" stroke-linejoin="round"/>'+
        '<rect x="-36" y="2" width="72" height="14" rx="7" fill="#FFD9E4" stroke="'+LINE+'" stroke-width="3.5"/>'+
        '<path d="M-38 16 q38 32 76 0 q-38 -14 -76 0 Z" fill="#D7C4F0" stroke="'+LINE+'" stroke-width="4" stroke-linejoin="round"/>';
    return '<g data-hit="'+id+'" style="cursor:pointer" transform="translate('+x+','+y+') scale('+k+')">'+
      (on?'<circle cy="0" r="56" fill="#FFF6B8" opacity=".55"/>':'')+
      '<ellipse cx="0" cy="38" rx="46" ry="12" fill="#fff" stroke="'+LINE+'" stroke-width="4"/>'+art+
      '<rect x="-46" y="48" width="92" height="30" rx="15" fill="'+(on?'#FFF0D6':'#fff')+'" stroke="'+LINE+'" stroke-width="4"/>'+
      '<text x="0" y="69" text-anchor="middle" font-size="18" font-weight="bold" fill="#8B6B5B">'+label+'</text></g>';
  }
  function btn(x,y,label,col,id){
    var on=S.hover===id;
    return '<g data-hit="'+id+'" style="cursor:pointer" transform="translate('+x+','+y+')">'+
      '<rect x="-70" y="-20" width="140" height="40" rx="20" fill="'+LINE+'" opacity=".3"/>'+
      '<rect x="-70" y="-24" width="140" height="40" rx="20" fill="'+(on?'#FFF0D6':col)+'" stroke="'+LINE+'" stroke-width="4"/>'+
      '<text x="0" y="3" text-anchor="middle" font-size="18" font-weight="bold" fill="#6B4A3A">'+label+'</text></g>';
  }
  function hud(){
    $('dScreen').textContent=S.scene; $('dSkip').textContent=S.skip?'1':'0';
    $('dBack').textContent=S.back||'（空白）'; $('dGame').textContent=S.game;
    document.querySelectorAll('#dFlow .node').forEach(function(n){
      n.classList.toggle('on',n.getAttribute('data-s')===S.scene);});
  }

  /* ---- 各畫面的「播放」 ---- */
  async function playIntro(){
    S.signY=300;S.titleS=40;S.titleA=0;S.subA=0;S.catX=-300;S.say='';
    if(!S.skip){ await glide(450,300,62,function(v){S.signY=v;}); blip(180,0.18,'sine',0.2);
                 await glide(140,62,92,function(v){S.signY=v;});
                 await glide(120,92,76,function(v){S.signY=v;}); }
    S.signY=76;
    if(!S.skip) await sleepSkip(250);
    if(!S.skip){ await glide(420,0,1,function(v){S.titleA=v;S.titleS=40+60*v;}); }
    S.titleA=1;S.titleS=100;
    if(!S.skip) await glide(320,0,1,function(v){S.subA=v;});
    S.subA=1;
    if(!S.skip) await sleepSkip(300);
    if(!S.skip) await glide(600,-300,-150,function(v){S.catX=v;});
    S.catX=-150;
    await sleepSkip(1600);
  }
  async function playStory(){
    S.say='';
    var lines=['歡迎光臨！我是店長小奶油。','這家店有三種甜點，每一種都是一個小遊戲。','幫我把客人的甜點做出來，好嗎？'];
    for(var i=0;i<lines.length;i++){
      if(!S.alive)return;
      var L=lines[i];
      for(var j=1;j<=L.length;j++){
        if(S.skip){S.say=L;break;}
        S.say=L.slice(0,j); blip(1400,0.03,'square',0.05); await sleep(45);
      }
      S.say=L;
      await sleepSkip(600);
    }
    S.say='';
  }
  async function playInfo(){
    for(var p=1;p<=3;p++){
      if(!S.alive)return;
      S.page=p; blip(700,0.12,'triangle',0.12);
      await sleepSkip(2200);
    }
    S.page=0;
  }
  function go(name){ S.scene=name; S.skip=false; if(name!=='說明')S.page=0; hud(); }
  async function loop(){
    while(S.alive){
      if(S.scene==='片頭'){ await playIntro(); if(S.scene==='片頭') nextScene('故事'); }
      else if(S.scene==='故事'){ await playStory(); if(S.scene==='故事') nextScene('說明'); }
      else if(S.scene==='說明'){ await playInfo(); if(S.scene==='說明') nextScene('選單'); }
      else await sleep(60);
      hud();
    }
  }
  function nextScene(def){
    if(S.back==='選單'){ S.back=''; go('選單'); } else go(def);
  }
  function tickParts(){
    if(!S.alive)return;
    if((S.scene==='片頭'||S.scene==='選單')&&Math.random()<0.055)
      S.parts.push({x:20+Math.random()*440,y:380,s:0.7+Math.random()*0.7,a:0.85,k:Math.floor(Math.random()*3)});
    S.parts=S.parts.filter(function(p){p.y-=1.7;p.a-=0.006;return p.a>0&&p.y>-20;});
    if(S.parts.length>40)S.parts.splice(0,S.parts.length-40);
  }
  function frame(){ if(S.alive){tickParts();drawScene();} requestAnimationFrame(frame); }

  if($('dScene')){
    var sv=$('dScene');
    sv.addEventListener('click',function(e){
      var g=e.target.closest&&e.target.closest('[data-hit]'); if(!g)return;
      var id=g.getAttribute('data-hit');
      blip(900,0.09,'triangle',0.18);
      if(id==='skip'){S.skip=true;}
      else if(id==='cake'||id==='pud'||id==='mac'){S.game={cake:1,pud:2,mac:3}[id];go('遊戲');}
      else if(id==='back'){S.game=0;go('選單');}
      else if(id==='b1'){S.back='選單';go('片頭');}
      else if(id==='b2'){S.back='選單';go('故事');}
      else if(id==='b3'){S.back='選單';go('說明');}
      hud();
    });
    sv.addEventListener('mousemove',function(e){
      var g=e.target.closest&&e.target.closest('[data-hit]');
      S.hover=g?g.getAttribute('data-hit'):'';
    });
    sv.addEventListener('mouseleave',function(){S.hover='';});
    document.addEventListener('keydown',function(e){ if(e.key===' '&&S.alive){e.preventDefault();S.skip=true;hud();} });
    $('dStart').addEventListener('click',function(){
      ctx(); if(S.alive){return;} S.alive=true; S.back='';S.game=0;S.parts=[];
      go('片頭'); loop();
    });
    $('dReset').addEventListener('click',function(){
      S.alive=false; setTimeout(function(){S.scene='片頭';S.skip=false;S.back='';S.game=0;S.say='';S.page=0;S.parts=[];
        S.signY=300;S.titleS=40;S.titleA=0;S.subA=0;S.catX=-300;hud();drawScene();},80);
    });
    hud(); drawScene(); frame();
  }

  /* ============ 2. 打字機實驗室 ============ */
  var T={run:false,skip:false};
  async function runTyper(){
    if(T.run)return; T.run=true; T.skip=false;
    var text=$('tText').value||'歡迎光臨貓咪甜點店！';
    var sp=+$('tSpeed').value;
    var box=$('tOut'); box.textContent='';
    for(var i=1;i<=text.length;i++){
      if(T.skip){box.innerHTML=esc(text);break;}
      box.innerHTML=esc(text.slice(0,i))+'<span class="cur">|</span>';
      blip(1400,0.03,'square',0.05);
      await sleep(sp);
    }
    box.innerHTML=esc(text);
    $('tCount').textContent=text.length;
    T.run=false;
  }
  if($('tOut')){
    $('tGo').addEventListener('click',function(){ctx();runTyper();});
    $('tSkip').addEventListener('click',function(){T.skip=true;});
    $('tSpeed').addEventListener('input',function(){$('tSpeedO').textContent=this.value;});
    $('tCount').textContent=($('tText').value||'').length;
  }

  /* ============ 3. 動畫對照：入門 vs 進階 ============ */
  function animEasy(el){
    el.style.transition='none'; el.style.top='-50px'; el.style.opacity='1'; el.style.transform='scale(1)';
    void el.offsetWidth;
    el.style.transition='top .6s linear'; el.style.top='52px';
  }
  function animPro(el){
    el.style.transition='none'; el.style.top='-50px'; el.style.opacity='0'; el.style.transform='scale(.6)';
    void el.offsetWidth;
    el.style.transition='top .45s cubic-bezier(.3,.7,.4,1), opacity .3s linear, transform .3s ease-out';
    el.style.top='70px'; el.style.opacity='1'; el.style.transform='scale(1)';
    setTimeout(function(){ el.style.transition='top .14s ease-out'; el.style.top='30px'; },470);
    setTimeout(function(){ el.style.transition='top .12s ease-in'; el.style.top='52px'; },620);
  }
  if($('aGo')){
    $('aGo').addEventListener('click',function(){ animEasy($('aEasy')); animPro($('aPro')); blip(180,0.18,'sine',0.16); });
    animEasy($('aEasy')); animPro($('aPro'));
  }

  /* ============ 自我檢核 ============ */
  var KEY='cafe2026.check', boxes=[].slice.call(document.querySelectorAll('#chk input'));
  function save(){
    var v=boxes.map(function(b){return b.checked?1:0;});
    try{localStorage.setItem(KEY,JSON.stringify(v));$('chkNote').textContent='已自動儲存在這台電腦的瀏覽器。';}
    catch(e){$('chkNote').textContent='這個瀏覽器不允許儲存，勾選結果關閉頁面後會消失。';}
    var done=v.reduce(function(a,b){return a+b;},0);
    if($('pbar'))$('pbar').style.width=(boxes.length?done/boxes.length*100:0)+'%';
  }
  try{var saved=JSON.parse(localStorage.getItem(KEY)||'[]');
      boxes.forEach(function(b,i){b.checked=!!saved[i];});}catch(e){}
  boxes.forEach(function(b){b.addEventListener('change',save);});
  if(boxes.length)save();
})();
