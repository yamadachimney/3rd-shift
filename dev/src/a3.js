
/* ---------- はじめて開いたとき（名前を選ぶ → オーナーの承認待ち） ---------- */
function joinView(){
  const kids=[];
  const list=staffList();
  if(S.join&&S.staff[S.join.sid]){
    kids.push(h('div',{class:'card'},[h('h2',{text:nameOf(S.join.sid)+' として申請しました'}),
      h('p',{text:'オーナーが承認すると、シフトが見られるようになります。承認されたら自動で切り替わるので、このまま待っていてOKです。'}),
      h('div',{class:'row'},[h('button',{class:'btn sm',onclick:async()=>{const up={};up['joins/'+S.uid]=null;await put(up,'取り消しました')},text:'名前を選び直す'})])]));
  }else if(!list.length){
    kids.push(h('div',{class:'card'},[h('h2',{text:'まだスタッフが登録されていません'}),
      h('p',{text:'オーナーがスタッフの名前を登録すると、ここに出てきます。'})]));
  }else{
    kids.push(h('div',{class:'card'},[h('h2',{text:'あなたは誰？'}),
      h('p',{text:'自分の名前を選んでください。オーナーが承認すると使えるようになります（最初の1回だけ）。'}),
      h('div',{class:'namegrid'},list.map(x=>h('button',{class:'btn namebtn',onclick:()=>confirmJoin(x),text:x.name})))]));
  }
  kids.push(h('div',{class:'row'},[h('button',{class:'btn sm',onclick:openAdminLogin,text:'オーナーはこちら'})]));
  return h('div',{class:'col'},kids);
}
function confirmJoin(x){
  const go=h('button',{class:'btn primary',text:'この名前で申請する',onclick:async()=>{
    go.disabled=true;
    const up={};up['joins/'+S.uid]={sid:x.id,at:firebase.database.ServerValue.TIMESTAMP,dev:devName()};
    if(await put(up,'申請しました'))closeSheet();else go.disabled=false;
  }});
  layer(h('div',{class:'sheet',role:'dialog','aria-modal':'true'},[h('h3',{text:x.name+' さんで合ってる？'}),
    h('p',{class:'note',text:'このスマホを「'+x.name+'」として使います。機種変更したときは、もう一度ここから申請すればOKです。'}),
    h('div',{class:'row',style:'justify-content:flex-end'},[h('button',{class:'btn',onclick:closeSheet,text:'キャンセル'}),go])]));
}

/* ---------- 期間の切り替え ---------- */
function periodBar(){
  const p=per();
  const list=periodList().filter(x=>S.isAdmin||x.phase!=='closed');
  if(!p)return null;
  const sel=h('select',{class:'psel','aria-label':'期間',onchange:e=>setPid(e.target.value)},
    list.map(x=>h('option',{value:x.id,text:plabel(x)+'（'+PHASES[x.phase||'closed']+'）'})));
  sel.value=S.pid;
  const ph=p.phase||'closed';
  let msg='';
  if(ph==='request')msg=p.deadline?'希望の締め切り '+dl(p.deadline):'希望を受付中';
  else if(ph==='fixed')msg='シフトが決まりました';
  else if(ph==='making')msg='受付終了。オーナーが組んでいます';
  else msg=S.isAdmin?'スタッフにはまだ見えていません':'';
  return h('div',{class:'pbar'},[sel,h('span',{class:'phase '+ph,text:PHASES[ph]}),msg?h('span',{class:'pmsg',text:msg}):null]);
}

