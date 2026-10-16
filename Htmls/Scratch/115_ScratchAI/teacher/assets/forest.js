/* ===== 森林場景模擬器（國小動畫 AI 互動組・森林動物搬家記） =====
   示範任務三：每完成一項行動，場景須產生相對應變化；不適當的選擇則使環境惡化。
   狀態：樹木 0~6、水質 0~100、垃圾 0~6
   生物出現條件：鳥（樹≥3）、松鼠（樹≥5 且垃圾≤2）、青蛙（水質≥60 且垃圾≤3）
*/
var Forest = (function(){
  var NS='http://www.w3.org/2000/svg';
  var S={tree:1, water:25, trash:5};
  var el={}, listeners=[], log=[];

  function mk(t,a,p){var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e;}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function onChange(fn){listeners.push(fn);}
  function fire(){for(var i=0;i<listeners.length;i++)listeners[i](state());}

  /* 生物是否出現 */
  function birdOK(){return S.tree>=3;}
  function squirrelOK(){return S.tree>=5&&S.trash<=2;}
  function frogOK(){return S.water>=60&&S.trash<=3;}
  function health(){
    return Math.round((S.tree/6*40)+(S.water/100*35)+((6-S.trash)/6*25));
  }
  function stage(){
    var h=health();
    if(h>=80)return {k:'good', t:'森林復育成功', d:'三種生物都回來了，這是「森林重生」結局。'};
    if(h>=45)return {k:'mid',  t:'森林正在恢復', d:'還有生物沒回來，再完成幾項行動看看。'};
    return {k:'bad', t:'森林持續惡化', d:'動物快住不下去了，這是「動物搬家」結局。'};
  }
  function state(){
    return {tree:S.tree,water:S.water,trash:S.trash,health:health(),
            bird:birdOK(),squirrel:squirrelOK(),frog:frogOK(),
            stage:stage(),log:log.slice()};
  }

  /* ---------- 繪製 ---------- */
  function init(svg){
    el.svg=svg;
    svg.setAttribute('viewBox','0 0 480 300');
    /* 天空（依健康度變色） */
    el.sky=mk('rect',{x:0,y:0,width:480,height:300,fill:'#CFE8FF'},svg);
    el.sun=mk('circle',{cx:410,cy:48,r:24,fill:'#FFE27A'},svg);
    /* 遠山 */
    mk('path',{d:'M0 168 L96 108 L168 168 Z',fill:'#B9CDBA'},svg);
    mk('path',{d:'M132 168 L216 96 L300 168 Z',fill:'#A8C2AA'},svg);
    /* 地面 */
    el.ground=mk('path',{d:'M0 168 L480 168 L480 300 L0 300 Z',fill:'#9FD983'},svg);
    /* 水池 */
    el.pond=mk('ellipse',{cx:92,cy:244,rx:76,ry:32,fill:'#6FB7D8'},svg);
    el.pondEdge=mk('ellipse',{cx:92,cy:244,rx:76,ry:32,fill:'none',stroke:'#4E93B0','stroke-width':3},svg);
    el.scum=mk('g',{opacity:'0'},svg);
    for(var i=0;i<5;i++){
      mk('ellipse',{cx:46+i*24,cy:236+(i%2)*14,rx:15,ry:7,fill:'#8FA05C',opacity:'.85'},el.scum);
    }
    /* 樹 */
    el.trees=mk('g',{},svg);
    var TX=[[214,262],[268,250],[322,264],[372,248],[418,264],[166,250]];
    el.tree=[];
    for(var t=0;t<6;t++){
      var g=mk('g',{opacity:'0'},el.trees);
      var x=TX[t][0], y=TX[t][1];
      mk('rect',{x:x-5,y:y-30,width:10,height:32,rx:3,fill:'#8B6B4A'},g);
      mk('circle',{cx:x,cy:y-40,r:22,fill:'#5FAE58'},g);
      mk('circle',{cx:x-15,cy:y-30,r:15,fill:'#6FC067'},g);
      mk('circle',{cx:x+15,cy:y-30,r:15,fill:'#52A04C'},g);
      el.tree.push(g);
    }
    /* 枯樹（樹木少時出現） */
    el.dead=mk('g',{},svg);
    [[246,266],[352,262]].forEach(function(c){
      var g=mk('g',{},el.dead);
      mk('path',{d:'M '+c[0]+' '+c[1]+' l 0 -34 m 0 12 l -14 -14 m 14 4 l 15 -16',
        stroke:'#9A8368','stroke-width':5,fill:'none','stroke-linecap':'round'},g);
    });
    /* 垃圾 */
    el.trashG=mk('g',{},svg);
    var GX=[[58,196],[124,204],[186,196],[300,210],[392,200],[440,212]];
    el.trashItems=[];
    for(var k=0;k<6;k++){
      var tg=mk('g',{opacity:'0'},el.trashG);
      var gx=GX[k][0], gy=GX[k][1];
      mk('rect',{x:gx-9,y:gy-8,width:18,height:14,rx:3,fill:'#C96B6B',
        transform:'rotate('+(k*23-30)+' '+gx+' '+gy+')'},tg);
      mk('rect',{x:gx+4,y:gy-2,width:12,height:9,rx:2,fill:'#7E8AC0'},tg);
      el.trashItems.push(tg);
    }
    /* 生物 */
    el.bird=mk('g',{opacity:'0'},svg);
    (function(g){
      mk('ellipse',{cx:300,cy:92,rx:16,ry:11,fill:'#F2B33D'},g);
      mk('circle',{cx:313,cy:86,r:7,fill:'#F2B33D'},g);
      mk('circle',{cx:315,cy:85,r:1.8,fill:'#4A4038'},g);
      mk('path',{d:'M320 87 l 9 3 l -9 3 z',fill:'#E0872A'},g);
      mk('path',{d:'M292 88 q 10 -12 20 -2 q -10 8 -20 2 z',fill:'#FFD37A'},g);
      mk('path',{d:'M284 92 l -14 -5 l 14 -2 z',fill:'#E0872A'},g);
    })(el.bird);
    el.squirrel=mk('g',{opacity:'0'},svg);
    (function(g){
      mk('path',{d:'M 196 252 q -26 -12 -16 -38 q 12 -16 18 6 q 4 16 -2 32 z',fill:'#C98A4B'},g);
      mk('ellipse',{cx:204,cy:250,rx:15,ry:13,fill:'#D89A5C'},g);
      mk('circle',{cx:214,cy:240,r:9,fill:'#D89A5C'},g);
      mk('circle',{cx:217,cy:239,r:2,fill:'#4A4038'},g);
      mk('path',{d:'M208 232 l 3 -7 l 5 6 z',fill:'#C98A4B'},g);
    })(el.squirrel);
    el.frog=mk('g',{opacity:'0'},svg);
    (function(g){
      mk('ellipse',{cx:92,cy:216,rx:19,ry:13,fill:'#6FC067'},g);
      mk('circle',{cx:84,cy:204,r:7,fill:'#6FC067'},g);
      mk('circle',{cx:100,cy:204,r:7,fill:'#6FC067'},g);
      mk('circle',{cx:84,cy:203,r:2.6,fill:'#2F4F2A'},g);
      mk('circle',{cx:100,cy:203,r:2.6,fill:'#2F4F2A'},g);
      mk('path',{d:'M83 220 q 9 5 18 0',stroke:'#2F4F2A','stroke-width':2,fill:'none','stroke-linecap':'round'},g);
    })(el.frog);
    /* 訊息橫幅 */
    el.msg=mk('g',{opacity:'0'},svg);
    el.msgBox=mk('rect',{x:86,y:12,width:308,height:32,rx:16,fill:'#fff',stroke:'#CFC6BA','stroke-width':2.5},el.msg);
    el.msgTxt=mk('text',{x:240,y:33,'text-anchor':'middle','font-size':'15',fill:'#4A4038','font-weight':'700',
      'font-family':"'M PLUS Rounded 1c','Noto Sans TC',sans-serif"},el.msg);
    render();
  }

  var msgTimer=null;
  function say(t){
    if(!el.msg)return;
    el.msgTxt.textContent=t;
    el.msg.setAttribute('opacity','1');
    if(msgTimer)clearTimeout(msgTimer);
    msgTimer=setTimeout(function(){el.msg.setAttribute('opacity','0');},2200);
  }

  function render(){
    if(!el.svg)return;
    var h=health();
    /* 天空與陽光隨健康度變化 */
    var sky = h>=80?'#CFE8FF' : h>=45?'#D9E4E8' : '#D6CDBE';
    el.sky.setAttribute('fill',sky);
    el.sun.setAttribute('opacity', h>=45?'1':'.35');
    el.ground.setAttribute('fill', h>=70?'#9FD983' : h>=40?'#AFC98F' : '#C3BE94');
    /* 樹 */
    for(var i=0;i<6;i++)el.tree[i].setAttribute('opacity', i<S.tree?'1':'0');
    el.dead.setAttribute('opacity', S.tree<=2?'1':'0');
    /* 垃圾 */
    for(var k=0;k<6;k++)el.trashItems[k].setAttribute('opacity', k<S.trash?'1':'0');
    /* 水質 */
    var w=S.water;
    el.pond.setAttribute('fill', w>=70?'#6FB7D8' : w>=40?'#8FB39C' : '#8C8F5E');
    el.scum.setAttribute('opacity', w<50?'1':'0');
    /* 生物 */
    el.bird.setAttribute('opacity', birdOK()?'1':'0');
    el.squirrel.setAttribute('opacity', squirrelOK()?'1':'0');
    el.frog.setAttribute('opacity', frogOK()?'1':'0');
    fire();
  }

  /* ---------- 行動 ---------- */
  var ACTIONS={
    plant:{name:'種下一棵樹', good:true, msg:'種了一棵樹，森林變茂密了！',
      run:function(){S.tree=clamp(S.tree+1,0,6);}},
    clean:{name:'撿走垃圾', good:true, msg:'垃圾少了一些，環境變乾淨了！',
      run:function(){S.trash=clamp(S.trash-1,0,6);}},
    purify:{name:'淨化水源', good:true, msg:'水質改善了，池水變清澈！',
      run:function(){S.water=clamp(S.water+20,0,100);}},
    cut:{name:'砍掉一棵樹', good:false, msg:'樹被砍掉了⋯⋯動物少了一個家。',
      run:function(){S.tree=clamp(S.tree-1,0,6);}},
    litter:{name:'亂丟垃圾', good:false, msg:'垃圾變多了，環境開始惡化。',
      run:function(){S.trash=clamp(S.trash+1,0,6);S.water=clamp(S.water-8,0,100);}},
    pollute:{name:'把髒水倒進池子', good:false, msg:'水被污染了，青蛙住不下去。',
      run:function(){S.water=clamp(S.water-25,0,100);}}
  };
  function act(key){
    var a=ACTIONS[key]; if(!a)return null;
    var before={bird:birdOK(),squirrel:squirrelOK(),frog:frogOK()};
    a.run();
    log.push({name:a.name,good:a.good});
    if(log.length>12)log.shift();
    render();
    var after={bird:birdOK(),squirrel:squirrelOK(),frog:frogOK()};
    var extra='';
    ['bird','squirrel','frog'].forEach(function(k){
      var zh={bird:'鳥兒',squirrel:'松鼠',frog:'青蛙'}[k];
      if(!before[k]&&after[k])extra='　'+zh+'回來了！';
      if(before[k]&&!after[k])extra='　'+zh+'搬走了⋯⋯';
    });
    say(a.msg+extra);
    return a;
  }
  function reset(){S.tree=1;S.water=25;S.trash=5;log.length=0;render();say('回到故事開頭：森林正在惡化。');}
  function actions(){return ACTIONS;}

  return {init:init, act:act, reset:reset, state:state, onChange:onChange,
          actions:actions, say:say};
})();
