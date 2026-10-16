/* ===== 迷你舞台模擬器 v3（動作・外觀・事件・控制・偵測・運算） =====
   舞台座標：x −240~240（右為正）、y −180~180（上為正）
   角度：0 上、90 右、180 下、−90 左（順時針增加）
*/
var Stage = (function(){
  var NS='http://www.w3.org/2000/svg';
  var HW=32, HH=28;
  var S={x:0,y:0,dir:90,rot:'任意',size:100,visible:true,costume:1,backdrop:1,
         layer:'front',say:null,sayKind:'say',fx:{},answer:'',drag:'可拖曳',
         vars:{},varShow:{},lists:{},listShow:{}};
  var VNAMES=(typeof VAR_NAMES!=='undefined')?VAR_NAMES:['my variable'];
  var LNAMES=(typeof LIST_NAMES!=='undefined')?LIST_NAMES:['我的清單'];
  function resetVars(){
    S.vars={};S.varShow={};
    VNAMES.forEach(function(n,i){S.vars[n]=0;S.varShow[n]=(i<2);});
    S.lists={};S.listShow={};
    LNAMES.forEach(function(n){S.lists[n]=[];S.listShow[n]=false;});
  }
  resetVars();
  var mouse={x:120,y:80};
  var el={}, anim=null, sayTimer=null, listeners=[], T=null, keys={}, clones=[];
  var mdown=false, timer0=Date.now(), askDone=null;
  /* AI 擴充模組模擬：小舞台沒有攝影機，用滑鼠當成「手／臉」的位置 */
  var AI={handSeen:true, faceCount:1, mouth:6, blink:0};
  var COSTUMES=['costume1','costume2'];
  var BACKDROPS=['backdrop1','backdrop2','backdrop3'];

  function mk(tag,attrs,parent){
    var e=document.createElementNS(NS,tag);
    for(var k in attrs){e.setAttribute(k,attrs[k]);}
    if(parent)parent.appendChild(e);
    return e;
  }
  function sx(x){return 240+x;}
  function sy(y){return 180-y;}
  function norm(d){var n=((d%360)+360)%360; if(n>180)n-=360; return n;}
  function round1(v){return Math.round(v*10)/10;}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

  /* ---- 偵測／運算用的小工具 ---- */
  function num(v){
    if(typeof v==='boolean')return v?1:0;
    var n=parseFloat(v);return isNaN(n)?0:n;
  }
  function fix(v){
    if(!isFinite(v))return String(v);
    return Math.round(v*1e6)/1e6;
  }
  function truth(v){
    if(typeof v==='boolean')return v;
    if(typeof v==='string')return cond(v);
    return !!v;
  }
  function cmp(a,b){
    var na=parseFloat(a), nb=parseFloat(b);
    if(!isNaN(na)&&!isNaN(nb)&&String(a).trim()!==''&&String(b).trim()!=='')
      return na<nb?-1:(na>nb?1:0);
    var sa=String(a===undefined?'':a).toLowerCase(), sb=String(b===undefined?'':b).toLowerCase();
    return sa<sb?-1:(sa>sb?1:0);
  }
  /* 草叢道具：舞台座標中心 (62,−34)，半徑 58×42 */
  function propHit(){
    var k=S.size/100;
    var rx=58+26*k, ry=42+22*k;
    var dx=(S.x-62)/rx, dy=(S.y+34)/ry;
    return dx*dx+dy*dy<=1;
  }
  function colorHit(c){
    if(c==='綠色（草叢）'){
      if(propHit())return true;
      return S.backdrop===2&&S.y<-30;         // 背景 2 的草地
    }
    if(c==='藍色（天空）') return S.backdrop===2&&S.y>=-30&&!propHit();
    if(c==='黃色（太陽）') return S.backdrop===2&&Math.sqrt(Math.pow(S.x-170,2)+Math.pow(S.y-120,2))<58;
    if(c==='白色（空白背景）') return S.backdrop===1&&!propHit();
    return false;
  }
  function doAsk(q){
    if(!el.ask)return Promise.resolve();
    el.askQ.textContent=q;
    el.askIn.value='';
    el.ask.setAttribute('opacity','1');
    el.ask.style.pointerEvents='auto';
    setTimeout(function(){try{el.askIn.focus();}catch(e){}},30);
    return new Promise(function(res){
      askDone=function(){
        S.answer=el.askIn.value;
        el.ask.setAttribute('opacity','0');
        el.ask.style.pointerEvents='none';
        askDone=null;render();res();
      };
    });
  }

  function buildSprite(g){
    mk('path',{d:'M -26 6 q -22 -2 -26 -18 q 16 6 26 2 z',fill:'#F09340'},g);
    mk('path',{d:'M -14 -18 l -6 -16 l 16 7 z',fill:'#F09340'},g);
    mk('path',{d:'M 10 -20 l 4 -16 l 12 12 z',fill:'#F09340'},g);
    mk('ellipse',{cx:0,cy:0,rx:30,ry:24,fill:'#FFB365',stroke:'#E07C22','stroke-width':3},g);
    mk('ellipse',{cx:4,cy:8,rx:18,ry:12,fill:'#FFD9AE'},g);
    mk('ellipse',{cx:10,cy:-7,rx:7,ry:8,fill:'#FFFFFF'},g);
    mk('circle',{cx:13,cy:-6,r:3.6,fill:'#4A4038'},g);
    mk('circle',{cx:14.4,cy:-7.4,r:1.2,fill:'#fff'},g);
    mk('ellipse',{cx:26,cy:2,rx:7,ry:5.5,fill:'#FFE2C2',stroke:'#E07C22','stroke-width':2},g);
    mk('circle',{cx:29,cy:1,r:1.8,fill:'#E07C22'},g);
    el.foot1=mk('ellipse',{cx:-10,cy:22,rx:7,ry:4.5,fill:'#F09340'},g);
    el.foot2=mk('ellipse',{cx:12,cy:22,rx:7,ry:4.5,fill:'#F09340'},g);
  }

  function buildBackdrops(parent){
    el.bd=[];
    var b1=mk('g',{},parent);
    mk('rect',{x:0,y:0,width:480,height:360,fill:'#FFFDF8'},b1);
    el.bd.push(b1);
    var b2=mk('g',{opacity:'0'},parent);
    mk('rect',{x:0,y:0,width:480,height:360,fill:'#DDF1FF'},b2);
    mk('circle',{cx:410,cy:60,r:30,fill:'#FFE27A'},b2);
    mk('path',{d:'M 0 250 q 60 -30 120 -6 q 70 26 130 -4 q 70 -32 140 -2 q 50 22 90 6 L 480 360 L 0 360 z',fill:'#BCE8A0'},b2);
    mk('path',{d:'M 0 292 q 90 -22 180 2 q 110 28 190 -6 q 60 -22 110 -4 L 480 360 L 0 360 z',fill:'#9FD983'},b2);
    el.bd.push(b2);
    var b3=mk('g',{opacity:'0'},parent);
    mk('rect',{x:0,y:0,width:480,height:360,fill:'#2C3A58'},b3);
    var seed=5;
    function rnd(){seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;}
    for(var i=0;i<46;i++){
      mk('circle',{cx:(rnd()*480).toFixed(1),cy:(rnd()*250).toFixed(1),r:(rnd()*1.6+0.7).toFixed(1),
        fill:'#FFF6D8',opacity:(0.4+rnd()*0.6).toFixed(2)},b3);
    }
    mk('circle',{cx:400,cy:70,r:26,fill:'#FFF3C4'},b3);
    mk('circle',{cx:388,cy:62,r:22,fill:'#2C3A58'},b3);
    mk('path',{d:'M 0 300 q 120 -30 240 0 q 120 30 240 0 L 480 360 L 0 360 z',fill:'#1F2A42'},b3);
    el.bd.push(b3);
  }

  function init(svg){
    el.svg=svg;
    svg.setAttribute('viewBox','0 0 480 360');
    buildBackdrops(svg);
    el.grid=mk('g',{opacity:'0'},svg);
    for(var gx=0;gx<=480;gx+=60){mk('line',{x1:gx,y1:0,x2:gx,y2:360,stroke:'#E9DCC9','stroke-width':1},el.grid);}
    for(var gy=0;gy<=360;gy+=60){mk('line',{x1:0,y1:gy,x2:480,y2:gy,stroke:'#E9DCC9','stroke-width':1},el.grid);}
    mk('line',{x1:0,y1:180,x2:480,y2:180,stroke:'#D9C4A6','stroke-width':2,'stroke-dasharray':'6 6'},el.grid);
    mk('line',{x1:240,y1:0,x2:240,y2:360,stroke:'#D9C4A6','stroke-width':2,'stroke-dasharray':'6 6'},el.grid);

    el.world=mk('g',{},svg);
    // 道具（用來看出「圖層」的前後關係）
    el.prop=mk('g',{},el.world);
    mk('ellipse',{cx:302,cy:214,rx:58,ry:42,fill:'#7FC98D'},el.prop);
    mk('ellipse',{cx:266,cy:230,rx:38,ry:30,fill:'#96D6A2'},el.prop);
    mk('ellipse',{cx:338,cy:232,rx:36,ry:28,fill:'#8ACF96'},el.prop);
    mk('text',{x:302,y:274,'text-anchor':'middle','font-size':'12',fill:'#5B7A63',
      'font-family':"'M PLUS Rounded 1c','Noto Sans TC',sans-serif"},el.prop).textContent='草叢（道具）';

    el.sprite=mk('g',{},el.world);
    el.inner=mk('g',{},el.sprite);
    var body=mk('g',{},el.inner);
    buildSprite(body);
    el.body=body;
    el.hideTag=mk('text',{x:0,y:44,'text-anchor':'middle','font-size':'13',fill:'#8C7F73',opacity:'0',
      'font-family':"'M PLUS Rounded 1c','Noto Sans TC',sans-serif"},el.sprite);
    el.hideTag.textContent='（隱藏中）';
    el.arrow=mk('g',{opacity:'.9'},el.sprite);
    mk('line',{x1:30,y1:0,x2:56,y2:0,stroke:'#3373CC','stroke-width':3,'stroke-dasharray':'4 4'},el.arrow);
    mk('path',{d:'M 56 -6 L 68 0 L 56 6 z',fill:'#3373CC'},el.arrow);

    el.clones=mk('g',{},el.world);
    el.world.insertBefore(el.clones,el.prop);
    el.target=mk('g',{opacity:'0'},svg);
    mk('path',{d:'M 0 -16 l 4.6 10.4 l 11.4 1.2 l -8.5 7.6 l 2.4 11.2 l -9.9 -5.7 l -9.9 5.7 l 2.4 -11.2 l -8.5 -7.6 l 11.4 -1.2 z',
      fill:'#FFD84D',stroke:'#E0A63F','stroke-width':2.5},el.target);
    el.mouse=mk('g',{opacity:'.85'},svg);
    mk('circle',{cx:0,cy:0,r:8,fill:'none',stroke:'#FF6680','stroke-width':2.5},el.mouse);
    mk('circle',{cx:0,cy:0,r:2,fill:'#FF6680'},el.mouse);

    el.bubble=mk('g',{opacity:'0'},svg);
    el.bubbleBox=mk('rect',{x:0,y:0,width:10,height:10,rx:14,fill:'#fff',stroke:'#CFC6BA','stroke-width':2.5},el.bubble);
    el.bubbleTail=mk('path',{d:'',fill:'#fff',stroke:'#CFC6BA','stroke-width':2.5},el.bubble);
    el.bubbleDot1=mk('circle',{cx:0,cy:0,r:5,fill:'#fff',stroke:'#CFC6BA','stroke-width':2,opacity:'0'},el.bubble);
    el.bubbleDot2=mk('circle',{cx:0,cy:0,r:3,fill:'#fff',stroke:'#CFC6BA','stroke-width':2,opacity:'0'},el.bubble);
    el.bubbleTxt=mk('text',{x:0,y:0,'font-size':'15','dominant-baseline':'middle',
      'font-family':"'M PLUS Rounded 1c','Noto Sans TC',sans-serif",fill:'#4A4038'},el.bubble);

    el.cast=mk('g',{opacity:'0'},svg);
    mk('rect',{x:120,y:10,width:240,height:32,rx:16,fill:'#FFBF00',stroke:'#CC9900','stroke-width':2.5},el.cast);
    el.castTxt=mk('text',{x:240,y:31,'text-anchor':'middle','font-size':'15',fill:'#4A3530','font-weight':'700',
      'font-family':"'M PLUS Rounded 1c','Noto Sans TC',sans-serif"},el.cast);
    el.mon=mk('g',{},svg);
    el.lmon=mk('g',{},svg);
    /* 詢問列（foreignObject 讓 SVG 裡也能放輸入框） */
    el.ask=mk('foreignObject',{x:'12',y:'296',width:'456',height:'54',opacity:'0'},svg);
    el.ask.style.pointerEvents='none';
    var askDiv=document.createElement('div');
    askDiv.style.cssText='display:flex;gap:8px;align-items:center;background:#fff;border:2px solid #CFC6BA;'+
      'border-radius:18px;padding:7px 10px;font-family:\'M PLUS Rounded 1c\',\'Noto Sans TC\',sans-serif';
    el.askQ=document.createElement('span');
    el.askQ.style.cssText='font-size:13px;font-weight:700;color:#4A4038;white-space:nowrap;overflow:hidden;'+
      'text-overflow:ellipsis;max-width:170px';
    el.askIn=document.createElement('input');
    el.askIn.type='text';
    el.askIn.setAttribute('aria-label','回答');
    el.askIn.style.cssText='flex:1;min-width:60px;font-size:13px;padding:5px 10px;border:2px solid #E9DCC9;'+
      'border-radius:999px;font-family:inherit;color:#4A4038;background:#fff';
    el.askBtn=document.createElement('button');
    el.askBtn.type='button';el.askBtn.textContent='\u2714';el.askBtn.setAttribute('aria-label','送出回答');
    el.askBtn.style.cssText='border:none;background:#5CB1D6;color:#fff;border-radius:50%;width:28px;height:28px;'+
      'cursor:pointer;font-size:14px;flex:0 0 auto';
    askDiv.appendChild(el.askQ);askDiv.appendChild(el.askIn);askDiv.appendChild(el.askBtn);
    el.ask.appendChild(askDiv);
    el.askBtn.addEventListener('click',function(){if(askDone)askDone();});
    el.askIn.addEventListener('keydown',function(e){if(e.key==='Enter'&&askDone)askDone();});

    document.addEventListener('pointerdown',function(){mdown=true;});
    document.addEventListener('pointerup',function(){mdown=false;});
    document.addEventListener('pointercancel',function(){mdown=false;});
    document.addEventListener('keydown',function(e){keys[keyName(e)]=true;});
    document.addEventListener('keyup',function(e){keys[keyName(e)]=false;});
    svg.addEventListener('pointermove',function(e){
      var r=svg.getBoundingClientRect();
      mouse.x=clamp((e.clientX-r.left)/r.width*480-240,-240,240);
      mouse.y=clamp(180-(e.clientY-r.top)/r.height*360,-180,180);
      render();
    });
    render();
  }

  function keyName(e){
    if(e.key===' '||e.code==='Space')return '空白';
    if(e.key==='ArrowUp')return '上';
    if(e.key==='ArrowDown')return '下';
    if(e.key==='ArrowLeft')return '左';
    if(e.key==='ArrowRight')return '右';
    return (e.key||'').toLowerCase();
  }
  function cond(name){
    switch(name){
      case '碰到邊緣':   return (S.x<=-240+HW+1||S.x>=240-HW-1||S.y<=-180+HH+1||S.y>=180-HH-1);
      case '角色在右半邊': return S.x>0;
      case '角色在上半邊': return S.y>0;
      case '按下空白鍵':  return !!keys['空白'];
      case '一直成立':   return true;
      default: return false;
    }
  }
  function addClone(){
    if(clones.length>=40)return;
    var g=mk('g',{opacity:'.6'},el.clones);
    g.setAttribute('transform','translate('+sx(S.x)+','+sy(S.y)+')');
    var inner=mk('g',{},g);
    inner.setAttribute('transform',(S.rot==='任意'?'rotate('+(S.dir-90)+')':'')+' scale('+(S.size/100)+')');
    buildSpriteStatic(inner);
    clones.push(g);
  }
  function buildSpriteStatic(g){
    mk('path',{d:'M -26 6 q -22 -2 -26 -18 q 16 6 26 2 z',fill:'#F09340'},g);
    mk('path',{d:'M -14 -18 l -6 -16 l 16 7 z',fill:'#F09340'},g);
    mk('path',{d:'M 10 -20 l 4 -16 l 12 12 z',fill:'#F09340'},g);
    mk('ellipse',{cx:0,cy:0,rx:30,ry:24,fill:'#FFB365',stroke:'#E07C22','stroke-width':3},g);
    mk('ellipse',{cx:4,cy:8,rx:18,ry:12,fill:'#FFD9AE'},g);
    mk('ellipse',{cx:10,cy:-7,rx:7,ry:8,fill:'#FFFFFF'},g);
    mk('circle',{cx:13,cy:-6,r:3.6,fill:'#4A4038'},g);
    mk('ellipse',{cx:26,cy:2,rx:7,ry:5.5,fill:'#FFE2C2',stroke:'#E07C22','stroke-width':2},g);
  }
  function clearClones(){
    while(clones.length){var g=clones.pop();if(g.parentNode)g.parentNode.removeChild(g);}
  }
  function castMsg(m){
    el.castTxt.textContent='📣 廣播：'+m;
    el.cast.setAttribute('opacity','1');
    setTimeout(function(){el.cast.setAttribute('opacity','0');},1400);
  }
  function onChange(fn){listeners.push(fn);}
  function fence(){S.x=clamp(S.x,-240,240);S.y=clamp(S.y,-180,180);}

  function applyLayer(){
    if(!el.world)return;
    if(S.layer==='back'){el.world.insertBefore(el.sprite,el.prop);}
    else{el.world.appendChild(el.sprite);}
  }
  function applyCostume(){
    if(!el.foot1)return;
    if(S.costume===2){
      el.foot1.setAttribute('cx',-17);el.foot1.setAttribute('cy',20);
      el.foot2.setAttribute('cx',17);el.foot2.setAttribute('cy',21);
      el.body.setAttribute('transform','translate(0,-2)');
    }else{
      el.foot1.setAttribute('cx',-10);el.foot1.setAttribute('cy',22);
      el.foot2.setAttribute('cx',12);el.foot2.setAttribute('cy',22);
      el.body.setAttribute('transform','');
    }
  }
  function applyFx(){
    var hue=Number(S.fx['顏色']||0), bright=Number(S.fx['亮度']||0), ghost=Number(S.fx['幻影']||0);
    var f='hue-rotate('+(hue*1.8)+'deg) brightness('+clamp(1+bright/100,0,2)+')';
    var op=clamp(1-ghost/100,0,1)*(S.visible?1:0.15);
    el.inner.style.filter=f;
    el.inner.setAttribute('opacity',op);
    el.hideTag.setAttribute('opacity',S.visible?'0':'1');
  }
  function textW(t,size){
    var w=0;
    for(var i=0;i<t.length;i++){w+=(t.charCodeAt(i)>255)?size:size*0.56;}
    return w;
  }
  function drawMonitors(){
    if(!el.mon)return;
    while(el.mon.firstChild)el.mon.removeChild(el.mon.firstChild);
    var FF="'M PLUS Rounded 1c','Noto Sans TC',sans-serif";
    var y=8;
    VNAMES.forEach(function(n){
      if(!S.varShow[n])return;
      var v=String(S.vars[n]);
      var lw=Math.round(textW(n,12))+16, vw=Math.max(30,Math.round(textW(v,11))+16);
      var g=mk('g',{},el.mon);
      mk('rect',{x:8,y:y,width:lw+vw+10,height:22,rx:5,fill:'#FFFFFF',opacity:'.92',
        stroke:'#C9C2BA','stroke-width':1},g);
      var t1=mk('text',{x:14,y:y+15,'font-size':'12',fill:'#575E75','font-weight':'700','font-family':FF},g);
      t1.textContent=n;
      mk('rect',{x:10+lw,y:y+3,width:vw,height:16,rx:4,fill:'#FF8C1A'},g);
      var t2=mk('text',{x:10+lw+vw/2,y:y+15.5,'text-anchor':'middle','font-size':'11',fill:'#fff',
        'font-weight':'800','font-family':FF},g);
      t2.textContent=v;
      y+=26;
    });
  }
  /* 手的 21 點：以食指尖（滑鼠）為基準的示意位移 */
  function handOff(p){
    var T={'手腕':[0,-78],'拇指根部':[-34,-58],'拇指第二關節':[-44,-38],
      '拇指第一關節':[-50,-22],'拇指尖':[-54,-8],
      '食指第三關節':[-12,-46],'食指第二關節':[-8,-28],'食指第一關節':[-4,-14],'食指尖':[0,0],
      '中指第三關節':[8,-48],'中指第二關節':[10,-28],'中指第一關節':[12,-12],'中指尖':[13,4],
      '無名指第三關節':[26,-48],'無名指第二關節':[28,-30],'無名指第一關節':[29,-16],'無名指尖':[30,-2],
      '小指第三關節':[42,-50],'小指第二關節':[44,-36],'小指第一關節':[45,-24],'小指尖':[46,-12]};
    var v=T[p]||[0,0];
    return {dx:v[0],dy:v[1]};
  }
  /* 臉部特徵點：以鼻尖（滑鼠）為基準；轉頭時額頭與鼻尖的位移不同 */
  function faceOff(p){
    var turn=mouse.x*0.25;
    var T={'鼻尖 (2)':[0,0],'額頭中央 (10)':[-turn,62],'下巴 (152)':[-turn*0.5,-58],
      '右眼上緣 (159)':[20-turn*0.3,30+AI.blink*0],'右眼下緣 (145)':[20-turn*0.3,22+AI.blink],
      '左眼上緣 (386)':[-20-turn*0.3,30],'左眼下緣 (374)':[-20-turn*0.3,22+AI.blink],
      '上唇內緣中央 (13)':[-turn*0.4,-20],'下唇內緣中央 (14)':[-turn*0.4,-20-AI.mouth],
      '嘴角右 (61)':[24-turn*0.4,-24],'嘴角左 (291)':[-24-turn*0.4,-24]};
    var v=T[p]||[0,0];
    return {dx:v[0],dy:v[1]};
  }
  function drawLists(){
    if(!el.lmon)return;
    while(el.lmon.firstChild)el.lmon.removeChild(el.lmon.firstChild);
    var FF="'M PLUS Rounded 1c','Noto Sans TC',sans-serif";
    var W=148, x=480-W-8, y=8;
    LNAMES.forEach(function(n){
      if(!S.listShow[n])return;
      var arr=S.lists[n]||[];
      var rows=Math.min(arr.length,6);
      var h=22+(rows?rows*20+4:22)+18;
      var g=mk('g',{},el.lmon);
      mk('rect',{x:x,y:y,width:W,height:h,rx:6,fill:'#FFFFFF',opacity:'.94',
        stroke:'#C9C2BA','stroke-width':1},g);
      var t=mk('text',{x:x+W/2,y:y+15,'text-anchor':'middle','font-size':'11',fill:'#575E75',
        'font-weight':'800','font-family':FF},g);
      t.textContent=n;
      mk('line',{x1:x,y1:y+21,x2:x+W,y2:y+21,stroke:'#E6E1DA','stroke-width':1},g);
      if(!rows){
        var e=mk('text',{x:x+W/2,y:y+37,'text-anchor':'middle','font-size':'11',fill:'#A8A099',
          'font-family':FF},g);
        e.textContent='（空的）';
      }
      for(var i=0;i<rows;i++){
        var ry=y+26+i*20;
        var idx=mk('text',{x:x+10,y:ry+12,'font-size':'10',fill:'#8C8880','font-family':FF},g);
        idx.textContent=String(i+1);
        var v=String(arr[i]);
        if(v.length>11)v=v.slice(0,11)+'…';
        mk('rect',{x:x+24,y:ry,width:W-34,height:16,rx:4,fill:'#FF8C1A'},g);
        var vt=mk('text',{x:x+29,y:ry+12,'font-size':'10.5',fill:'#fff','font-weight':'700',
          'font-family':FF},g);
        vt.textContent=v;
      }
      var f=mk('text',{x:x+8,y:y+h-6,'font-size':'10',fill:'#8C8880','font-family':FF},g);
      f.textContent='長度 '+arr.length+(arr.length>6?'（只顯示前 6 項）':'');
      y+=h+8;
    });
  }
  function drawBubble(){
    if(!S.say){el.bubble.setAttribute('opacity','0');return;}
    var txt=String(S.say);
    if(txt.length>14)txt=txt.slice(0,14)+'…';
    var w=Math.max(54,txt.length*15+26), h=34;
    var bx=clamp(sx(S.x)+26,4,480-w-4), by=clamp(sy(S.y)-58,4,360-h-4);
    el.bubbleBox.setAttribute('x',bx);el.bubbleBox.setAttribute('y',by);
    el.bubbleBox.setAttribute('width',w);el.bubbleBox.setAttribute('height',h);
    el.bubbleTxt.setAttribute('x',bx+13);el.bubbleTxt.setAttribute('y',by+h/2+1);
    el.bubbleTxt.textContent=txt;
    if(S.sayKind==='think'){
      el.bubbleTail.setAttribute('d','');
      el.bubbleDot1.setAttribute('opacity','1');el.bubbleDot2.setAttribute('opacity','1');
      el.bubbleDot1.setAttribute('cx',bx+12);el.bubbleDot1.setAttribute('cy',by+h+9);
      el.bubbleDot2.setAttribute('cx',bx+2);el.bubbleDot2.setAttribute('cy',by+h+19);
    }else{
      el.bubbleDot1.setAttribute('opacity','0');el.bubbleDot2.setAttribute('opacity','0');
      el.bubbleTail.setAttribute('d','M '+(bx+10)+' '+(by+h-2)+' L '+(bx+2)+' '+(by+h+18)+' L '+(bx+30)+' '+(by+h-2)+' z');
    }
    el.bubble.setAttribute('opacity','1');
  }
  function render(){
    fence();
    el.sprite.setAttribute('transform','translate('+sx(S.x)+','+sy(S.y)+')');
    var t='';
    if(S.rot==='任意'){t='rotate('+(S.dir-90)+')';}
    else if(S.rot==='左-右'){t=(S.dir<0)?'scale(-1,1)':'';}
    el.inner.setAttribute('transform',t+' scale('+(S.size/100)+')');
    el.arrow.setAttribute('transform','rotate('+(S.dir-90)+')');
    el.mouse.setAttribute('transform','translate('+sx(mouse.x)+','+sy(mouse.y)+')');
    if(T){el.target.setAttribute('transform','translate('+sx(T.x)+','+sy(T.y)+')');}
    for(var i=0;i<el.bd.length;i++){el.bd[i].setAttribute('opacity',(i===S.backdrop-1)?'1':'0');}
    applyCostume();applyFx();drawBubble();drawMonitors();drawLists();
    for(var j=0;j<listeners.length;j++){listeners[j](S,mouse);}
  }

  function stopAnim(){if(anim){cancelAnimationFrame(anim.id);anim=null;}}
  function glide(tx,ty,secs){
    stopAnim();
    return new Promise(function(res){
      var x0=S.x,y0=S.y,t0=performance.now(),ms=Math.max(0,secs)*1000;
      if(ms===0){S.x=tx;S.y=ty;render();res();return;}
      function step(now){
        var p=Math.min(1,(now-t0)/ms);
        S.x=x0+(tx-x0)*p;S.y=y0+(ty-y0)*p;render();
        if(p<1){anim.id=requestAnimationFrame(step);}else{anim=null;res();}
      }
      anim={id:requestAnimationFrame(step)};
    });
  }
  function setSay(text,kind,secs){
    if(sayTimer){clearTimeout(sayTimer);sayTimer=null;}
    S.say=(text===''||text===null||text===undefined)?null:text;
    S.sayKind=kind;render();
    if(secs===undefined)return;
    return new Promise(function(res){
      sayTimer=setTimeout(function(){S.say=null;render();sayTimer=null;res();},Math.max(0,secs)*1000);
    });
  }

  var RUN={
    /* ---- 動作類 ---- */
    move:function(a){var r=S.dir*Math.PI/180,n=Number(a.STEPS)||0;S.x+=n*Math.sin(r);S.y+=n*Math.cos(r);render();},
    turnRight:function(a){S.dir=norm(S.dir+(Number(a.DEG)||0));render();},
    turnLeft:function(a){S.dir=norm(S.dir-(Number(a.DEG)||0));render();},
    gotoTarget:function(a){
      if(a.TO==='鼠標'){S.x=mouse.x;S.y=mouse.y;}
      else{S.x=Math.round(Math.random()*440-220);S.y=Math.round(Math.random()*320-160);}
      render();
    },
    gotoXY:function(a){S.x=Number(a.X)||0;S.y=Number(a.Y)||0;render();},
    glideTarget:function(a){
      var tx,ty;
      if(a.TO==='鼠標'){tx=mouse.x;ty=mouse.y;}
      else{tx=Math.round(Math.random()*440-220);ty=Math.round(Math.random()*320-160);}
      return glide(tx,ty,Number(a.SECS)||0);
    },
    glideXY:function(a){return glide(Number(a.X)||0,Number(a.Y)||0,Number(a.SECS)||0);},
    pointDir:function(a){S.dir=norm(Number(a.DIR)||0);render();},
    pointTowards:function(){
      var dx=mouse.x-S.x,dy=mouse.y-S.y;
      if(dx!==0||dy!==0){S.dir=norm(Math.atan2(dx,dy)*180/Math.PI);}
      render();
    },
    changeX:function(a){S.x+=Number(a.DX)||0;render();},
    setX:function(a){S.x=Number(a.X)||0;render();},
    changeY:function(a){S.y+=Number(a.DY)||0;render();},
    setY:function(a){S.y=Number(a.Y)||0;render();},
    bounce:function(){
      var hit=false;
      if(S.x<-240+HW){S.x=-240+HW;S.dir=norm(-S.dir);hit=true;}
      else if(S.x>240-HW){S.x=240-HW;S.dir=norm(-S.dir);hit=true;}
      if(S.y>180-HH){S.y=180-HH;S.dir=norm(180-S.dir);hit=true;}
      else if(S.y<-180+HH){S.y=-180+HH;S.dir=norm(180-S.dir);hit=true;}
      render();return hit;
    },
    setRotStyle:function(a){S.rot=a.STYLE||'任意';render();},
    reportX:function(){return round1(S.x);},
    reportY:function(){return round1(S.y);},
    reportDir:function(){return round1(S.dir);},

    /* ---- 外觀類 ---- */
    sayFor:function(a){return setSay(a.MSG,'say',Number(a.SECS)||0);},
    say:function(a){setSay(a.MSG,'say');},
    thinkFor:function(a){return setSay(a.MSG,'think',Number(a.SECS)||0);},
    think:function(a){setSay(a.MSG,'think');},
    switchCostume:function(a){
      var i=COSTUMES.indexOf(a.COSTUME);S.costume=(i<0?0:i)+1;render();
    },
    nextCostume:function(){S.costume=S.costume===1?2:1;render();},
    switchBackdrop:function(a){
      var i=BACKDROPS.indexOf(a.BACKDROP);S.backdrop=(i<0?0:i)+1;render();
    },
    nextBackdrop:function(){S.backdrop=S.backdrop%BACKDROPS.length+1;render();},
    changeSize:function(a){S.size=clamp(S.size+(Number(a.DS)||0),20,300);render();},
    setSize:function(a){S.size=clamp(Number(a.SIZE)||100,20,300);render();},
    changeEffect:function(a){
      var k=a.FX||'顏色';
      S.fx[k]=(Number(S.fx[k])||0)+(Number(a.V)||0);render();
      return (['顏色','亮度','幻影'].indexOf(k)<0)?'（小舞台先不呈現「'+k+'」的畫面效果，數值已記錄）':undefined;
    },
    setEffect:function(a){
      var k=a.FX||'顏色';
      S.fx[k]=Number(a.V)||0;render();
      return (['顏色','亮度','幻影'].indexOf(k)<0)?'（小舞台先不呈現「'+k+'」的畫面效果，數值已記錄）':undefined;
    },
    clearEffects:function(){S.fx={};render();},
    show:function(){S.visible=true;render();},
    hide:function(){S.visible=false;render();},
    goToLayer:function(a){S.layer=(a.WHERE==='最下')?'back':'front';applyLayer();render();},
    changeLayer:function(a){S.layer=(a.DIR==='下')?'back':'front';applyLayer();render();},
    reportCostume:function(a){return a.WHICH==='名稱'?COSTUMES[S.costume-1]:S.costume;},
    reportBackdrop:function(a){return a.WHICH==='名稱'?BACKDROPS[S.backdrop-1]:S.backdrop;},
    reportSize:function(){return Math.round(S.size);},

    /* ---- 控制／事件 ---- */
    wait:function(a){
      var ms=Math.max(0,Number(a.SECS)||0)*1000;
      return new Promise(function(res){setTimeout(res,ms);});
    },
    hatNote:function(){return '這是啟動積木，要放在腳本的最上面。把它加進右邊的小腳本，再按綠旗試試看！';},
    cNote:function(){return '這是 C 型積木，要夾住其他積木才看得出效果。把它加進右邊的小腳本吧！';},
    myNote:function(){return '要先在同一段腳本裡放一塊「定義」，這塊呼叫積木才有東西可以做。';},
    defNote:function(){return '「定義」自己不會執行，把要做的事包進凹槽裡，再用呼叫積木叫它。';},
    argNote:function(){return '（要放在對應的定義裡面才會有值）';},
    broadcast:function(a){castMsg(a.MSG||'message1');},
    createClone:function(){addClone();},
    deleteClones:function(){clearClones();},
    stopNote:function(){return '「停止」要放在腳本裡才有作用（執行中按紅色停止鈕也可以）。';},

    /* ---- 偵測類 ---- */
    touching:function(a){
      var w=a.WHAT||'鼠標';
      if(w==='鼠標')return Math.sqrt(Math.pow(S.x-mouse.x,2)+Math.pow(S.y-mouse.y,2))<30*(S.size/100)+6;
      if(w==='邊緣')return cond('碰到邊緣');
      return propHit();
    },
    touchColor:function(a){return colorHit(a.C||'綠色（草叢）');},
    colorTouch:function(a){
      // 角色身上的「某個顏色」碰到舞台上的「某個顏色」
      if((a.A||'')==='白色（眼睛）')return colorHit(a.B||'綠色（草叢）')&&S.size>=100;
      return colorHit(a.B||'綠色（草叢）');
    },
    distTo:function(a){
      var tx=62,ty=-34;
      if((a.WHAT||'鼠標')==='鼠標'){tx=mouse.x;ty=mouse.y;}
      return round1(Math.sqrt(Math.pow(S.x-tx,2)+Math.pow(S.y-ty,2)));
    },
    ask:function(a){return doAsk(a.Q===undefined?'你的名字是？':String(a.Q));},
    answer:function(){return S.answer;},
    keyPressed:function(a){return !!keys[a.KEY||'空白'];},
    mouseDown:function(){return mdown;},
    mouseX:function(){return round1(mouse.x);},
    mouseY:function(){return round1(mouse.y);},
    setDrag:function(a){S.drag=a.MODE||'可拖曳';return '已設為「'+S.drag+'」（小舞台上只記錄設定值）';},
    loudness:function(){return Math.round(18+20*Math.abs(Math.sin(Date.now()/700)));},
    timer:function(){return round1((Date.now()-timer0)/1000);},
    timerReset:function(){timer0=Date.now();},
    backdropOf:function(a){
      return (a.WHICH==='背景名稱')?BACKDROPS[S.backdrop-1]:S.backdrop;
    },
    nowTime:function(a){
      var d=new Date();
      switch(a.UNIT){
        case '月': return d.getMonth()+1;
        case '日': return d.getDate();
        case '星期': return d.getDay()+1;
        case '時': return d.getHours();
        case '分': return d.getMinutes();
        case '秒': return d.getSeconds();
        default:  return d.getFullYear();
      }
    },
    daysSince2000:function(){return round1((Date.now()-Date.UTC(2000,0,1))/86400000);},
    userName:function(){return '（要在 Scratch 網站登入才看得到）';},

    /* ---- 變數類 ---- */
    varReport:function(a){
      var n=a.V||VNAMES[0];
      return (S.vars[n]===undefined)?0:S.vars[n];
    },
    setVar:function(a){
      var n=a.V||VNAMES[0];
      S.vars[n]=(a.N===undefined?0:a.N);render();
    },
    changeVar:function(a){
      var n=a.V||VNAMES[0];
      S.vars[n]=fix(num(S.vars[n])+num(a.N===undefined?1:a.N));render();
    },
    showVar:function(a){S.varShow[a.V||VNAMES[0]]=true;render();},
    hideVar:function(a){S.varShow[a.V||VNAMES[0]]=false;render();},

    /* ---- 清單類（積木中文字待截圖確認，功能先就緒） ---- */
    listAdd:function(a){
      var n=a.L||LNAMES[0], arr=S.lists[n]||(S.lists[n]=[]);
      if(arr.length<200)arr.push(a.IT===undefined?'':a.IT);
      render();
    },
    listDeleteAt:function(a){
      var n=a.L||LNAMES[0], arr=S.lists[n]||[], i=Math.round(num(a.N));
      if(i>=1&&i<=arr.length)arr.splice(i-1,1);
      render();
    },
    listDeleteAll:function(a){S.lists[a.L||LNAMES[0]]=[];render();},
    listInsertAt:function(a){
      var n=a.L||LNAMES[0], arr=S.lists[n]||(S.lists[n]=[]), i=Math.round(num(a.N));
      if(i<1)i=1; if(i>arr.length+1)i=arr.length+1;
      if(arr.length<200)arr.splice(i-1,0,a.IT===undefined?'':a.IT);
      render();
    },
    listReplaceAt:function(a){
      var n=a.L||LNAMES[0], arr=S.lists[n]||[], i=Math.round(num(a.N));
      if(i>=1&&i<=arr.length)arr[i-1]=(a.IT===undefined?'':a.IT);
      render();
    },
    listItemAt:function(a){
      var arr=S.lists[a.L||LNAMES[0]]||[], i=Math.round(num(a.N));
      return (i>=1&&i<=arr.length)?arr[i-1]:'';
    },
    listIndexOf:function(a){
      var arr=S.lists[a.L||LNAMES[0]]||[], t=String(a.IT===undefined?'':a.IT).toLowerCase();
      for(var i=0;i<arr.length;i++){if(String(arr[i]).toLowerCase()===t)return i+1;}
      return 0;
    },
    listLength:function(a){return (S.lists[a.L||LNAMES[0]]||[]).length;},
    listContains:function(a){
      var arr=S.lists[a.L||LNAMES[0]]||[], t=String(a.IT===undefined?'':a.IT).toLowerCase();
      for(var i=0;i<arr.length;i++){if(String(arr[i]).toLowerCase()===t)return true;}
      return false;
    },
    listReport:function(a){return (S.lists[a.L||LNAMES[0]]||[]).join(' ');},
    listShowM:function(a){S.listShow[a.L||LNAMES[0]]=true;render();},
    listHideM:function(a){S.listShow[a.L||LNAMES[0]]=false;render();},

    /* ---- AI 擴充模組（模擬） ---- */
    handX:function(a){
      if(!AI.handSeen)return '';
      return round1(clamp(mouse.x+handOff(a.P).dx,-240,240));
    },
    handY:function(a){
      if(!AI.handSeen)return '';
      return round1(clamp(mouse.y+handOff(a.P).dy,-180,180));
    },
    handZ:function(a){
      if(!AI.handSeen)return '';
      return round1((handOff(a.P).dy)/40);
    },
    faceX:function(a){
      if(!AI.faceCount||num(a.N)>AI.faceCount)return '';
      return round1(clamp(mouse.x+faceOff(a.P).dx,-240,240));
    },
    faceY:function(a){
      if(!AI.faceCount||num(a.N)>AI.faceCount)return '';
      return round1(clamp(mouse.y+faceOff(a.P).dy,-180,180));
    },
    faceCount:function(){return AI.faceCount;},
    camMirror:function(a){return '（小舞台沒有攝影機畫面，已記錄設定：'+(a.M||'鏡像開啟')+'）';},
    camOpacity:function(a){return '（已記錄透明度 '+(a.V===undefined?50:a.V)+'；數字越大越透明）';},
    camScale:function(a){return '（已記錄倍率 '+(a.S||'0.75')+'；預設 0.75 剛好換成 480×360）';},

    /* ---- 運算類 ---- */
    opAdd:function(a){return fix(num(a.A)+num(a.B));},
    opSub:function(a){return fix(num(a.A)-num(a.B));},
    opMul:function(a){return fix(num(a.A)*num(a.B));},
    opDiv:function(a){var b=num(a.B);return b===0?'Infinity':fix(num(a.A)/b);},
    opRandom:function(a){
      var lo=num(a.A),hi=num(a.B);
      if(lo>hi){var t=lo;lo=hi;hi=t;}
      var isInt=(String(a.A).indexOf('.')<0&&String(a.B).indexOf('.')<0);
      return isInt?Math.floor(Math.random()*(hi-lo+1))+lo:fix(lo+Math.random()*(hi-lo));
    },
    opGt:function(a){return cmp(a.A,a.B)>0;},
    opLt:function(a){return cmp(a.A,a.B)<0;},
    opEq:function(a){return cmp(a.A,a.B)===0;},
    opAnd:function(a){return truth(a.A)&&truth(a.B);},
    opOr:function(a){return truth(a.A)||truth(a.B);},
    opNot:function(a){return !truth(a.A);},
    opJoin:function(a){return String(a.A===undefined?'':a.A)+String(a.B===undefined?'':a.B);},
    opLetter:function(a){var s=String(a.B===undefined?'':a.B);return s.charAt(Math.round(num(a.A))-1)||'';},
    opLength:function(a){return String(a.A===undefined?'':a.A).length;},
    opContains:function(a){
      return String(a.A===undefined?'':a.A).toLowerCase().indexOf(String(a.B===undefined?'':a.B).toLowerCase())>=0;
    },
    opMod:function(a){var b=num(a.B);if(b===0)return 'NaN';var r=num(a.A)%b;if(r&&((r<0)!==(b<0)))r+=b;return fix(r);},
    opRound:function(a){return Math.round(num(a.A));},
    opMath:function(a){
      var v=num(a.A);
      switch(a.FN){
        case '無條件捨去': return Math.floor(v);
        case '無條件進位': return Math.ceil(v);
        case '平方根': return fix(Math.sqrt(v));
        case 'sin': return fix(Math.sin(v*Math.PI/180));
        case 'cos': return fix(Math.cos(v*Math.PI/180));
        case 'tan': return fix(Math.tan(v*Math.PI/180));
        case 'ln':  return fix(Math.log(v));
        case 'log': return fix(Math.log(v)/Math.LN10);
        case 'e^':  return fix(Math.exp(v));
        case '10^': return fix(Math.pow(10,v));
        default:    return fix(Math.abs(v));
      }
    }
  };

  /* 同步取值：回報型／布林型積木專用（嵌套運算會遞迴呼叫它） */
  function calc(op,args){
    if(!RUN[op])return '';
    var r=RUN[op](args||{});
    if(r&&typeof r.then==='function')return '';
    return (r===undefined)?'':r;
  }
  function run(op,args){
    if(!RUN[op])return Promise.resolve('（這塊積木還在建置中）');
    var r=RUN[op](args||{});
    if(r&&typeof r.then==='function')return r;
    return Promise.resolve(r);
  }
  function reset(){
    stopAnim();
    if(sayTimer){clearTimeout(sayTimer);sayTimer=null;}
    S.x=0;S.y=0;S.dir=90;S.rot='任意';S.size=100;S.visible=true;
    S.costume=1;S.backdrop=1;S.layer='front';S.say=null;S.fx={};S.answer='';S.drag='可拖曳';
    timer0=Date.now();resetVars();
    if(el.ask){el.ask.setAttribute('opacity','0');el.ask.style.pointerEvents='none';askDone=null;}
    clearClones();
    applyLayer();render();
  }
  function setTarget(x,y){
    T={x:x,y:y};el.target.setAttribute('opacity','1');render();
  }
  function clearTarget(){T=null;el.target.setAttribute('opacity','0');}
  function distToTarget(){
    if(!T)return null;
    return Math.sqrt(Math.pow(S.x-T.x,2)+Math.pow(S.y-T.y,2));
  }
  return {
    init:init, run:run, calc:calc, reset:reset, onChange:onChange, state:S,
    setTarget:setTarget, clearTarget:clearTarget, distToTarget:distToTarget,
    cond:cond, keys:keys, clearClones:clearClones, ai:AI,
    setHandSeen:function(b){AI.handSeen=!!b;render();},
    setFaceCount:function(n){AI.faceCount=Math.max(0,Math.round(n)||0);render();},
    setFaceMouth:function(n){AI.mouth=Number(n)||0;render();},
    mouse:function(){return {x:mouse.x,y:mouse.y};},
    resetTimer:function(){timer0=Date.now();},
    setGrid:function(on){el.grid.setAttribute('opacity',on?'1':'0');},
    setArrow:function(on){el.arrow.setAttribute('opacity',on?'.9':'0');},
    setMouseMark:function(on){el.mouse.setAttribute('opacity',on?'.85':'0');}
  };
})();
