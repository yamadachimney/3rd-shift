
/* ---------- オーナー：シフトを組む ---------- */
function buildView(){
  const p=per(),kids=[];
  if(!p){kids.push(h('div',{class:'card'},[h('h2',{text:'まず期間を作りましょう'}),h('p',{text:'「設定」で、スタッフの名前と、シフトの期間（例：11/1〜11/15）を作ると始められます。'}),
    h('div',{class:'row'},[h('button',{class:'btn primary',onclick:()=>{S.tab='set';render()},text:'設定を開く'})])]));return h('div',{class:'col'},kids)}
  kids.push(periodBar());
  kids.push(phaseCard(p));
  kids.push(submitCard(p));
  kids.push(h('div',{class:'mhead'},[h('h2',{class:'sec',text:'シフト表'}),h('div',{class:'row'},[
    h('button',{class:'btn sm',onclick:fillFromWishes,text:'○の希望をそのまま入れる'}),
    h('button',{class:'btn sm',onclick:copyLine,text:'LINE用にコピー'})])]));
  kids.push(h('p',{class:'note',text:'マスを押すと入れる・外すができます。上の小さい字が本人の希望、色つきが入れたシフト。人数が'+needOf(p)+'人より少ない日は赤になります。'}));
  kids.push(shiftTable(true));
  const any=Object.keys(S.shifts||{}).length;
  if(any){const a=S.arm==='clr';kids.push(h('div',{class:'row'},[h('button',{class:'btn sm danger',onclick:async()=>{if(!a){S.arm='clr';render();return}S.arm='';const up={};up['shifts/'+S.pid]=null;await put(up,'全部消しました')},text:a?'もう一度押すと全部消す':'入れたシフトを全部消す'})]))}
  return h('div',{class:'col'},kids);
}
function setPhase(ph,msg){const up={};up['periods/'+S.pid+'/phase']=ph;S.arm='';put(up,msg)}
function phaseCard(p){
  const ph=p.phase||'closed',acts=[];
  const arm=k=>S.arm===k;
  const twice=(k,label,again,fn)=>h('button',{class:'btn'+(k==='fix'?' primary':''),onclick:()=>{if(!arm(k)){S.arm=k;render();return}fn()},text:arm(k)?again:label});
  let msg='';
  if(ph==='closed'){msg='スタッフにはまだ見えていません。準備ができたら受付を始めてください。';acts.push(h('button',{class:'btn primary',onclick:()=>setPhase('request','受付を始めました。LINEで知らせてあげてください'),text:'希望の受付を始める'}))}
  if(ph==='request'){msg='スタッフが希望を出せる状態です。'+(p.deadline?'締め切りは '+dl(p.deadline)+'。':'')+'締め切ったら「受付を締め切る」を押してください。';
    acts.push(h('button',{class:'btn',onclick:()=>setPhase('making','受付を締め切りました'),text:'受付を締め切る'}))}
  if(ph==='making'){msg='受付は締め切り済み。表を組んだら「確定して公開」を押すと、全員に見えるようになります。';
    acts.push(h('button',{class:'btn',onclick:()=>setPhase('request','受付を再開しました'),text:'受付を再開'}))}
  if(ph==='request'||ph==='making')acts.push(twice('fix','確定して公開','もう一度押すと公開',()=>setPhase('fixed','公開しました。LINEで知らせてあげてください')));
  if(ph==='fixed'){msg='全員にシフトが見えています。直すとすぐに反映されます。';acts.push(twice('unfix','公開をやめる（組み中に戻す）','もう一度押すと非公開',()=>setPhase('making','非公開にしました')))}
  return h('div',{class:'card tight'},[h('p',{text:msg}),h('div',{class:'row'},acts)]);
}
function submitCard(p){
  const st=staffList();
  const done=st.filter(x=>S.wishes[x.id]);
  const notes=st.filter(x=>S.wishes[x.id]&&S.wishes[x.id].note);
  return h('div',{class:'card tight'},[h('div',{class:'mhead'},[h('h2',{text:'希望の提出 '+done.length+'/'+st.length}),null]),
    h('div',{class:'chips'},st.map(x=>{const w=S.wishes[x.id];return h('span',{class:'chip '+(w?'ok':'no'),text:x.name+(w?' ✓':' 未提出')})})),
    notes.length?h('div',{class:'notes'},notes.map(x=>h('div',{},[h('b',{text:x.name+'：'}),S.wishes[x.id].note]))):null]);
}
function fillFromWishes(){
  const p=per(),up={};let n=0;
  datesOf(p).forEach(d=>staffList().forEach(x=>{const w=wishDay(x.id,d);if(w&&w.k==='ok'&&!(S.shifts[d]&&S.shifts[d][x.id])){up['shifts/'+S.pid+'/'+d+'/'+x.id]={s:w.s,e:w.e};n++}}));
  if(!n){toast('入れられる○の希望がありません（もう入っているか、まだ出ていません）');return}
  const go=h('button',{class:'btn primary',text:n+'件入れる',onclick:async()=>{go.disabled=true;if(await put(up,n+'件入れました'))closeSheet();else go.disabled=false}});
  layer(h('div',{class:'sheet'},[h('h3',{text:'○の希望をそのまま入れる'}),
    h('p',{class:'note',text:'○（入れる）を出している日に、希望どおりの時間で '+n+'件入れます。すでに入れてあるマスはそのまま。△は入れないので、必要なら手で足してください。'}),
    h('div',{class:'row',style:'justify-content:flex-end'},[h('button',{class:'btn',onclick:closeSheet,text:'キャンセル'}),go])]));
}
function openCell(d,sid){
  const p=per(),cur=S.shifts[d]&&S.shifts[d][sid],w=wishDay(sid,d);
  const base=cur||((w&&w.k!=='ng')?w:{s:openOf(p),e:LAST});
  const s=timeSel(base.s,false),e=timeSel(base.e,true);
  const err=h('div',{class:'err',role:'alert'});
  const save=h('button',{class:'btn primary',text:cur?'この時間に変える':'入れる',onclick:async()=>{
    const sv=+s.value,ev=+e.value;
    if(ev!==LAST&&ev<=sv){err.textContent='終わりははじまりより後にしてください';return}
    const up={};up['shifts/'+S.pid+'/'+d+'/'+sid]={s:sv,e:ev};
    save.disabled=true;if(await put(up,cur?'変えました':'入れました'))closeSheet();else save.disabled=false;
  }});
  const others=shiftsOn(d).filter(x=>x.sid!==sid);
  const kids=[h('h3',{text:dl(d)+'　'+nameOf(sid)}),
    h('div',{class:'wishbox '+(w?w.k:'na')},[h('span',{class:'lb',text:'本人の希望'}),h('b',{text:wishText(w)})]),
    w&&w.k==='ng'?h('p',{class:'note warnt',text:'この日は「入れない」で出ています。入れるなら本人に確認してね。'}):null,
    h('div',{class:'field'},[h('span',{class:'lb',text:'時間'}),h('div',{class:'wtime'},[s,h('span',{text:'〜'}),e])]),
    h('div',{class:'quick'},[{t:'22:00〜ラスト',s:22*60,e:LAST},{t:'21:00〜ラスト',s:21*60,e:LAST},{t:'23:00〜ラスト',s:23*60,e:LAST}].map(q=>h('button',{type:'button',class:'btn sm',onclick:()=>{s.value=String(q.s);e.value=String(q.e)},text:q.t}))),
    h('p',{class:'note',text:others.length?'この日ほかに：'+others.map(x=>nameOf(x.sid)+' '+srng(x.s,x.e)).join('、'):'この日はまだ誰も入っていません'}),
    err,
    h('div',{class:'row',style:'justify-content:flex-end'},[
      cur?h('button',{class:'btn danger',onclick:async()=>{const up={};up['shifts/'+S.pid+'/'+d+'/'+sid]=null;if(await put(up,'外しました'))closeSheet()},text:'外す'}):null,
      h('button',{class:'btn',onclick:closeSheet,text:'閉じる'}),save])];
  layer(h('div',{class:'sheet',role:'dialog','aria-modal':'true'},kids));
}

