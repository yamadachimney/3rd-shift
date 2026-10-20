
/* ---------- シート（下から出る画面） ---------- */
function layer(content){
  const sc=h('div',{class:'scrim',onclick:e=>{if(e.target===sc)closeSheet()}},[content]);
  $('layer').replaceChildren(sc);
}
function closeSheet(){$('layer').replaceChildren()}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});

/* ---------- メニュー ---------- */
function openMenu(){
  const it=(m,t,s)=>h('button',{class:'mitem'+(S.mode===m?' on':''),onclick:()=>{S.mode=m;lsSet('rd-mode',m);closeSheet();resub();render()}},[h('b',{text:t}),h('span',{text:s})]);
  const kids=[h('h3',{text:'メニュー'}),h('div',{class:'menu'},[
    it('shift','シフト','希望を出す・決まったシフトを見る'),
    it('supply','備品リクエスト','足りないもの・壊れたものを伝える'),
    S.isAdmin?h('button',{class:'mitem',onclick:async()=>{closeSheet();await adminLogout();toast('オーナーモードを終了しました')}},[h('b',{text:'オーナーモードを終了'}),h('span',{text:'いまオーナーモードです'})])
      :h('button',{class:'mitem',onclick:()=>{closeSheet();openAdminLogin()}},[h('b',{text:'オーナーログイン'}),h('span',{text:'シフトを組む・スタッフを承認する'})])]),
    S.sid&&!S.isAdmin?h('p',{class:'note',text:'このスマホは「'+nameOf(S.sid)+'」として登録されています。'}):null,
    h('div',{class:'row',style:'justify-content:flex-end'},[h('button',{class:'btn',onclick:closeSheet,text:'閉じる'})])];
  layer(h('div',{class:'sheet'},kids));
}

