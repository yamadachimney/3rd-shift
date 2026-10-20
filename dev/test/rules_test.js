// ルールのテスト： node dev/test/rules_test.js
globalThis.__RULES=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'../../database.rules.json'),'utf8'));
globalThis.__USERS={'owner@rd-shift.example':{pw:'testpin',uid:'OWNER'}};
require('./rtdb-mock.js');
const mk=globalThis.__mkApp;
let pass=0,fail=0;
const ok=(c,m)=>{if(c){pass++}else{fail++;console.log('FAIL',m)}};
async function as(name,uid){const app=mk(name);const a=app.auth();
  if(uid==='OWNER')await a.signInWithEmailAndPassword('owner@rd-shift.example','testpin');
  else {globalThis.__ANON_UID=uid;await a.signInAnonymously();}
  return {db:app.database(),auth:{uid:uid,token:uid==='OWNER'?{email:'owner@rd-shift.example'}:{}}};}
const W=async p=>{try{await p;return true}catch(e){return false}};
const R=(u,p)=>globalThis.__canRead(p,u.auth);
const TS={'.sv':'timestamp'};
(async()=>{
  const O=await as('o','OWNER'),A=await as('a','uA'),B=await as('b','uB'),X=await as('x','uX');
  const up=(u,o)=>W(u.db.ref().update(o));
  // スタッフ登録
  ok(!await up(A,{'staff/s1':{name:'A',ord:0}}),'staff cannot add staff');
  ok(await up(O,{'staff/s1':{name:'あきら',ord:0},'staff/s2':{name:'ぶん',ord:1}}),'owner adds staff');
  ok(!await up(O,{'staff/s3':{name:'',ord:2}}),'empty name rejected');
  ok(R(X,'staff'),'anyone signed in can read names');
  ok(!R(X,'periods'),'stranger cannot read periods');
  // 申請 → 承認
  ok(await up(A,{'joins/uA':{sid:'s1',at:TS,dev:'iPhone Safari'}}),'A requests to join as s1');
  ok(!await up(A,{'joins/uB':{sid:'s1',at:TS}}),'cannot request for another device');
  ok(!await up(B,{'joins/uB':{sid:'nope',at:TS}}),'cannot request unknown staff');
  ok(!await up(A,{'members/uA':'s1'}),'cannot self-approve');
  ok(!R(A,'joins'),'staff cannot list joins');ok(R(A,'joins/uA'),'staff reads own join');
  ok(await up(O,{'members/uA':'s1','joins/uA':null}),'owner approves A');
  ok(await up(O,{'members/uB':'s2'}),'owner approves B');
  ok(R(A,'members/uA')&&!R(A,'members/uB')&&!R(A,'members'),'member reads only own link');
  ok(R(A,'periods'),'member reads periods');
  // 期間
  const per={start:'2026-11-01',end:'2026-11-15',phase:'closed',open:1320,need:2};
  ok(!await up(A,{'periods/p1':per}),'staff cannot create period');
  ok(await up(O,{'periods/p1':per}),'owner creates period');
  ok(!await up(O,{'periods/p2':Object.assign({},per,{start:'11/1'})}),'bad date rejected');
  ok(!await up(O,{'periods/p2':Object.assign({},per,{phase:'open'})}),'bad phase rejected');
  // 希望（受付前はダメ）
  const wish={days:{'2026-11-01':{k:'ok',s:1320,e:9999},'2026-11-02':{k:'ng'}},note:'週2で',at:TS};
  ok(!await up(A,{'wishes/p1/s1':wish}),'wish rejected while closed');
  ok(await up(O,{'periods/p1/phase':'request'}),'owner opens request');
  ok(await up(A,{'wishes/p1/s1':wish}),'A submits wish');
  ok(!await up(A,{'wishes/p1/s2':wish}),'A cannot submit as B');
  ok(!await up(B,{'wishes/p1/s2':{days:{'2026-11-01':{k:'ok'}},at:TS}}),'ok without times rejected');
  ok(!await up(B,{'wishes/p1/s2':{days:{'2026-11-01':{k:'ok',s:100,e:9999}},at:TS}}),'time out of range rejected');
  ok(!await up(B,{'wishes/p1/s2':{days:{'11-01':{k:'ng'}},at:TS}}),'bad date key rejected');
  ok(await up(B,{'wishes/p1/s2':{at:TS,note:''}}),'B submits empty wish');
  ok(R(A,'wishes/p1/s1')&&!R(A,'wishes/p1/s2')&&!R(A,'wishes/p1'),'staff reads only own wish');
  ok(R(O,'wishes/p1'),'owner reads all wishes');
  // シフト
  ok(!await up(A,{'shifts/p1/2026-11-01/s1':{s:1320,e:9999}}),'staff cannot write shifts');
  ok(await up(O,{'shifts/p1/2026-11-01/s1':{s:1320,e:9999},'shifts/p1/2026-11-01/s2':{s:1380,e:1560}}),'owner writes shifts');
  ok(!R(A,'shifts/p1'),'staff cannot read shifts before fixed');
  ok(await up(O,{'periods/p1/phase':'making'}),'owner closes request');
  ok(!await up(A,{'wishes/p1/s1':wish}),'wish edit rejected after close');
  ok(await up(O,{'periods/p1/phase':'fixed'}),'owner publishes');
  ok(R(A,'shifts/p1'),'staff reads shifts after fixed');
  ok(!R(X,'shifts/p1'),'stranger cannot read shifts');
  // 備品
  const sup={uid:'uA',item:'ライム',note:'',who:'あきら',status:'new',createdAt:TS};
  ok(!await up(X,{'supplies/q0':Object.assign({},sup,{uid:'uX'})}),'stranger cannot request supplies');
  ok(await up(A,{'supplies/q1':sup}),'A requests supply');
  ok(!await up(B,{'supplies/q1':null}),'B cannot delete A request');
  ok(!await up(A,{'supplies/q1/status':'done'}),'A cannot change status');
  ok(await up(O,{'supplies/q1/status':'seen'}),'owner changes status');
  ok(!await up(A,{'supplies/q1':null}),'A cannot delete after seen');
  // イベント
  const ev={uid:'uA',name:'ハロウィン',start:'2026-10-31',end:'2026-11-01',who:'あきら',createdAt:TS};
  ok(!await up(X,{'events/e0':Object.assign({},ev,{uid:'uX'})}),'stranger cannot add event');
  ok(await up(A,{'events/e1':ev}),'staff adds event');
  ok(!await up(A,{'events/e2':Object.assign({},ev,{uid:'uB'})}),'cannot add event as someone else');
  ok(!await up(A,{'events/e3':Object.assign({},ev,{need:4})}),'staff cannot set need');
  ok(await up(O,{'events/e1/need':4}),'owner sets need');
  ok(await up(A,{'events/e1':Object.assign({},ev,{name:'ハロウィン仮装',need:4,createdAt:1})}),'staff edits own event keeping need');
  ok(!await up(A,{'events/e1':Object.assign({},ev,{need:6,createdAt:1})}),'staff cannot change need');
  ok(!await up(B,{'events/e1':null}),'other staff cannot delete');
  ok(R(B,'events'),'members read events');
  ok(await up(A,{'events/e1':null}),'staff deletes own event');
  ok(await up(O,{'events/e4':Object.assign({},ev,{uid:'OWNER',who:'オーナー'})}),'owner adds event');
  ok(!await up(A,{'events/e4':null}),'staff cannot delete owner event');
  // お知らせ
  ok(await up(O,{'notify/p1/s1/2026-11-03':{b:'休み',a:'22:00〜ラスト'}}),'owner logs change');
  ok(!await up(A,{'notify/p1/s1':null}),'staff cannot touch notify');ok(!R(A,'notify/p1'),'staff cannot read notify');
  // 解除
  ok(await up(O,{'members/uA':null}),'owner unlinks A');
  ok(!R(A,'periods'),'unlinked A loses access');
  ok(await up(O,{'periods/p1':null,'wishes/p1':null,'shifts/p1':null}),'owner deletes period with data');
  console.log(pass+' ok, '+fail+' fail');process.exit(fail?1:0);
})();