/* ---------- シフト表（日付 × スタッフ） ---------- */
function shiftTable(owner){
  const p=per(),days=datesOf(p),st=staffList(),t=bizToday();
  // 期間中にシフトか希望がある、もう表示しない人も列に出す
  Object.keys(S.staff).forEach(id=>{if(S.staff[id].off&&!st.some(x=>x.id===id)&&(days.some(d=>S.shifts[d]&&S.shifts[d][id])||(owner&&S.wishes[id])))st.push(Object.assign({id:id},S.staff[id]))});
  const head=h('tr',{},[h('th',{class:'dcol',text:''})].concat(st.map(x=>h('th',{class:x.id===S.sid?'me':'',text:x.name})),[h('th',{class:'ncol',text:'人数'})]));
  const rows=days.map(d=>{
    const dw=dowOf(d),n=shiftsOn(d).length;
    const cls=['dcol',dw===0?'sun':dw===6?'sat':'',d===t?'today':''].join(' ');
    const evs=eventsOn(d),need=needFor(d);
    const tds=[h('th',{class:cls+(evs.length?' ev':''),title:evs.map(e=>e.name).join('、')||null},[h('b',{text:md(d)}),h('span',{text:DOW[dw]}),evs.length?h('i',{class:'evmini',text:evs.map(e=>e.name).join('・')}):null])];
    st.forEach(x=>{
      const a=S.shifts[d]&&S.shifts[d][x.id],w=owner?wishDay(x.id,d):null;
      const kids=[];
      if(owner)kids.push(h('span',{class:'wm '+(w?w.k:'na'),text:w?(w.k==='ng'?'×':WK[w.k]+srng(w.s,w.e)):'–'}));
      if(a)kids.push(h('span',{class:'as',text:srng(a.s,a.e)}));
      const c=['cell',a?'on':'',x.id===S.sid?'me':'',owner&&w&&w.k==='ng'&&a?'warn':''].join(' ');
      tds.push(h('td',{class:c},[owner?h('button',{class:'cbtn',onclick:()=>openCell(d,x.id),'aria-label':dl(d)+' '+x.name},kids):h('div',{class:'cbtn'},kids)]));
    });
    tds.push(h('td',{class:'ncol'+(n<need?' short':''),text:String(n)}));
    return h('tr',{class:d===t?'today':''},tds);
  });
  return h('div',{class:'twrap'},[h('table',{class:'st'},[h('thead',{},[head]),h('tbody',{},rows)])]);
}

/* ---------- 今日の出勤 ---------- */
function todayCard(){
  const p=per(),t=bizToday();
  if(!p||!(p.start<=t&&t<=p.end))return null;
  if(!S.isAdmin&&p.phase!=='fixed')return null;
  const list=shiftsOn(t),nm=nowMin();
  const evs=eventsOn(t);
  return h('div',{class:'card today'},[h('h2',{text:'今日 '+dl(t)+' の出勤'}),evs.length?h('div',{class:'chips'},evs.map(evTag)):null,
    list.length?h('div',{class:'tlist'},list.map(x=>{
      const now=nm>=x.s&&(x.e===LAST||nm<x.e)&&nm>=openOf(p)-120;
      return h('div',{class:'trow'+(x.sid===S.sid?' me':'')},[h('b',{text:nameOf(x.sid)}),h('span',{class:'tm',text:rng(x.s,x.e)}),now?h('span',{class:'chip now',text:'いま'}):null]);
    })):h('p',{text:'今日はシフトが入っていません'})]);
}

/* ---------- 自分のシフト ---------- */
function myList(){
  const p=per();if(!p||!S.sid||p.phase!=='fixed')return null;
  const mine=datesOf(p).filter(d=>S.shifts[d]&&S.shifts[d][S.sid]).map(d=>Object.assign({d:d},S.shifts[d][S.sid]));
  const t=bizToday();
  return h('div',{class:'card'},[h('div',{class:'mhead'},[h('h2',{text:'自分のシフト（'+mine.length+'日）'}),
      mine.length?h('button',{class:'btn sm',onclick:()=>downloadIcs(mine),text:'カレンダーに入れる'}):null]),
    mine.length?h('div',{class:'mylist'},mine.map(x=>h('div',{class:'myrow'+(x.d<t?' past':x.d===t?' today':'')},[h('b',{text:dl(x.d)}),h('span',{class:'tm',text:rng(x.s,x.e)})].concat(eventsOn(x.d).map(evTag)))))
      :h('p',{text:'この期間はシフトが入っていません'})]);
}
function downloadIcs(list){
  const z=n=>String(n).padStart(2,'0');
  const at=(d,m)=>{const x=new Date(new Date(d+'T00:00:00+09:00').getTime()+m*60000);return x.getUTCFullYear()+z(x.getUTCMonth()+1)+z(x.getUTCDate())+'T'+z(x.getUTCHours())+z(x.getUTCMinutes())+'00Z'};
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//3RD//shift//JA','CALSCALE:GREGORIAN'];
  list.forEach(x=>{
    const e=x.e===LAST?29*60:x.e;
    L.push('BEGIN:VEVENT','UID:3rd-'+x.d+'-'+S.sid+'@rd-shift','DTSTAMP:'+at(bizToday(),0),'DTSTART:'+at(x.d,x.s),'DTEND:'+at(x.d,e),
      'SUMMARY:3RD シフト','DESCRIPTION:'+rng(x.s,x.e)+(x.e===LAST?'（終わりはラスト。カレンダー上は5:00にしています）':''),
      'BEGIN:VALARM','TRIGGER:-PT60M','ACTION:DISPLAY','DESCRIPTION:3RD シフト','END:VALARM','END:VEVENT');
  });
  L.push('END:VCALENDAR');
  const b=new Blob([L.join('\r\n')],{type:'text/calendar'});
  const a=h('a',{href:URL.createObjectURL(b),download:'3rd-shift.ics'});document.body.append(a);a.click();a.remove();
  toast('カレンダー用のファイルを作りました。開くと追加できます');
}

