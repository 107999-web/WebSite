/* =========================================================
   blk.js — 把資料畫成 Scratch 積木（只負責「看」，不會執行）
   沿用 20260924_手勢辨識_數字與猜拳_Web；積木資料由 tools/export_blocks.py 從 .sb3 轉出
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
  function auto(lib){
    document.querySelectorAll('[data-blk]').forEach(function(el){
      var k=el.getAttribute('data-blk'); if(lib[k])render(el,lib[k]);
    });
  }
  return {render:render,stack:stack,auto:auto,part:part};
})();
