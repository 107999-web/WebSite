/* ===== 共用 UI 元件：積木繪製、試一試、巢狀腳本與執行引擎 ===== */
var UI=(function(){
  var SPEED=260;   // 每塊之間的間隔（毫秒）
  var MAXLOOP=2000;

  function byId(id){
    for(var i=0;i<BLOCKS.length;i++){if(BLOCKS[i].id===id)return BLOCKS[i];}
    return null;
  }
  function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}

  /* ---------- 嵌套（把積木放進欄位）的共用狀態 ---------- */
  var filling=null;          // 正在「填空」的積木 {__b:id, args:{}}
  var builders=[];           // 所有可編輯腳本區，填空時要一起重畫
  function isNode(v){return !!(v&&typeof v==='object'&&v.__b);}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function redrawAll(){builders.forEach(function(b){b.render();});}
  function startFill(b,args){
    filling={__b:b.id,args:args||{}};
    redrawAll();
    var host=document.querySelector('.fillhost')||document.querySelector('.script');
    if(host)host.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function cancelFill(){filling=null;redrawAll();}
  function fillAccepts(kind){
    if(!filling)return false;
    var fb=byId(filling.__b); if(!fb)return false;
    return (fb.shape==='bool')?(kind==='bool'):(kind==='val');
  }
  function fillLabel(){
    if(!filling)return '';
    var fb=byId(filling.__b); if(!fb)return '';
    return fb.parts.map(function(p){
      return (p.t==='txt'||p.t==='ico')?String(p.v):
             (p.t==='num'||p.t==='str'||p.t==='drop'||p.t==='clr')?
               '('+((filling.args&&filling.args[p.k]!==undefined)?filling.args[p.k]:(p.v===undefined?'':p.v))+')':'〈 〉';
    }).join(' ').replace(/\s+/g,' ').trim();
  }

  /* ---------- 積木零件 ---------- */
  function embed(v,editable,opts){
    var ib=byId(v.__b);
    if(!ib){var q=document.createElement('span');q.textContent='?';return q;}
    v.args=v.args||{};
    var o={}; for(var k in opts)o[k]=opts[k];
    o.inSlot=true; o.placeholder=false;
    return blockEl(ib,editable,v.args,o);
  }
  function partEl(p,editable,args,opts){
    opts=opts||{};
    var nest=opts.nest, e, val;
    val=(args&&args[p.k]!==undefined)?args[p.k]:p.v;

    function bind(input){
      if(opts.bind&&args){
        input.addEventListener('input',function(){args[p.k]=input.value;});
        input.addEventListener('change',function(){args[p.k]=input.value;});
      }
      return input;
    }
    function wrapSlot(inner,kind){
      if(!nest)return inner;
      var w=document.createElement('span');
      w.className='slot';
      w.appendChild(inner);
      if(filling&&fillAccepts(kind)){
        w.classList.add('pick');
        w.title='把積木放進這個欄位';
        w.addEventListener('click',function(ev){
          ev.stopPropagation();ev.preventDefault();
          args[p.k]=clone(filling);
          filling=null;redrawAll();
        });
      }else if(isNode(val)){
        var x=document.createElement('button');
        x.type='button';x.className='popx';x.textContent='✕';
        x.title='把這塊積木從欄位取出來';x.setAttribute('aria-label','取出積木');
        x.addEventListener('click',function(ev){
          ev.stopPropagation();ev.preventDefault();
          delete args[p.k];redrawAll();
        });
        w.appendChild(x);
      }
      return w;
    }

    if(p.t==='txt'){e=document.createElement('span');e.textContent=p.v;return e;}
    if(p.t==='ico'){e=document.createElement('span');e.className='ico';e.textContent=p.v;return e;}
    if(p.t==='arg'){e=document.createElement('span');e.className='argpill';e.textContent=p.v;return e;}

    if(p.t==='num'){
      if(isNode(val)){e=embed(val,editable,opts);}
      else if(editable){
        e=document.createElement('input');e.type='number';
        e.className='nf'+(p.wide?' wide':'')+(p.narrow?' narrow':'');
        e.value=(val===undefined?'':val);e.dataset.k=p.k;e.setAttribute('aria-label',p.k);bind(e);
      }else{
        e=document.createElement('span');e.className='nf';e.textContent=(val===undefined||val===''?'　':val);
        e.style.display='inline-block';e.style.minWidth='30px';e.style.textAlign='center';
      }
      return wrapSlot(e,'val');
    }
    if(p.t==='str'){
      if(isNode(val)){e=embed(val,editable,opts);}
      else if(editable){
        e=document.createElement('input');e.type='text';
        e.className='sf'+(p.narrow?' narrow':'');
        e.value=(val===undefined?'':val);e.dataset.k=p.k;e.setAttribute('aria-label',p.k);bind(e);
      }else{
        e=document.createElement('span');e.className='sf'+(p.narrow?' narrow':'');
        e.textContent=(val===undefined||val===''?'　':val);
      }
      return wrapSlot(e,'val');
    }
    if(p.t==='drop'||p.t==='clr'){
      var cls='df'+(p.t==='clr'?' clr':'');
      if(editable){
        e=document.createElement('select');e.className=cls;e.dataset.k=p.k;
        e.setAttribute('aria-label',p.t==='clr'?'顏色':p.k);
        p.opts.forEach(function(o){
          var op=document.createElement('option');op.value=o;op.textContent=o;
          if(o===val)op.selected=true;e.appendChild(op);
        });
        bind(e);
      }else{e=document.createElement('span');e.className=cls;e.textContent=val+' ▾';}
      return e;
    }
    /* 六角形條件欄位：cond 附預設下拉選單，bool 是空欄位 */
    if(p.t==='cond'||p.t==='bool'){
      if(isNode(val)){e=embed(val,editable,opts);}
      else if(p.t==='bool'){
        e=document.createElement('span');e.className='hex empty';
      }else{
        e=document.createElement('span');e.className='hex filled';
        if(editable){
          var sel=document.createElement('select');sel.dataset.k=p.k;sel.setAttribute('aria-label','條件');
          (p.opts||['碰到邊緣','角色在右半邊','角色在上半邊','按下空白鍵']).forEach(function(o){
            var op=document.createElement('option');op.value=o;op.textContent=o;
            if(o===val)op.selected=true;sel.appendChild(op);
          });
          if(opts.bind&&args){sel.addEventListener('change',function(){args[p.k]=sel.value;});}
          e.appendChild(sel);
        }else{
          var sp=document.createElement('span');sp.textContent=val;e.appendChild(sp);
        }
      }
      return wrapSlot(e,'bool');
    }
    return null;
  }
  function fillRow(row,parts,editable,args,opts){
    parts.forEach(function(p){var e=partEl(p,editable,args,opts);if(e)row.appendChild(e);});
  }

  /* ---------- 積木外觀（stack / round / bool / hat / cap / c / c2） ---------- */
  function blockEl(b,editable,args,opts){
    opts=opts||{};
    if(b.shape==='c'||b.shape==='c2'){
      var w=document.createElement('div');
      w.className='cwrap '+b.cat+(b.tone?' '+b.tone+'tone':'')+(b.id==='forever'?' forever':'');
      var head=document.createElement('div');head.className='chead';
      fillRow(head,b.parts,editable,args,opts);w.appendChild(head);
      var body=document.createElement('div');body.className='cbody';w.appendChild(body);
      w.bodyEl=body;
      if(b.shape==='c2'){
        var mid=document.createElement('div');mid.className='cmid';
        fillRow(mid,b.parts2||[{t:'txt',v:'否則'}],editable,args,opts);w.appendChild(mid);
        var body2=document.createElement('div');body2.className='cbody';w.appendChild(body2);
        w.body2El=body2;
      }
      var foot=document.createElement('div');foot.className='cfoot';w.appendChild(foot);
      if(opts.placeholder){
        body.innerHTML='<span style="font-size:.78rem;color:var(--ink2)">（把積木放進來）</span>';
        if(w.body2El)w.body2El.innerHTML='<span style="font-size:.78rem;color:var(--ink2)">（把積木放進來）</span>';
      }
      w.headEl=head;
      return w;
    }
    var wrap=document.createElement('span');
    wrap.className='blkwrap';
    wrap.style.display='inline-flex';wrap.style.alignItems='center';wrap.style.gap='6px';
    if(b.chk&&!opts.inSlot){var c=document.createElement('span');c.className='chk';wrap.appendChild(c);}
    var d=document.createElement('span');
    d.className='sb '+b.cat+(b.tone?' '+b.tone+'tone':'')+
      (b.shape==='round'?' round':'')+(b.shape==='hat'?' hat':'')+
      (b.shape==='cap'?' cap':'')+(b.shape==='bool'?' bool':'');
    fillRow(d,b.parts,editable,args,opts);
    wrap.appendChild(d);
    wrap.headEl=d;
    return wrap;
  }
  function readArgs(root){
    var o={};
    root.querySelectorAll('[data-k]').forEach(function(el){o[el.dataset.k]=el.value;});
    return o;
  }

  /* ---------- 自訂積木（函式積木） ---------- */
  var ROOT=[], ARGS=[], DEPTH=0, MAXDEPTH=12;
  function findDef(defId,name){
    for(var i=0;i<ROOT.length;i++){
      var n=ROOT[i];
      if(n.id!==defId)continue;
      if(!name)return n;
      if((n.args||{}).NAME===name)return n;
    }
    return null;
  }

  /* ---------- 遞迴求值（嵌套積木） ---------- */
  function evalSync(v){
    if(!isNode(v))return v;
    if(v.__b==='argval')return ARGS.length?ARGS[ARGS.length-1]:'';
    var b=byId(v.__b); if(!b)return '';
    var src=v.args||{}, a={};
    for(var k in src)a[k]=evalSync(src[k]);
    return Stage.calc(b.op,a);
  }
  function evalArgs(args){
    var o={}; args=args||{};
    for(var k in args)o[k]=evalSync(args[k]);
    return o;
  }
  function truthy(v){
    if(typeof v==='boolean')return v;
    if(typeof v==='string')return Stage.cond(v);
    return !!v;
  }
  function condOf(n,k){return truthy(evalSync((n.args||{})[k]));}
  function showVal(v){
    if(v===true)return '成立 ✔';
    if(v===false)return '不成立 ✘';
    return String(v);
  }

  /* ---------- 執行引擎 ---------- */
  var stopFlag=false, running=false;
  function mark(n,on){
    if(!n._el)return;
    n._el.classList.toggle('on',on);
    if(!on&&n._badge){n._badge.textContent='';}
  }
  function badge(n,txt){
    if(!n._el)return;
    if(!n._badge){
      n._badge=document.createElement('span');n._badge.className='loopbadge';
      var h=n._el.querySelector('.chead')||n._el.querySelector('.sb');
      if(h)h.appendChild(n._badge);
    }
    n._badge.textContent=txt;
  }
  function runList(list){
    var i=0;
    function step(){
      if(stopFlag||i>=list.length)return Promise.resolve();
      var n=list[i++];
      return runNode(n).then(step);
    }
    return step();
  }
  function runNode(n){
    var b=byId(n.id);
    if(!b)return Promise.resolve();
    mark(n,true);
    var done;
    if(n.id==='repeat'){
      var k=Math.max(0,Math.round(Number(evalSync((n.args||{}).N))||0)), j=0;
      done=(function loop(){
        if(stopFlag||j>=k)return Promise.resolve();
        j++;badge(n,j+'/'+k);
        return runList(n.body||[]).then(function(){return sleep(20);}).then(loop);
      })();
    }else if(n.id==='forever'){
      var g=0;
      done=(function loop(){
        if(stopFlag||g>=MAXLOOP)return Promise.resolve();
        g++;badge(n,'第 '+g+' 圈');
        return runList(n.body||[]).then(function(){return sleep(20);}).then(loop);
      })();
    }else if(n.id==='repeatuntil'){
      var g2=0;
      done=(function loop(){
        if(stopFlag||g2>=MAXLOOP||condOf(n,'COND'))return Promise.resolve();
        g2++;badge(n,'第 '+g2+' 圈');
        return runList(n.body||[]).then(function(){return sleep(20);}).then(loop);
      })();
    }else if(n.id==='ifthen'){
      done=condOf(n,'COND')?runList(n.body||[]):Promise.resolve();
    }else if(n.id==='ifelse'){
      done=condOf(n,'COND')?runList(n.body||[]):runList(n.body2||[]);
    }else if(n.id==='waituntil'){
      var t0=Date.now();
      done=(function loop(){
        if(stopFlag||condOf(n,'COND')||Date.now()-t0>12000)return Promise.resolve();
        return sleep(90).then(loop);
      })();
    }else if(n.id==='define'||n.id==='defarg'){
      done=Promise.resolve();              // 定義本身不執行，等人呼叫
    }else if(n.id==='callmy'){
      var d1=findDef('define',(n.args||{}).NAME);
      if(!d1||DEPTH>=MAXDEPTH){done=Promise.resolve();}
      else{DEPTH++;done=runList(d1.body||[]).then(function(){DEPTH--;});}
    }else if(n.id==='callarg'){
      var d2=findDef('defarg',null);
      if(!d2||DEPTH>=MAXDEPTH){done=Promise.resolve();}
      else{
        ARGS.push(evalSync((n.args||{}).V));
        DEPTH++;
        done=runList(d2.body||[]).then(function(){ARGS.pop();DEPTH--;});
      }
    }else if(n.id==='stop'){
      stopFlag=true;done=Promise.resolve();
    }else if(b.shape==='hat'){
      done=Promise.resolve();
    }else{
      done=Stage.run(b.op,evalArgs(n.args));
    }
    return done.then(function(){
      mark(n,false);
      return sleep(SPEED);
    });
  }
  function runScript(nodes,onEnd){
    if(running)return;
    running=true;stopFlag=false;
    ROOT=nodes;ARGS=[];DEPTH=0;
    return runList(nodes).then(function(){
      running=false;
      nodes.forEach(function(n){mark(n,false);});
      if(onEnd)onEnd();
    });
  }
  function stopAll(){stopFlag=true;running=false;}
  function setSpeed(ms){SPEED=ms;}

  /* ---------- 唯讀示範腳本（可巢狀） ---------- */
  function buildNodes(steps){
    return (steps||[]).map(function(st){
      var n={id:st.id,args:st.args||{}};
      if(st.body)n.body=buildNodes(st.body);
      if(st.body2)n.body2=buildNodes(st.body2);
      return n;
    });
  }
  function renderNodes(list,host,editable){
    list.forEach(function(n){
      var b=byId(n.id); if(!b)return;
      var node=document.createElement('div');node.className='snode';
      var row=document.createElement('div');row.className='srow';
      var el=blockEl(b,false,n.args);
      row.appendChild(el);node.appendChild(row);
      n._el=el;
      if(el.bodyEl)renderNodes(n.body||[],el.bodyEl,editable);
      if(el.body2El)renderNodes(n.body2||[],el.body2El,editable);
      host.appendChild(node);
    });
  }
  function script(steps,host,label){
    var nodes=buildNodes(steps);
    var box=document.createElement('div');box.className='demo';
    var list=document.createElement('div');list.className='dlist';
    renderNodes(nodes,list,false);
    box.appendChild(list);
    var bar=document.createElement('div');bar.className='dbar runbar';
    var run=document.createElement('button');run.className='btn sm flag';run.textContent=label||'▶ 看示範';
    var stp=document.createElement('button');stp.className='btn sm stopb';stp.textContent='■ 停止';
    bar.appendChild(run);bar.appendChild(stp);box.appendChild(bar);
    run.addEventListener('click',function(){
      run.disabled=true;
      runScript(nodes,function(){run.disabled=false;});
    });
    stp.addEventListener('click',function(){stopAll();run.disabled=false;});
    host.appendChild(box);
    return nodes;
  }

  /* ---------- 可編輯的巢狀腳本區 ---------- */
  function Builder(host,emptyText){
    var self={nodes:[],insertArr:null};
    self.insertArr=self.nodes;
    var moving=null;   // {list, idx, node}
    var nest={};       // 有這個物件，partEl 才會畫出可填空的欄位
    function contains(node,arr){
      // 判斷 arr 是否在 node 的子樹裡（避免把積木搬進自己裡面）
      var stack=[node];
      while(stack.length){
        var n=stack.pop();
        if(n.body){ if(n.body===arr)return true; n.body.forEach(function(x){stack.push(x);}); }
        if(n.body2){ if(n.body2===arr)return true; n.body2.forEach(function(x){stack.push(x);}); }
      }
      return false;
    }
    function dropZone(arr,label){
      var b=document.createElement('button');
      if(moving){
        var bad=contains(moving.node,arr);
        b.className='drop move'+(bad?' bad':'');
        b.textContent=bad?'✖ 不能搬進自己裡面':'⤵ 搬到這裡';
        if(!bad){
          b.addEventListener('click',function(){
            var n=moving.node;
            moving.list.splice(moving.idx,1);
            arr.push(n);
            moving=null;self.insertArr=self.nodes;self.render();
          });
        }
        return b;
      }
      b.className='drop'+(arr===self.insertArr?' here':'');
      b.textContent=(arr===self.insertArr?'▶ 積木會加到這裡':'＋ '+(label||'加到這裡'));
      b.addEventListener('click',function(){self.insertArr=arr;self.render();});
      return b;
    }
    function tool(txt,label,fn,disabled){
      var b=document.createElement('button');
      b.className='mv';b.textContent=txt;b.setAttribute('aria-label',label);b.title=label;
      if(disabled)b.disabled=true; else b.addEventListener('click',fn);
      return b;
    }
    function draw(list,parent){
      list.forEach(function(n,idx){
        var b=byId(n.id); if(!b)return;
        var node=document.createElement('div');node.className='snode';
        var row=document.createElement('div');row.className='srow';
        n.args=n.args||{};
        var el=blockEl(b,true,n.args,{nest:nest,bind:true});
        row.appendChild(el);
        var btns=document.createElement('div');btns.className='btns';
        var isMoving=moving&&moving.node===n;
        if(isMoving)node.classList.add('moving');
        var lock=!!moving||!!filling;
        btns.appendChild(tool('▲','往上移',function(){
          var t=list[idx-1];list[idx-1]=list[idx];list[idx]=t;self.render();
        },idx===0||lock));
        btns.appendChild(tool('▼','往下移',function(){
          var t=list[idx+1];list[idx+1]=list[idx];list[idx]=t;self.render();
        },idx===list.length-1||lock));
        btns.appendChild(tool(isMoving?'✖':'✥',isMoving?'取消搬移':'搬到別的地方',function(){
          moving=isMoving?null:{list:list,idx:idx,node:n};
          self.render();
        },(lock&&!isMoving)));
        btns.appendChild(tool('✕','刪除',function(){
          list.splice(idx,1);
          if(self.insertArr===n.body||self.insertArr===n.body2)self.insertArr=self.nodes;
          self.render();
        },lock));
        row.appendChild(btns);
        node.appendChild(row);
        n._el=el;
        if(el.bodyEl){
          n.body=n.body||[];
          draw(n.body,el.bodyEl);
          if(!filling)el.bodyEl.appendChild(dropZone(n.body,'放進這裡面'));
        }
        if(el.body2El){
          n.body2=n.body2||[];
          draw(n.body2,el.body2El);
          if(!filling)el.body2El.appendChild(dropZone(n.body2,'放進「否則」裡'));
        }
        parent.appendChild(node);
      });
    }
    self.render=function(){
      host.textContent='';
      if(filling){
        var ft=document.createElement('div');ft.className='movetip fill';
        var sp=document.createElement('span');
        sp.textContent='⤵ 填空中：'+fillLabel()+'　→ 點下面任何一個發亮的欄位把它放進去。';
        var cx=document.createElement('button');cx.className='btn ghost sm';cx.textContent='✖ 取消填空';
        cx.addEventListener('click',function(){cancelFill();});
        ft.appendChild(sp);ft.appendChild(cx);
        host.appendChild(ft);
      }else if(moving){
        var tip=document.createElement('div');tip.className='movetip';
        tip.textContent='✥ 搬移中：點下面任何一個「⤵ 搬到這裡」決定新位置，或再按一次 ✖ 取消。';
        host.appendChild(tip);
      }
      if(!self.nodes.length){
        var p=document.createElement('div');p.className='none';
        p.textContent=emptyText||'還沒有積木。按積木卡上的「加入腳本」把它放進來吧！';
        host.appendChild(p);
      }
      draw(self.nodes,host);
      if(!filling)host.appendChild(dropZone(self.nodes,'加到最後面'));
    };
    self.add=function(b,args){
      var n={id:b.id,args:args||{}};
      if(b.shape==='c'||b.shape==='c2')n.body=[];
      if(b.shape==='c2')n.body2=[];
      self.insertArr.push(n);
      self.render();
    };
    self.clear=function(){self.nodes.length=0;self.insertArr=self.nodes;moving=null;filling=null;self.render();};
    self.run=function(onEnd){return runScript(self.nodes,onEnd);};
    self.stop=function(){stopAll();};
    builders.push(self);
    self.render();
    return self;
  }

  /* ---------- 可試玩的積木列 ---------- */
  function tryRow(id,host,note){
    var b=byId(id); if(!b)return;
    var row=document.createElement('div');row.className='tryrow';
    var head=document.createElement('div');head.className='head';
    head.appendChild(blockEl(b,true,null,{placeholder:true}));
    var btn=document.createElement('button');btn.className='btn sm';btn.textContent='▶ 試一試';
    var res=document.createElement('span');res.className='res';
    head.appendChild(btn);head.appendChild(res);
    row.appendChild(head);
    var p=document.createElement('p');p.className='hint';
    p.innerHTML=note||b.desc;row.appendChild(p);
    btn.addEventListener('click',function(){
      res.textContent='';
      Stage.run(b.op,readArgs(head)).then(function(v){
        if(b.shape==='bool')res.textContent=showVal(!!v);
        else if(v!==undefined&&v!==null&&b.shape==='round')res.textContent='＝ '+v;
        else if(typeof v==='string')res.textContent=v;
      });
    });
    host.appendChild(row);
  }
  function bindReadout(map){
    Stage.onChange(function(s){
      for(var k in map){
        var el=document.getElementById(map[k]);
        if(!el)continue;
        var v=s[k];
        el.textContent=(typeof v==='number')?Math.round(v):v;
      }
    });
  }
  return {byId:byId,blockEl:blockEl,readArgs:readArgs,tryRow:tryRow,script:script,
          Builder:Builder,bindReadout:bindReadout,stopAll:stopAll,setSpeed:setSpeed,
          startFill:startFill,cancelFill:cancelFill,showVal:showVal,
          isFilling:function(){return !!filling;}};
})();