function shiftView(){
  const p=per(),kids=[];
  if(!p){kids.push(h('div',{class:'empty-hint',text:S.isAdmin?'まだ期間がありません。「設定」から作ってください':'まだシフトの期間がありません。オーナーが作るまで待ってね'}));return h('div',{class:'col'},kids)}
  kids.push(periodBar());
  const tc=todayCard();if(tc)kids.push(tc);
  if(p.phase==='fixed'||S.isAdmin){
    if(S.isAdmin&&p.phase!=='fixed')kids.push(h('p',{class:'note',text:'まだ確定していないので、スタッフにはこの表は見えていません。'}));
    const ml=myList();if(ml)kids.push(ml);
    kids.push(eventsCard());
    kids.push(h('h2',{class:'sec',text:'みんなのシフト'}));
    kids.push(shiftTable(false));
    kids.push(h('div',{class:'row'},[h('button',{class:'btn sm',onclick:copyLine,text:'LINE用にコピー'})]));
  }else{
    const w=wishOf(S.sid);
    kids.push(h('div',{class:'card'},[h('h2',{text:p.phase==='request'?'いまは希望を受付中です':'まだシフトは決まっていません'}),
      h('p',{text:p.phase==='request'?(w?'希望は出してあります（'+fmtAt(w.at)+'）。締め切りまでなら直せます。':'まだ希望を出していません。'):'オーナーが組んで確定すると、ここに出ます。'}),
      p.phase==='request'?h('div',{class:'row'},[h('button',{class:'btn primary',onclick:()=>{S.tab='wish';render()},text:w?'希望を見る・直す':'希望を出す'})]):null]));
    kids.push(eventsCard());
  }
  return h('div',{class:'col'},kids);
}
function fmtAt(ts){if(!ts)return '';const d=new Date(ts);return (d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+pad(d.getMinutes())}
function lineText(){
  const p=per(),L=['【3RD シフト】'+plabel(p)];
  datesOf(p).forEach(d=>{const a=shiftsOn(d);L.push(dl(d)+'　'+(a.length?a.map(x=>nameOf(x.sid)+' '+srng(x.s,x.e)).join('／'):'—'))});
  return L.join('\n');
}
function copyLine(){
  const t=lineText();
  const done=()=>toast('コピーしました。LINEに貼り付けできます');
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,()=>showText(t));else showText(t);
}
function showText(t){layer(h('div',{class:'sheet'},[h('h3',{text:'コピーしてね'}),h('textarea',{class:'ta',rows:'12',text:t}),h('button',{class:'btn',onclick:closeSheet,text:'閉じる'})]))}

