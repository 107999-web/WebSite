/* ===== 節奏接龍模擬器（國小遊戲 AI 互動組・AI 節奏接龍大作戰） =====
   示範：亂數產生節奏、依序播放提示、玩家輸入比對、預備姿勢判定、
   兩個關卡（節奏記憶 / 節奏接龍）、連續正確加分、難度遞增。
   小舞台沒有攝影機，動作用按鈕或鍵盤模擬；「回到預備姿勢」則做成真的狀態機。
*/
var Rhythm = (function(){
  /* 三個動作：對應不同音高與顏色 */
  var MOVES=[
    {id:'left',  name:'手向左', icon:'👈', key:'ArrowLeft',  hz:392.00, note:'Sol', color:'#4C97FF'},
    {id:'up',    name:'手舉高', icon:'🙌', key:'ArrowUp',    hz:523.25, note:'Do',  color:'#FFAB19'},
    {id:'right', name:'手向右', icon:'👉', key:'ArrowRight', hz:659.25, note:'Mi',  color:'#59C059'}
  ];

  var S={
    level:1,          // 1 節奏記憶 / 2 節奏接龍
    seq:[],           // 目前這一輪的節奏
    input:[],         // 玩家已輸入
    phase:'idle',     // idle / show / play / judge / over
    score:0, combo:0, best:0, round:0,
    ready:true,       // 是否已回到預備姿勢
    speed:620,        // 提示間隔（毫秒），難度遞增會縮短
    life:3,
    msg:'按「開始」進入第一關'
  };
  var listeners=[], timer=null, ac=null;

  function on(fn){listeners.push(fn);}
  function fire(){var st=snap();for(var i=0;i<listeners.length;i++)listeners[i](st);}
  function snap(){
    return {level:S.level,seq:S.seq.slice(),input:S.input.slice(),phase:S.phase,
            score:S.score,combo:S.combo,best:S.best,round:S.round,ready:S.ready,
            speed:S.speed,life:S.life,msg:S.msg,moves:MOVES};
  }
  function moves(){return MOVES;}
  function byId(id){for(var i=0;i<MOVES.length;i++)if(MOVES[i].id===id)return MOVES[i];return null;}

  /* ---------- 聲音（Web Audio，不需要音檔） ---------- */
  function beep(hz,ms,type){
    try{
      if(!ac)ac=new (window.AudioContext||window.webkitAudioContext)();
      if(ac.state==='suspended')ac.resume();
      var o=ac.createOscillator(), g=ac.createGain();
      o.type=type||'triangle'; o.frequency.value=hz;
      g.gain.setValueAtTime(0.0001,ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.22,ac.currentTime+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,ac.currentTime+ms/1000);
      o.connect(g);g.connect(ac.destination);
      o.start();o.stop(ac.currentTime+ms/1000+0.05);
    }catch(e){}
  }
  function sfxOK(){beep(880,120);setTimeout(function(){beep(1174.7,160);},110);}
  function sfxNo(){beep(180,260,'sawtooth');}

  /* ---------- 亂數節奏 ---------- */
  function randMove(){return MOVES[Math.floor(Math.random()*MOVES.length)].id;}
  function newSeq(n){var a=[];for(var i=0;i<n;i++)a.push(randMove());return a;}

  /* ---------- 流程 ---------- */
  function start(level){
    stopTimer();
    S.level=level||1;
    S.score=0;S.combo=0;S.round=0;S.life=3;S.speed=620;S.input=[];
    S.seq = S.level===1 ? newSeq(3+Math.floor(Math.random()*3)) : newSeq(1);
    S.round=1;
    S.msg = S.level===1 ? '第一關・節奏記憶：看清楚順序' : '第二關・節奏接龍：每對一次就加一個動作';
    showSeq();
  }
  function stopTimer(){if(timer){clearTimeout(timer);timer=null;}}

  function showSeq(){
    S.phase='show';S.input=[];S.hl=-1;fire();
    var i=0;
    (function step(){
      if(S.phase!=='show')return;
      if(i>=S.seq.length){
        S.hl=-1;S.phase='play';S.msg='換你了！依序做出動作';fire();return;
      }
      S.hl=i;
      var m=byId(S.seq[i]);
      if(m)beep(m.hz,Math.max(160,S.speed*0.5));
      fire();
      i++;
      timer=setTimeout(function(){
        S.hl=-1;fire();
        timer=setTimeout(step,Math.max(90,S.speed*0.3));
      },Math.max(160,S.speed*0.6));
    })();
  }

  /* 玩家做出一個動作。ready 為 false（還沒回到預備姿勢）時直接忽略。 */
  function doMove(id){
    if(S.phase!=='play')return {ok:false,why:'now'};
    if(!S.ready)return {ok:false,why:'ready'};
    var m=byId(id); if(!m)return {ok:false,why:'unknown'};
    S.ready=false;                       // 做完一個動作就離開預備姿勢
    var want=S.seq[S.input.length];
    S.input.push(id);
    if(id===want){
      beep(m.hz,200);
      if(S.input.length===S.seq.length)setTimeout(pass,260);
      fire();
      return {ok:true};
    }
    S.phase='judge';sfxNo();
    S.combo=0;S.life--;
    if(S.life<=0){S.phase='over';S.msg='生命用完了，遊戲結束！最高分 '+S.best;}
    else{
      S.msg='做錯了！這一輪重來（剩 '+S.life+' 條命）';
      timer=setTimeout(function(){showSeq();},1100);
    }
    fire();
    return {ok:false,why:'wrong',want:want};
  }
  /* 回到預備姿勢（雙手放下／頭轉正） */
  function setReady(v){
    var b=!!v;
    if(b!==S.ready){S.ready=b;fire();}
  }

  function pass(){
    S.phase='judge';
    var add=10*S.seq.length + S.combo*5;
    S.score+=add;S.combo++;
    if(S.score>S.best)S.best=S.score;
    sfxOK();
    if(S.level===1){
      S.round++;
      if(S.round>3){
        S.msg='第一關通過！進入第二關・節奏接龍';
        S.level=2;S.seq=newSeq(1);S.round=1;S.speed=Math.max(260,S.speed-60);
      }else{
        S.msg='答對了！＋'+add+' 分，下一輪';
        S.seq=newSeq(3+Math.floor(Math.random()*3));
        S.speed=Math.max(260,S.speed-50);
      }
    }else{
      S.round++;
      S.msg='答對了！＋'+add+' 分，節奏再加一個動作';
      S.seq=S.seq.concat([randMove()]);
      S.speed=Math.max(220,S.speed-30);
      if(S.seq.length>=10){S.phase='over';S.msg='太厲害了！接到 10 個動作，挑戰成功！';fire();return;}
    }
    fire();
    timer=setTimeout(function(){showSeq();},900);
  }

  function reset(){
    stopTimer();
    S.level=1;S.seq=[];S.input=[];S.phase='idle';S.score=0;S.combo=0;S.round=0;
    S.ready=true;S.speed=620;S.life=3;S.msg='按「開始」進入第一關';
    fire();
  }
  function highlight(){return S.hl;}

  return {moves:moves, start:start, doMove:doMove, setReady:setReady,
          reset:reset, on:on, state:snap, highlight:highlight, beep:beep};
})();