/* ---------- 備品リクエスト ---------- */
const SUPST={new:'新しい',seen:'確認した',ordered:'注文済み',done:'届いた'};
const SUPNEXT={new:'seen',seen:'ordered',ordered:'done'};
function supplyView(){
  const arr=Object.keys(S.sup||{}).map(id=>Object.assign({id:id},S.sup[id]));
  const ordS={new:0,seen:1,ordered:2,done:3};
  const vis=arr.filter(x=>S.showDone||x.status!=='done').sort((a,b)=>(ordS[a.status]-ordS[b.status])||((b.createdAt||0)-(a.createdAt||0)));
  const nDone=arr.filter(x=>x.status==='done').length;
  const kids=[h('div',{class:'mhead'},[h('h2',{text:'備品リクエスト'}),h('button',{class:'btn primary',onclick:openSupForm,text:'＋ リクエストする'})]),
    h('p',{class:'note',text:'足りないもの・壊れたものを書いておくと、オーナーが確認して注文します。同じものがもう出ていないか先に見てね。'})];
  if(!vis.length)kids.push(h('div',{class:'empty-hint',text:'いまはリクエストがありません'}));
  else kids.push(h('div',{class:'list'},vis.map(x=>{
    const mine=x.uid===S.uid,acts=[];
    if(S.isAdmin&&SUPNEXT[x.status])acts.push(h('button',{class:'btn sm primary',onclick:()=>{const up={};up['supplies/'+x.id+'/status']=SUPNEXT[x.status];put(up)},text:'→ '+SUPST[SUPNEXT[x.status]]}));
    if(S.isAdmin&&x.status!=='new')acts.push(h('button',{class:'btn sm',onclick:()=>{const back={seen:'new',ordered:'seen',done:'ordered'}[x.status];const up={};up['supplies/'+x.id+'/status']=back;put(up)},'aria-label':'ひとつ戻す',text:'↩'}));
    if(S.isAdmin||(mine&&x.status==='new')){const a=S.arm==='sup'+x.id;acts.push(h('button',{class:'btn sm danger',onclick:()=>{if(!a){S.arm='sup'+x.id;render();return}S.arm='';const up={};up['supplies/'+x.id]=null;put(up,'消しました')},text:a?'消す？':'消す'}))}
    return h('div',{class:'li sup '+x.status},[h('span',{class:'chip sup-'+x.status,text:SUPST[x.status]||''}),
      h('div',{style:'min-width:0'},[h('div',{class:'nm',text:x.item||''}),x.note?h('div',{class:'snote',text:x.note}):null,
        h('div',{class:'meta',text:[x.who,x.createdAt?new Date(x.createdAt).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'}):''].filter(Boolean).join('　')+(mine?'　（自分）':'')})]),
      h('div',{class:'acts'},acts)]);
  })));
  if(nDone)kids.push(h('div',{class:'row'},[h('button',{class:'btn sm',onclick:()=>{S.showDone=!S.showDone;render()},text:S.showDone?'届いたものを隠す':'届いたものも見る（'+nDone+'）'}),
    S.isAdmin?h('button',{class:'btn sm danger',onclick:()=>{if(S.arm!=='supclr'){S.arm='supclr';render();return}S.arm='';const up={};arr.filter(x=>x.status==='done').forEach(x=>{up['supplies/'+x.id]=null});put(up,'片付けました')},text:S.arm==='supclr'?'もう一度押すと消す':'届いたものを片付ける'}):null]));
  return h('div',{class:'col'},kids);
}
function openSupForm(){
  const item=h('input',{type:'text',maxlength:'60',placeholder:'例：ライム、コースター'});
  const note=h('textarea',{class:'ta',rows:'3',maxlength:'300',placeholder:'理由・詳しく（例：あと2個しかない）'});
  const err=h('div',{class:'err',role:'alert'});
  const who=S.isAdmin?'オーナー':nameOf(S.sid);
  const go=h('button',{class:'btn primary',text:'リクエストする',onclick:async()=>{
    if(!item.value.trim()){err.textContent='何がほしいか書いてください';item.focus();return}
    const id=newKey('supplies'),up={};
    up['supplies/'+id]={uid:S.isAdmin?FBX.adminAuth.currentUser.uid:S.uid,item:item.value.trim(),note:note.value.trim(),who:who,status:'new',createdAt:firebase.database.ServerValue.TIMESTAMP};
    go.disabled=true;if(await put(up,'リクエストしました'))closeSheet();else go.disabled=false;
  }});
  layer(h('div',{class:'sheet',role:'dialog','aria-modal':'true'},[h('h3',{text:'備品リクエスト'}),
    h('div',{class:'field'},[h('label',{text:'ほしいもの・壊れたもの'}),item]),
    h('div',{class:'field'},[h('label',{text:'詳しく'}),note]),
    h('p',{class:'note',text:'名前は「'+who+'」で出ます。'}),err,
    h('div',{class:'row',style:'justify-content:flex-end'},[h('button',{class:'btn',onclick:closeSheet,text:'キャンセル'}),go])]));
  item.focus();
}

/* ---------- 描画 ---------- */
function tabs(list){
  return h('div',{class:'tabs',role:'tablist'},list.map(t=>h('button',{role:'tab','aria-selected':S.tab===t[0]?'true':'false',onclick:()=>{S.tab=t[0];S.arm='';render();window.scrollTo(0,0)}},[t[1],t[2]?h('span',{class:'badge',text:String(t[2])}):null])));
}
function render(){
  const top=h('header',{class:'top'},[h('div',{class:'brand'},[h('h1',{text:'3RD'}),h('span',{text:'シフト'})]),
    h('div',{class:'row'},[S.isAdmin?h('span',{class:'chip owner',text:'オーナー'}):(S.sid?h('span',{class:'chip me',text:nameOf(S.sid)}):null),
      h('button',{class:'btn menubtn',onclick:openMenu,'aria-label':'メニュー'},[h('span',{text:'☰'}),'メニュー'])])]);
  const body=[];
  if(S.fail)body.push(h('div',{class:'card alert'},[h('h2',{text:'うまく開けませんでした'}),h('p',{text:S.fail})]));
  else if(!S.uid||(S.loading&&!S.isAdmin&&!S.sid&&!Object.keys(S.staff).length))body.push(h('div',{class:'empty-hint',text:'読み込み中…'}));
  else if(!S.isAdmin&&!S.sid)body.push(joinView());
  else if(S.mode==='supply')body.push(supplyView());
  else if(S.isAdmin){
    if(['build','shift','set'].indexOf(S.tab)<0)S.tab='build';
    const nj=Object.keys(S.joins||{}).filter(u=>S.staff[S.joins[u].sid]).length;
    body.push(tabs([['build','組む'],['shift','スタッフの見え方'],['set','設定',nj]]));
    if(nj&&S.tab!=='set')body.push(h('button',{class:'banner',onclick:()=>{S.tab='set';render()}},[h('b',{text:'承認待ちが'+nj+'人います'}),h('span',{text:'設定で承認 →'})]));
    body.push(S.tab==='build'?buildView():S.tab==='set'?setView():shiftView());
  }else{
    if(['shift','wish'].indexOf(S.tab)<0)S.tab='shift';
    const p=per(),needWish=p&&p.phase==='request'&&!wishOf(S.sid);
    body.push(tabs([['shift','シフト'],['wish','希望を出す',needWish?'未':0]]));
    body.push(S.tab==='wish'?wishView():shiftView());
  }
  $('app').replaceChildren(top,h('main',{class:'col'},body));
}

/* ---------- 起動 ---------- */
function boot(){
  S.mode=lsGet('rd-mode')==='supply'?'supply':'shift';
  if(!fbInit()){render();return}
  render();
  let adminKnown=false;
  FBX.adminAuth.onAuthStateChanged(u=>{
    const a=!!u&&u.email===ADMIN_EMAIL;
    if(a!==S.isAdmin||!adminKnown){adminKnown=true;S.isAdmin=a;S.periods={};S.wishes={};S.shifts={};S.draft=null;
      if(a)S.tab='build';else if(S.tab==='build'||S.tab==='set')S.tab='shift';
      resetSubs()}
  });
  FBX.auth.onAuthStateChanged(async u=>{
    if(u){if(S.uid!==u.uid){S.uid=u.uid;resetSubs()}return}
    try{await FBX.auth.signInAnonymously()}catch(e){S.fail='ログインできませんでした。電波を確認して開き直してください';render()}
  });
}
window.addEventListener('DOMContentLoaded',boot);
})();