/* ---------- 希望を出す ---------- */
function wishView(){
  const p=per(),kids=[];
  if(!p){kids.push(h('div',{class:'empty-hint',text:'まだシフトの期間がありません'}));return h('div',{class:'col'},kids)}
  kids.push(periodBar());
  const saved=wishOf(S.sid);
  if(p.phase!=='request'){
    kids.push(h('div',{class:'card'},[h('h2',{text:p.phase==='fixed'?'この期間は確定しました':p.phase==='making'?'希望の受付は締め切りました':'まだ希望の受付前です'}),
      h('p',{text:p.phase==='closed'?'オーナーが受付を始めると、ここから出せるようになります。':'変えたいときはオーナーに直接連絡してください。'})]));
    if(saved)kids.push(wishSummary(saved,p));
    return h('div',{class:'col'},kids);
  }
  if(!S.draft||S.draft.pid!==S.pid){
    S.draft={pid:S.pid,days:JSON.parse(JSON.stringify((saved&&saved.days)||{})),note:(saved&&saved.note)||''};
  }
  const D=S.draft,days=datesOf(p),def={s:openOf(p),e:LAST};
  const fillRest=k=>{days.forEach(d=>{if(!D.days[d])D.days[d]=k==='ng'?{k:'ng'}:{k:k,s:def.s,e:def.e}});render()};
  kids.push(h('div',{class:'card tight'},[
    h('p',{text:saved?'出した希望（'+fmtAt(saved.at)+'）を直せます。直したら下の「出し直す」を押してください。':'日ごとに ○（入れる）△（入れなくはない）×（入れない）を選んで、入れる時間を決めてください。'}),
    h('div',{class:'row'},[h('span',{class:'lbs',text:'まとめて：'}),
      h('button',{class:'btn sm',onclick:()=>fillRest('ok'),text:'残りを全部○'}),
      h('button',{class:'btn sm',onclick:()=>fillRest('ng'),text:'残りを全部×'}),
      h('button',{class:'btn sm',onclick:()=>{D.days={};render()},text:'全部消す'})])]));
  const list=h('div',{class:'wlist'},days.map(d=>{
    const v=D.days[d],dw=dowOf(d);
    const seg=h('div',{class:'seg ks'},['ok','mb','ng'].map(k=>h('button',{type:'button','aria-pressed':v&&v.k===k?'true':'false',class:'k-'+k,
      onclick:()=>{if(v&&v.k===k)delete D.days[d];else D.days[d]=k==='ng'?{k:'ng'}:{k:k,s:(v&&v.s!=null)?v.s:def.s,e:(v&&v.e!=null)?v.e:def.e};render()},text:WK[k]})));
    let tm=null;
    if(v&&v.k!=='ng'){
      const s=timeSel(v.s,false),e=timeSel(v.e,true);
      s.onchange=()=>{v.s=+s.value;if(v.e!==LAST&&v.e<=v.s){v.e=LAST;e.value=String(LAST)}};
      e.onchange=()=>{v.e=+e.value;if(v.e!==LAST&&v.e<=v.s){toast('終わりははじまりより後にしてね');v.e=LAST;e.value=String(LAST)}};
      tm=h('div',{class:'wtime'},[s,h('span',{text:'〜'}),e]);
    }
    return h('div',{class:'wrow'+(v?' '+v.k:'')},[h('div',{class:'wd '+(dw===0?'sun':dw===6?'sat':'')},[h('b',{text:md(d)}),h('span',{text:DOW[dw]})]),seg,tm||h('div',{class:'wtime na',text:v?'':'未回答'})].concat(eventsOn(d).length?[h('div',{class:'wev'},eventsOn(d).map(evTag))]:[]));
  }));
  if(eventsIn(p).length)kids.push(eventsCard(true));
  kids.push(list);
  const note=h('textarea',{class:'ta',rows:'3',maxlength:'300',placeholder:'例：週2くらいがいい／テスト期間は少なめで',oninput:e=>{D.note=e.target.value}});note.value=D.note;
  kids.push(h('div',{class:'field'},[h('label',{text:'オーナーへのひとこと（任意）'}),note]));
  const nNa=days.filter(d=>!D.days[d]).length;
  const go=h('button',{class:'btn primary big',text:saved?'出し直す':'希望を出す',onclick:async()=>{
    const clean={};Object.keys(D.days).forEach(d=>{if(days.indexOf(d)<0)return;const v=D.days[d];clean[d]=v.k==='ng'?{k:'ng'}:{k:v.k,s:v.s,e:v.e}});
    const up={};up['wishes/'+S.pid+'/'+S.sid]={days:Object.keys(clean).length?clean:null,note:(D.note||'').trim(),at:firebase.database.ServerValue.TIMESTAMP};
    go.disabled=true;if(await put(up,saved?'出し直しました':'希望を出しました')){S.draft=null;S.tab='shift';render()}else go.disabled=false;
  }});
  kids.push(h('div',{class:'submit'},[nNa?h('p',{class:'note',text:'未回答が'+nNa+'日あります。そのまま出してもOKです。'}):null,go]));
  return h('div',{class:'col'},kids);
}
function wishSummary(w,p){
  return h('div',{class:'card'},[h('h2',{text:'出した希望'}),
    h('div',{class:'mylist'},datesOf(p).map(d=>{const v=w.days&&w.days[d];return h('div',{class:'myrow'},[h('b',{text:dl(d)}),h('span',{class:'tm '+(v?v.k:'na'),text:wishText(v)})])})),
    w.note?h('p',{text:'ひとこと：'+w.note}):null]);
}