/* ---------- オーナー：設定（承認・スタッフ・期間） ---------- */
function setView(){
  const kids=[];
  // 承認待ち
  const js=Object.keys(S.joins||{}).map(u=>Object.assign({uid:u},S.joins[u])).filter(x=>S.staff[x.sid]);
  if(js.length)kids.push(h('div',{class:'card alert'},[h('h2',{text:'承認待ち（'+js.length+'）'}),
    h('p',{text:'本人のスマホかどうか確認してから承認してください。'}),
    h('div',{class:'list'},js.map(x=>h('div',{class:'li'},[h('div',{},[h('div',{class:'nm',text:nameOf(x.sid)}),h('div',{class:'meta',text:[x.dev,fmtAt(x.at)].filter(Boolean).join('　')})]),
      h('div',{class:'acts'},[h('button',{class:'btn sm primary',onclick:()=>{const up={};up['members/'+x.uid]=x.sid;up['joins/'+x.uid]=null;put(up,nameOf(x.sid)+' さんを承認しました')},text:'承認'}),
        h('button',{class:'btn sm danger',onclick:()=>{const up={};up['joins/'+x.uid]=null;put(up,'却下しました')},text:'却下'})])])))]));
  // スタッフ
  const st=staffList(true);
  const devs=sid=>Object.keys(S.members||{}).filter(u=>S.members[u]===sid);
  const nm=h('input',{type:'text',maxlength:'20',placeholder:'名前（例：なおや）'});
  const add=async()=>{const v=nm.value.trim();if(!v){nm.focus();return}
    if(st.some(x=>x.name===v)){toast('同じ名前の人がいます');return}
    const id=newKey('staff'),up={};up['staff/'+id]={name:v,ord:st.length?Math.max.apply(null,st.map(x=>x.ord||0))+1:0};if(await put(up,v+' さんを追加しました'))nm.value=''};
  nm.addEventListener('keydown',e=>{if(e.key==='Enter')add()});
  kids.push(h('div',{class:'card'},[h('h2',{text:'スタッフ（'+st.filter(x=>!x.off).length+'人）'}),
    st.length?h('div',{class:'list'},st.map((x,i)=>{const n=devs(x.id).length,a=S.arm==='un'+x.id;
      return h('div',{class:'li'+(x.off?' off':'')},[h('div',{},[h('div',{class:'nm',text:x.name+(x.off?'（表示しない）':'')}),h('div',{class:'meta',text:n?'スマホ '+n+'台 登録済み':'スマホ未登録'})]),
        h('div',{class:'acts'},[
          h('button',{class:'btn sm',disabled:i===0,onclick:()=>swapOrd(st,i,i-1),'aria-label':'上へ',text:'↑'}),
          h('button',{class:'btn sm',disabled:i===st.length-1,onclick:()=>swapOrd(st,i,i+1),'aria-label':'下へ',text:'↓'}),
          h('button',{class:'btn sm',onclick:()=>openRename(x),text:'名前'}),
          n?h('button',{class:'btn sm danger',onclick:()=>{if(!a){S.arm='un'+x.id;render();return}S.arm='';const up={};devs(x.id).forEach(u=>{up['members/'+u]=null});put(up,'スマホの登録を解除しました')},text:a?'解除する？':'スマホ解除'}):null,
          h('button',{class:'btn sm',onclick:()=>{const up={};up['staff/'+x.id+'/off']=x.off?null:true;put(up,x.off?'表示に戻しました':'表示しないようにしました')},text:x.off?'戻す':'表示しない'})])]);
    })):h('p',{text:'まだ誰もいません。下から追加してください。'}),
    h('div',{class:'row'},[nm,h('button',{class:'btn primary',onclick:add,text:'追加'})]),
    h('p',{class:'note',text:'辞めた人は「表示しない」に。スマホを変えた人は、新しいスマホから名前を選んで申請してもらえばOKです。'})]));
  // 期間
  const ps=periodList();
  kids.push(h('div',{class:'card'},[h('div',{class:'mhead'},[h('h2',{text:'シフトの期間'}),h('button',{class:'btn primary sm',onclick:()=>openPeriod(null),text:'＋ 新しい期間'})]),
    ps.length?h('div',{class:'list'},ps.map(x=>h('div',{class:'li'},[h('div',{},[h('div',{class:'nm',text:plabel(x)}),h('div',{class:'meta',text:md(x.start)+'〜'+md(x.end)+(x.deadline?'　〆'+md(x.deadline):'')})]),
      h('div',{class:'acts'},[h('span',{class:'phase '+(x.phase||'closed'),text:PHASES[x.phase||'closed']}),h('button',{class:'btn sm',onclick:()=>openPeriod(x.id),text:'編集'}),
        x.id!==S.pid?h('button',{class:'btn sm',onclick:()=>{setPid(x.id);S.tab='build';render()},text:'開く'}):null])]))):h('p',{text:'まだありません。'})]));
  kids.push(h('div',{class:'row'},[h('button',{class:'btn',onclick:async()=>{await adminLogout();toast('オーナーモードを終了しました')},text:'オーナーモードを終了'})]));
  return h('div',{class:'col'},kids);
}
function swapOrd(st,i,j){const a=st[i],b=st[j],up={};up['staff/'+a.id+'/ord']=j;up['staff/'+b.id+'/ord']=i;
  st.forEach((x,k)=>{if(k!==i&&k!==j&&x.ord!==k)up['staff/'+x.id+'/ord']=k});put(up)}
