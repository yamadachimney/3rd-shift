
/* ---------- データ（Firebase Realtime Database） ----------
   ・スタッフはスマホごとの匿名ログイン。最初に名前を選ぶと joins/<uid> に申請が入り、
     オーナーが承認すると members/<uid> = スタッフID になる（以後そのスマホはその人）
   ・オーナーは共通のオーナーアカウント（暗証番号＝そのパスワード）。権限は Firebase のルールで確認 */
const FBX={db:null,auth:null,adminAuth:null,adminDb:null};
const ADMIN_EMAIL=(window.FB_ADMIN_EMAIL||'owner@rd-shift.example');
const SUBS={};
function fbReady(){return !!FBX.db}
function fbInit(){
  if(!window.firebase||!window.FB_CONFIG||!window.FB_CONFIG.apiKey){S.fail='設定（firebase-config.js）が読み込めませんでした';return false}
  firebase.initializeApp(window.FB_CONFIG);
  FBX.db=firebase.database();FBX.auth=firebase.auth();
  const a2=firebase.initializeApp(window.FB_CONFIG,'admin');
  FBX.adminAuth=a2.auth();FBX.adminDb=a2.database();
  return true;
}
function DB(){return S.isAdmin?FBX.adminDb:FBX.db}
function newKey(p){return DB().ref(p).push().key}

/* いま必要なデータだけを受け取る（画面や立場が変わるたびに付け外し） */
function want(){
  const w={};
  w.staff=['staff',v=>{S.staff=v||{}}];
  if(S.isAdmin){
    w.joins=['joins',v=>{S.joins=v||{}}];
    w.members=['members',v=>{S.members=v||{}}];
  }else if(S.uid){
    w.me=['members/'+S.uid,v=>{S.sid=v||''}];
    w.myjoin=['joins/'+S.uid,v=>{S.join=v||null}];
  }
  if(S.isAdmin||S.sid){
    w.periods=['periods',v=>{S.periods=v||{};pickPid()}];
    if(S.pid&&S.periods[S.pid]){
      if(S.isAdmin)w.wishes=['wishes/'+S.pid,v=>{S.wishes=v||{}}];
      else w.wishes=['wishes/'+S.pid+'/'+S.sid,v=>{S.wishes=v?{[S.sid]:v}:{}}];
      if(S.isAdmin||phaseOf(S.pid)==='fixed')w.shifts=['shifts/'+S.pid,v=>{S.shifts=v||{}}];
    }
    w.events=['events',v=>{S.events=v||{}}];
    if(S.isAdmin&&S.pid&&S.periods[S.pid])w.notify=['notify/'+S.pid,v=>{S.notify=v||{}}];
    if(S.mode==='supply')w.sup=['supplies',v=>{S.sup=v||{}}];
  }
  return w;
}
function resub(){
  if(!fbReady())return;
  const w=want();
  for(const k of Object.keys(SUBS)){
    if(!w[k]||w[k][0]!==SUBS[k].path||SUBS[k].db!==DB()){SUBS[k].ref.off();delete SUBS[k];clearOf(k)}
  }
  for(const k of Object.keys(w)){
    if(SUBS[k])continue;
    const path=w[k][0],fn=w[k][1],db=DB(),ref=db.ref(path);
    const sub={path:path,ref:ref,db:db,got:false};SUBS[k]=sub;
    ref.on('value',snap=>{
      if(SUBS[k]!==sub)return;
      sub.got=true;fn(snap.val());S.fail='';
      resub();S.loading=!Object.values(SUBS).every(x=>x.got);render();
    },err=>{
      if(SUBS[k]!==sub)return;
      delete SUBS[k];clearOf(k);
      // 確定前のシフトなど、見られなくなったものは静かに外す
      resub();S.loading=!Object.values(SUBS).every(x=>x.got);render();
    });
  }
  S.loading=!Object.values(SUBS).every(x=>x.got);
}
function clearOf(k){
  if(k==='shifts')S.shifts={};else if(k==='wishes')S.wishes={};else if(k==='sup')S.sup={};else if(k==='events')S.events={};else if(k==='notify')S.notify={};
  else if(k==='periods')S.periods={};else if(k==='joins')S.joins={};else if(k==='members')S.members={};
}
function resetSubs(){for(const k of Object.keys(SUBS)){SUBS[k].ref.off();delete SUBS[k]}S.loading=true;resub();render()}

async function put(up,msg){
  try{await DB().ref().update(up);if(msg)toast(msg);return true}
  catch(e){
    const c=String(e&&(e.code||e.message)||e);
    toast(/PERMISSION/i.test(c)?'保存できませんでした（権限がないか、受付が締め切られています）':'保存できませんでした。電波を確認してください');
    return false;
  }
}

async function adminLogin(pin){
  try{await FBX.adminAuth.signInWithEmailAndPassword(ADMIN_EMAIL,String(pin));return ''}
  catch(e){
    const c=String(e&&(e.code||e.message)||'');
    return /too-many/i.test(c)?'何度も間違えたので、少し時間をおいてください'
      :/network/i.test(c)?'通信がうまくいきませんでした。もう一度押してください':'暗証番号が違います';
  }
}
async function adminLogout(){try{await FBX.adminAuth.signOut()}catch(e){}}

/* 画面を閉じて60秒たったら接続を切る（同時接続数の節約） */
let offT=null;
document.addEventListener('visibilitychange',()=>{
  if(!fbReady())return;
  if(document.hidden){offT=setTimeout(()=>{FBX.db.goOffline();FBX.adminDb.goOffline()},60000)}
  else{clearTimeout(offT);FBX.db.goOnline();FBX.adminDb.goOnline()}
});
function devName(){const u=navigator.userAgent||'';
  const os=/iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Android/.test(u)?'Android':/Mac/.test(u)?'Mac':/Windows/.test(u)?'Windows':'その他';
  const br=/Line\//.test(u)?'LINE':/CriOS|Chrome/.test(u)?'Chrome':/Safari/.test(u)?'Safari':/Firefox/.test(u)?'Firefox':'';
  return (os+' '+br).trim()}