/* ---------- イベント（誰でも登録できる。直せるのは登録した人とオーナー） ---------- */
function canEditEvent(e){return S.isAdmin||(e&&e.uid===S.uid)}
function eventsCard(compact){
  const p=per(),list=eventsIn(p);
  const kids=[h('div',{class:'mhead'},[h('h2',{text:'イベント'+(list.length?'（'+list.length+'）':'')}),compact?null:h('button',{class:'btn sm',onclick:()=>openEvent(null),text:'＋ イベントを登録'})])];
  if(list.length)kids.push(h('div',{class:'evlist'},list.map(e=>h('button',{class:'evrow',onclick:()=>openEvent(e.id)},[
    h('span',{class:'evd',text:e.start===e.end?dl(e.start):dl(e.start)+'〜'+dl(e.end)}),
    h('span',{class:'evb'},[h('b',{text:e.name}),e.note?h('span',{text:e.note}):null,
      h('span',{class:'evm',text:[typeof e.need==='number'?'この日は'+e.need+'人':'',e.who?e.who+' が登録':''].filter(Boolean).join('　')})])]))));
  else if(!compact)kids.push(h('p',{text:'この期間のイベントはまだありません。忙しくなりそうな日を入れておくと、みんなの表に出ます。'}));
  return h('div',{class:'card tight'},kids);
}
function openEvent(id){
  const x=id?S.events[id]:null,isNew=!x,p=per(),can=isNew||canEditEvent(x);
  if(!can){
    layer(h('div',{class:'sheet'},[h('h3',{text:x.name}),h('p',{class:'note',text:(x.start===x.end?dl(x.start):dl(x.start)+'〜'+dl(x.end))+(x.who?'　'+x.who+' が登録':'')}),
      x.note?h('p',{text:x.note}):null,typeof x.need==='number'?h('p',{class:'note',text:'この日は'+x.need+'人'}):null,
      h('p',{class:'note',text:'直したいときは、登録した人かオーナーにお願いしてね。'}),
      h('div',{class:'row',style:'justify-content:flex-end'},[h('button',{class:'btn',onclick:closeSheet,text:'閉じる'})])]));
    return;
  }
  const t=bizToday(),def=p&&p.start>t?p.start:t;
  const name=h('input',{type:'text',maxlength:'30',value:x?x.name:'',placeholder:'例：ハロウィンイベント'});
  const start=h('input',{type:'date',value:x?x.start:def});
  const end=h('input',{type:'date',value:x?x.end:def});
  start.addEventListener('change',()=>{if(!end.value||end.value<start.value)end.value=start.value});
  const note=h('textarea',{class:'ta',rows:'2',maxlength:'200',placeholder:'例：仮装OK、20時から仕込み'});note.value=x&&x.note||'';
  const need=h('input',{type:'number',min:'0',max:'20',inputmode:'numeric',style:'width:5em',value:x&&typeof x.need==='number'?String(x.need):'',placeholder:'—'});
  const err=h('div',{class:'err',role:'alert'});
  const save=h('button',{class:'btn primary',text:isNew?'登録する':'保存',onclick:async()=>{
    if(!name.value.trim()){err.textContent='イベントの名前を入れてください';name.focus();return}
    if(!start.value||!end.value){err.textContent='日にちを入れてください';return}
    if(end.value<start.value){err.textContent='終わりの日がはじまりより前になっています';return}
    const o={uid:x?x.uid:(S.isAdmin?FBX.adminAuth.currentUser.uid:S.uid),name:name.value.trim(),start:start.value,end:end.value,
      who:x?(x.who||''):(S.isAdmin?'オーナー':nameOf(S.sid)),createdAt:x?x.createdAt:firebase.database.ServerValue.TIMESTAMP};
    if(note.value.trim())o.note=note.value.trim();
    if(S.isAdmin){if(need.value!==''){o.need=Math.max(0,Math.min(20,parseInt(need.value,10)||0))}}
    else if(x&&typeof x.need==='number')o.need=x.need;
    const eid=id||newKey('events'),up={};up['events/'+eid]=o;
    save.disabled=true;if(await put(up,isNew?'イベントを登録しました':'保存しました'))closeSheet();else save.disabled=false;
  }});
  const kids=[h('h3',{text:isNew?'イベントを登録':'イベント'}),
    h('div',{class:'field'},[h('label',{text:'名前'}),name]),
    h('div',{class:'two'},[h('div',{class:'field'},[h('label',{text:'はじまり'}),start]),h('div',{class:'field'},[h('label',{text:'終わり（1日だけなら同じ日）'}),end])]),
    h('div',{class:'field'},[h('label',{text:'メモ（任意）'}),note]),
    S.isAdmin?h('div',{class:'field'},[h('label',{text:'この日に必要な人数（空ならいつもどおり）'}),need]):null,
    err];
  const del=x?h('button',{class:'btn danger',text:'消す',onclick:async()=>{if(del.dataset.a!=='1'){del.dataset.a='1';del.textContent='もう一度押すと消す';return}const up={};up['events/'+id]=null;if(await put(up,'消しました'))closeSheet()}}):null;
  kids.push(h('div',{class:'row',style:'justify-content:flex-end'},[del,h('button',{class:'btn',onclick:closeSheet,text:'キャンセル'}),save]));
  layer(h('div',{class:'sheet',role:'dialog','aria-modal':'true'},kids));
  if(isNew)name.focus();
}
