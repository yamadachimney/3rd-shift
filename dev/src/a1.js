(function(){
'use strict';
/* ---------- 3RD シフト：共通 ----------
   時間は「営業日の0時からの分」。日をまたぐと1440以上（例：翌2:00＝1560）。
   ラスト（終わり未定）は LAST。営業日は朝6時で切り替える */
const LAST=9999, DAYCUT=6;
const DOW=['日','月','火','水','木','金','土'];
const PHASES={closed:'準備中',request:'希望募集中',making:'組み中',fixed:'確定'};
const WK={ok:'○',mb:'△',ng:'×'};
const WKL={ok:'入れる',mb:'入れなくはない',ng:'入れない'};
const S={uid:'',isAdmin:false,sid:'',join:null,staff:{},periods:{},pid:'',wishes:{},shifts:{},joins:{},members:{},sup:{},
  tab:'shift',mode:'shift',loading:true,fail:'',arm:'',showDone:false,draft:null,showPast:false};

function h(tag,attrs,kids){
  const el=document.createElement(tag);
  if(attrs)for(const k in attrs){
    const v=attrs[k];
    if(v==null||v===false)continue;
    if(k==='class')el.className=v;
    else if(k==='text')el.textContent=v;
    else if(k.slice(0,2)==='on')el.addEventListener(k.slice(2),v);
    else if(k==='style')el.style.cssText=v;
    else if(v===true)el.setAttribute(k,'');
    else el.setAttribute(k,v);
  }
  (kids||[]).forEach(c=>{if(c==null||c===false)return;el.append(c.nodeType?c:document.createTextNode(c));});
  return el;
}
const $=id=>document.getElementById(id);
function pad(n){return String(n).padStart(2,'0')}
function isoOf(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function addDays(iso,n){const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function dowOf(iso){return new Date(iso+'T00:00:00Z').getUTCDay()}
function md(iso){const p=iso.split('-');return (+p[1])+'/'+(+p[2])}
function dl(iso){return md(iso)+'('+DOW[dowOf(iso)]+')'}
function bizToday(){return isoOf(new Date(Date.now()-DAYCUT*3600e3))}
function nowMin(){const d=new Date();let m=d.getHours()*60+d.getMinutes();if(d.getHours()<DAYCUT)m+=1440;return m}
function lastDay(y,m){return new Date(Date.UTC(y,m,0)).getUTCDate()}  // m: 1-12
function datesOf(p){const a=[];if(!p||!p.start||!p.end)return a;let d=p.start;while(d<=p.end&&a.length<62){a.push(d);d=addDays(d,1)}return a}
function fmt(m){if(m===LAST)return 'ラスト';const hh=Math.floor(m/60),mm=m%60;return (hh>=24?'翌'+(hh-24):hh)+':'+pad(mm)}
function sh(m){if(m===LAST)return 'L';const hh=Math.floor(m/60)%24,mm=m%60;return hh+(mm?':'+pad(mm):'')}
function rng(s,e){return fmt(s)+'〜'+fmt(e)}
function srng(s,e){return sh(s)+'〜'+sh(e)}
function parseHM(v){const m=/^(\d{1,2}):(\d{2})$/.exec(v||'');if(!m)return null;return (+m[1])*60+(+m[2])}
function toast(t){
  const b=$('toastBox');b.replaceChildren(h('div',{class:'toast',role:'status',text:t}));
  clearTimeout(toast.t);toast.t=setTimeout(()=>b.replaceChildren(),2600);
}
function lsGet(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}

/* 時間の選択肢（17:00〜翌6:00、30分刻み） */
function timeOpts(isEnd){const a=[];for(let m=17*60;m<=30*60;m+=30){if(!isEnd&&m===30*60)break;a.push(m)}if(isEnd)a.push(LAST);return a}
function timeSel(val,isEnd){
  const s=h('select',{class:'tsel','aria-label':isEnd?'終わり':'はじまり'},timeOpts(isEnd).map(m=>h('option',{value:String(m),text:fmt(m)})));
  s.value=String(val);if(s.value!==String(val))s.value=String(isEnd?LAST:22*60);
  return s;
}

/* ---------- データの見方 ---------- */
function staffList(all){return Object.keys(S.staff||{}).map(id=>Object.assign({id:id},S.staff[id])).filter(x=>all||!x.off).sort((a,b)=>(a.ord||0)-(b.ord||0)||String(a.name).localeCompare(String(b.name)))}
function nameOf(sid){return (S.staff[sid]&&S.staff[sid].name)||'（削除済み）'}
function per(){return S.periods[S.pid]||null}
function phaseOf(pid){const p=S.periods[pid];return (p&&p.phase)||'closed'}
function periodList(){return Object.keys(S.periods||{}).map(id=>Object.assign({id:id},S.periods[id])).sort((a,b)=>a.start<b.start?1:-1)}
function plabel(p){if(!p)return '';return p.name||(md(p.start)+'〜'+md(p.end))}
function openOf(p){return (p&&typeof p.open==='number')?p.open:22*60}
function needOf(p){return (p&&typeof p.need==='number')?p.need:2}
function wishOf(sid){return S.wishes[sid]||null}
function wishDay(sid,d){const w=wishOf(sid);return (w&&w.days&&w.days[d])||null}
function shiftsOn(d){const o=S.shifts[d]||{};return Object.keys(o).filter(sid=>o[sid]).map(sid=>Object.assign({sid:sid},o[sid])).sort((a,b)=>a.s-b.s||((S.staff[a.sid]||{}).ord||0)-((S.staff[b.sid]||{}).ord||0))}
function wishText(w){if(!w)return '未回答';if(w.k==='ng')return '× 入れない';return WK[w.k]+' '+rng(w.s,w.e)}
/* 表示する期間を選ぶ：今日を含む確定 → 募集中 → これから → いちばん新しい */
function pickPid(){
  const all=periodList().filter(p=>S.isAdmin||p.phase!=='closed');
  if(S.pid&&all.some(p=>p.id===S.pid))return;
  const saved=lsGet('rd-pid');if(saved&&all.some(p=>p.id===saved)){S.pid=saved;return}
  const t=bizToday();
  const f=all.find(p=>p.phase==='fixed'&&p.start<=t&&t<=p.end)||all.slice().reverse().find(p=>p.phase==='request')
    ||all.slice().reverse().find(p=>p.start>t)||all[0];
  S.pid=f?f.id:'';
}
function setPid(id){S.pid=id;lsSet('rd-pid',id);S.draft=null;S.wishes={};S.shifts={};resub();render()}
