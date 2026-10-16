/* 森林動物搬家記・溪流上游：教學頁互動示範 */
(function(){
  BLK.auto(SCRIPTS);
  var $=function(id){return document.getElementById(id);};

  /* ============ 動作判斷實驗室 ============ */
  var st=$('hStage');
  if(st){
    var pos={x:0,y:0}, spread=40, drag=false;
    function toPx(){
      var r=st.getBoundingClientRect();
      return {l:(pos.x+240)/480*r.width, t:(180-pos.y)/360*r.height};
    }
    function classify(){
      if(pos.y<-40)return ['預備',1];
      if(pos.y>80)return ['舉高',2];
      if(pos.x<-100)return ['左',3];
      if(pos.x>100)return ['右',3];
      if(spread>90)return ['張開',4];   // 手在中間時才看手掌張不張開
      return ['中間',5];
    }
    function paint(){
      var p=toPx();
      $('hHand').style.left=p.l+'px';$('hHand').style.top=p.t+'px';
      $('hx').textContent=Math.round(pos.x);$('hy').textContent=Math.round(pos.y);$('hs').textContent=spread;
      var r=classify();
      $('hRes').textContent=r[0];$('hLab').textContent=r[0];
      document.querySelectorAll('#hSteps li').forEach(function(li){li.classList.toggle('on',+li.getAttribute('data-s')===r[1]);});
      $('zHigh').style.top=((180-80)/360*100)+'%';
      $('zLow').style.top=((180+40)/360*100)+'%';
    }
    function fromEvent(ev){
      var r=st.getBoundingClientRect();
      pos.x=Math.max(-235,Math.min(235,(ev.clientX-r.left)/r.width*480-240));
      pos.y=Math.max(-175,Math.min(175,180-(ev.clientY-r.top)/r.height*360));
      paint();
    }
    st.addEventListener('pointerdown',function(ev){drag=true;try{st.setPointerCapture(ev.pointerId);}catch(e){}fromEvent(ev);ev.preventDefault();});
    st.addEventListener('pointermove',function(ev){if(drag)fromEvent(ev);});
    st.addEventListener('pointerup',function(){drag=false;});
    $('hSpread').addEventListener('input',function(){spread=+this.value;$('hSpreadO').textContent=spread;paint();});
    paint();
  }

  /* ============ 預備姿勢模擬器 ============ */
  var armed=0,wave=0,cnt=0,first=true;
  document.querySelectorAll('#armBtns button').forEach(function(b){
    b.addEventListener('click',function(){
      var g=b.getAttribute('data-g'),log=$('armLog'),msg,cls='no';
      if(first){log.innerHTML='';first=false;}
      if(g==='預備'){armed=1;msg='看到「預備」：可以觸發 ＝ 1（回到預備姿勢了）'+(wave===1?'；揮動階段保持 1，揮到一半手掉下來不算失敗':'');}
      else if(g==='無'){msg='看不到手：什麼都不做';}
      else if(armed===0){msg='看到「'+g+'」，但可以觸發 ＝ 0 → 不算（要先回到預備姿勢）';}
      else if(g==='左'){wave=1;msg='看到「左」：揮動階段 ＝ 1（2 秒內揮到右邊就算數）';}
      else if(g==='右'){
        if(wave===1){armed=0;wave=0;cnt++;msg='🗑️ 撈起一件垃圾！可以觸發 ＝ 0';cls='fire';}
        else msg='看到「右」，但還沒從左邊揮過來 → 不算';
      }
      else if(wave===1){msg='看到「'+g+'」，但現在正在揮動中（揮動階段 ＝ 1）→ 先不理它，免得打斷揮動';}
      else if(g==='舉高'){armed=0;cnt++;msg='🌳 種一棵樹！可以觸發 ＝ 0';cls='fire';}
      else if(g==='張開'){armed=0;cnt++;msg='🖐 擋住廢水！可以觸發 ＝ 0';cls='fire';}
      var d=document.createElement('div');d.className=cls;d.textContent=msg;log.prepend(d);
      $('armGun').textContent='可以觸發 ＝ '+armed;$('armGun').classList.toggle('on',!!armed);
      $('armWave').textContent='揮動階段 ＝ '+wave;$('armWave').classList.toggle('on',!!wave);
      $('armCnt').textContent=cnt;
    });
  });

  /* ============ 溪流模擬器 ============ */
  var S={水質:45,垃圾:5,遮蔭:1,水蠆在:1,回合:1};
  var scene=$('simScene');
  function ending(q,t){
    if(q>=70&&t<=2)return '好';
    if(q<40)return '壞';
    return '普通';
  }
  function drawScene(){
    var q=S.水質,t=S.垃圾,sh=S.遮蔭;
    var poolCol=q<40?['#9C8B4E','#B8A55E']:(q<70?['#5FA6B5','#7FC0CC']:['#3FA9D6','#79D0EC']);
    var rx=q<40?86:(q<70?104:122), ry=rx*0.42;
    var h=['<svg viewBox="0 0 480 360" role="img" aria-label="溪流水潭示意圖">',
      '<rect width="480" height="360" fill="#BFE8F5"/>',
      '<path d="M0 150 L90 78 L170 150 Z" fill="#9CC6A8"/><path d="M120 155 L230 70 L330 155 Z" fill="#8ABD97"/><path d="M280 155 L380 90 L480 155 Z" fill="#A2CCAE"/>',
      '<path d="M0 150 H480 V240 Q360 216 240 240 Q120 264 0 236 Z" fill="#6FA45B"/>',
      '<path d="M0 236 Q120 264 240 240 Q360 216 480 240 V360 H0 Z" fill="#C9B79A"/>'];
    // 樹
    for(var i=1;i<=sh;i++){
      var x=4+i*52,big=sh>=3;          // 和 Scratch 一樣：x = 編號 × 52 − 236
      h.push('<path d="M'+x+' 210 V'+(big?170:185)+'" stroke="#7A5A34" stroke-width="'+(big?9:6)+'" stroke-linecap="round"/>');
      if(big){h.push('<circle cx="'+(x-12)+'" cy="160" r="17" fill="#5FAE58"/><circle cx="'+(x+14)+'" cy="156" r="19" fill="#74C46A"/><circle cx="'+x+'" cy="144" r="15" fill="#8AD47C"/>');}
      else{h.push('<ellipse cx="'+(x-10)+'" cy="178" rx="13" ry="8" fill="#5FAE58"/><ellipse cx="'+(x+12)+'" cy="174" rx="13" ry="8" fill="#74C46A"/>');}
    }
    // 水潭
    h.push('<ellipse cx="250" cy="268" rx="'+(rx+8)+'" ry="'+(ry+7)+'" fill="'+poolCol[0]+'"/>');
    h.push('<ellipse cx="250" cy="265" rx="'+rx+'" ry="'+ry+'" fill="'+poolCol[1]+'"/>');
    // 水草
    if(q>=50){
      var n=q>=85?7:(q>=70?4:2);
      for(var k=0;k<n;k++){
        var wx=180+k*24;
        h.push('<path d="M'+wx+' 292 Q'+(wx+8)+' 262 '+(wx-2)+' 240" stroke="#3E8E5A" stroke-width="5" fill="none" stroke-linecap="round"/>');
      }
    }
    // 垃圾
    var px=[190,230,270,310,160,340];
    for(var j=0;j<t;j++){
      var X=px[j];
      h.push('<rect x="'+(X-8)+'" y="248" width="16" height="26" rx="6" fill="#EDEDED" stroke="#3F3327" stroke-width="2"/>');
    }
    // 水蠆
    if(S.水蠆在===1&&q>=45&&t<=3){
      h.push('<g transform="translate(300,276) scale(.8)"><ellipse cx="0" cy="0" rx="16" ry="8" fill="#7A6A4F" stroke="#3F3327" stroke-width="2"/><circle cx="-18" cy="-2" r="7" fill="#8B7A5C" stroke="#3F3327" stroke-width="2"/><path d="M-6 8 l-6 8 M4 9 l0 9 M12 8 l7 9" stroke="#3F3327" stroke-width="2" stroke-linecap="round"/></g>');
    }
    // 翠鳥
    if(q>=65&&sh>=2){
      h.push('<g transform="translate(408,150)"><ellipse cx="0" cy="0" rx="20" ry="14" fill="#2E9BD6" stroke="#3F3327" stroke-width="2.5"/><circle cx="-16" cy="-10" r="11" fill="#35A8E0" stroke="#3F3327" stroke-width="2.5"/><path d="M-27 -10 L-44 -7 L-27 -4 Z" fill="#E08A2E" stroke="#3F3327" stroke-width="2"/><circle cx="-19" cy="-12" r="2.6" fill="#2D2418"/></g>');
    }
    // 青蛙
    var frogCol=q<40?'#8FA87F':'#6FBF5F';
    h.push('<g transform="translate(96,250)"><ellipse cx="0" cy="10" rx="30" ry="21" fill="'+frogCol+'" stroke="#3F3327" stroke-width="3"/>'+
      '<circle cx="-13" cy="-14" r="12" fill="'+frogCol+'" stroke="#3F3327" stroke-width="3"/><circle cx="13" cy="-14" r="12" fill="'+frogCol+'" stroke="#3F3327" stroke-width="3"/>'+
      (q<40?'<path d="M-18 -14 h10 M8 -14 h10" stroke="#2D2418" stroke-width="3" stroke-linecap="round"/><path d="M-11 18 Q0 10 11 18" fill="none" stroke="#3F3327" stroke-width="3"/>'
           :'<circle cx="-13" cy="-14" r="4.5" fill="#2D2418"/><circle cx="13" cy="-14" r="4.5" fill="#2D2418"/><path d="M-12 12 Q0 '+(q>=70?24:18)+' 12 12" fill="none" stroke="#3F3327" stroke-width="3" stroke-linecap="round"/>')+
      '</g>');
    h.push('</svg>');
    scene.innerHTML=h.join('');
  }
  function paintSim(msg){
    $('bQv').textContent=S.水質;$('bTv').textContent=S.垃圾;$('bSv').textContent=S.遮蔭;
    $('bQ').style.width=S.水質+'%';$('bT').style.width=(S.垃圾/6*100)+'%';$('bS').style.width=(S.遮蔭/8*100)+'%';
    var e=ending(S.水質,S.垃圾);
    var box=$('simEnd');box.textContent='如果現在就結束：'+e+'結局';
    box.className='simend '+(e==='好'?'good':(e==='壞'?'bad':'mid'));
    if(msg){var d=document.createElement('div');d.textContent=msg;$('simLog').prepend(d);}
    drawScene();
  }
  function clamp(){S.水質=Math.max(0,Math.min(100,S.水質));}
  document.querySelectorAll('[data-sim]').forEach(function(b){
    b.addEventListener('click',function(){
      var a=b.getAttribute('data-sim');
      if(a==='撈'){ if(S.垃圾>0){S.垃圾--;S.水質+=5;clamp();paintSim('撈起一件垃圾：垃圾 −1、水質 +5');} else paintSim('已經沒有垃圾了'); }
      else if(a==='樹'){ if(S.遮蔭<8){S.遮蔭++;paintSim('種一棵樹：遮蔭 +1');} else paintSim('青蛙說：樹已經夠多了！（遮蔭最多 8）'); }
      else if(a==='擋'){ paintSim('擋下偷倒廢水：水質沒有變差 👍'); }
      else if(a==='亂丟'){ if(S.垃圾<5)S.垃圾+=2; else if(S.垃圾===5)S.垃圾++; S.水質-=3; clamp(); paintSim('有人把垃圾丟進溪裡：垃圾 +2、水質 −3'); }
      else if(a==='沒擋'){ S.水質-=20; if(S.垃圾<6)S.垃圾++; S.水蠆在=0; clamp(); paintSim('沒擋到！水質 −20、垃圾 +1，水蠆消失'); }
      else if(a==='回合'){
        var before=S.水質;
        if(S.遮蔭>=6)S.水質+=5; else if(S.遮蔭>=4)S.水質+=3; else if(S.遮蔭===3)S.水質+=0; else S.水質-=5;
        if(S.垃圾>3)S.水質-=3;
        if(S.水質>=70)S.水蠆在=1;
        clamp();
        paintSim('第 '+S.回合+' 回合結束：水質 '+before+' → '+S.水質+'（遮蔭 '+S.遮蔭+'、垃圾 '+S.垃圾+'）');
        S.回合++;
      }
      else { S={水質:45,垃圾:5,遮蔭:1,水蠆在:1,回合:1}; $('simLog').innerHTML=''; paintSim('重新開始：水質 45、垃圾 5、遮蔭 1'); }
    });
  });
  if(scene)paintSim('');

  /* ============ 結局判定器 ============ */
  function endLab(){
    var q=+$('eQ').value,t=+$('eT').value;
    $('eQo').textContent=q;$('eTo').textContent=t;
    var e=ending(q,t);
    $('ecG').classList.toggle('on',e==='好');
    $('ecM').classList.toggle('on',e==='普通');
    $('ecB').classList.toggle('on',e==='壞');
  }
  if($('eQ')){$('eQ').addEventListener('input',endLab);$('eT').addEventListener('input',endLab);endLab();}

  /* ============ 自我檢核 ============ */
  var KEY='forest2026.check', boxes=[].slice.call(document.querySelectorAll('#chk input'));
  function save(){
    var v=boxes.map(function(b){return b.checked?1:0;});
    try{localStorage.setItem(KEY,JSON.stringify(v));$('chkNote').textContent='已自動儲存在這台電腦的瀏覽器。';}
    catch(e){$('chkNote').textContent='這個瀏覽器不允許儲存，勾選結果關閉頁面後會消失。';}
    if($('pbar'))$('pbar').style.width=(v.reduce(function(a,b){return a+b;},0)/boxes.length*100)+'%';
  }
  try{var old=JSON.parse(localStorage.getItem(KEY)||'[]');boxes.forEach(function(b,i){b.checked=!!old[i];});}catch(e){}
  boxes.forEach(function(b){b.addEventListener('change',save);});
  if($('pbar')&&boxes.length)$('pbar').style.width=(boxes.filter(function(b){return b.checked;}).length/boxes.length*100)+'%';

  /* ============ 目錄目前位置 ============ */
  var links=[].slice.call(document.querySelectorAll('.toc a[href^="#"]'));
  function onScroll(){
    var cur=null;links.forEach(function(a){var s=document.querySelector(a.getAttribute('href'));if(s&&s.getBoundingClientRect().top<120)cur=a;});
    links.forEach(function(a){a.classList.toggle('on',a===cur);});
  }
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
})();