function openRename(x){
  const nm=h('input',{type:'text',maxlength:'20',value:x.name});
  const go=h('button',{class:'btn primary',text:'保存',onclick:async()=>{const v=nm.value.trim();if(!v)return;const up={};up['staff/'+x.id+'/name']=v;if(await put(up,'変えました'))closeSheet()}});
  layer(h('div',{class:'sheet'},[h('h3',{text:'名前を変える'}),nm,h('div',{class:'row',style:'justify-content:flex-end'},[h('button',{class:'btn',onclick:closeSheet,text:'キャンセル'}),go])]));nm.focus();
}
function openPeriod(id){
  const x=id?S.periods[id]:null,isNew=!x;
  const now=new Date(),y=now.getFullYear(),m=now.getMonth()+1,ny=m===12?y+1:y,nmo=m===12?1:m+1;
  const iso=(yy,mm,dd)=>yy+'-'+pad(mm)+'-'+pad(dd);
  const start=h('input',{type:'date',value:x?x.start:iso(ny,nmo,1)});
  const end=h('input',{type:'date',value:x?x.end:iso(ny,nmo,lastDay(ny,nmo))});
  const dead=h('input',{type:'date',value:x&&x.deadline?x.deadline:''});
  const name=h('input',{type:'text',maxlength:'30',value:x&&x.name?x.name:'',placeholder:'空なら「11/1〜11/30」のように表示'});
  const open=timeSel(x?openOf(x):22*60,false);
  const need=h('input',{type:'number',min:'0',max:'20',value:String(x?needOf(x):2),inputmode:'numeric',style:'width:5em'});
  const pre=(t,s,e)=>h('button',{type:'button',class:'btn sm',onclick:()=>{start.value=s;end.value=e},text:t});
  const err=h('div',{class:'err',role:'alert'});
  const save=h('button',{class:'btn primary',text:isNew?'作る':'保存',onclick:async()=>{
    if(!start.value||!end.value){err.textContent='はじまりと終わりの日を入れてください';return}
    if(end.value<start.value){err.textContent='終わりの日がはじまりより前になっています';return}
    if(datesOf({start:start.value,end:end.value}).length>=62){err.textContent='期間は2か月以内にしてください';return}
    const n=Math.max(0,Math.min(20,parseInt(need.value,10)||0));
    const o={start:start.value,end:end.value,open:+open.value,need:n,phase:x?(x.phase||'closed'):'closed'};
    if(dead.value)o.deadline=dead.value;if(name.value.trim())o.name=name.value.trim();
    const pid=id||newKey('periods'),up={};up['periods/'+pid]=o;
    save.disabled=true;if(await put(up,isNew?'期間を作りました':'保存しました')){closeSheet();if(isNew){setPid(pid);S.tab='build';render()}}else save.disabled=false;
  }});
  const kids=[h('h3',{text:isNew?'新しい期間':'期間の設定'}),
    h('div',{class:'quick'},[pre('来月まるごと',iso(ny,nmo,1),iso(ny,nmo,lastDay(ny,nmo))),pre('来月の前半',iso(ny,nmo,1),iso(ny,nmo,15)),pre('来月の後半',iso(ny,nmo,16),iso(ny,nmo,lastDay(ny,nmo))),
      m&&now.getDate()<16?pre('今月の後半',iso(y,m,16),iso(y,m,lastDay(y,m))):null]),
    h('div',{class:'two'},[h('div',{class:'field'},[h('label',{text:'はじまり'}),start]),h('div',{class:'field'},[h('label',{text:'終わり'}),end])]),
    h('div',{class:'two'},[h('div',{class:'field'},[h('label',{text:'希望の締め切り（任意）'}),dead]),h('div',{class:'field'},[h('label',{text:'1日に必要な人数'}),need])]),
    h('div',{class:'field'},[h('label',{text:'いつもの入り時間（希望のはじめの値）'}),open]),
    h('div',{class:'field'},[h('label',{text:'名前（任意）'}),name]),
    err,h('div',{class:'row',style:'justify-content:flex-end'},[h('button',{class:'btn',onclick:closeSheet,text:'キャンセル'}),save])];
  if(!isNew){
    const del=h('button',{class:'btn sm danger',text:'この期間を消す',onclick:async()=>{if(del.dataset.a!=='1'){del.dataset.a='1';del.textContent='もう一度押すと、希望もシフトも全部消えます';return}
      const up={};up['periods/'+id]=null;up['wishes/'+id]=null;up['shifts/'+id]=null;if(await put(up,'消しました')){closeSheet();S.pid='';lsSet('rd-pid','');pickPid();resub();render()}}});
    kids.push(h('div',{class:'row'},[del]));
  }
  layer(h('div',{class:'sheet',role:'dialog','aria-modal':'true'},kids));
}
function openAdminLogin(){
  const pin=h('input',{type:'password',autocomplete:'current-password',placeholder:'暗証番号'});
  const err=h('div',{class:'err',role:'alert'});
  const go=h('button',{class:'btn primary',text:'ログイン',onclick:async()=>{
    if(!pin.value){pin.focus();return}
    go.disabled=true;err.textContent='';
    const m=await adminLogin(pin.value);
    if(m){err.textContent=m;go.disabled=false;return}
    closeSheet();S.tab='build';toast('オーナーモードにしました');
  }});
  pin.addEventListener('keydown',e=>{if(e.key==='Enter')go.click()});
  layer(h('div',{class:'sheet',role:'dialog','aria-modal':'true'},[h('h3',{text:'オーナーログイン'}),
    h('p',{class:'note',text:'シフトを組む・スタッフを承認するためのモードです。'}),pin,err,
    h('div',{class:'row',style:'justify-content:flex-end'},[h('button',{class:'btn',onclick:closeSheet,text:'キャンセル'}),go])]));
  pin.focus();
}
