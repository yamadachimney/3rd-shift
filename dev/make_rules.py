# database.rules.json を作る（読みやすさのためにPythonで組み立てている）
import json,os
A="auth != null && auth.token.email === 'owner@rd-shift.example'"
M="auth != null && root.child('members/'+auth.uid).exists()"
ME="root.child('members/'+auth.uid).val() === $sid"
DATE="newData.isString() && newData.val().matches(/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/)"
def s(maxlen,minlen=0): return {".validate":f"newData.isString() && newData.val().length >= {minlen} && newData.val().length <= {maxlen}"}
def num(lo,hi): return {".validate":f"newData.isNumber() && newData.val() >= {lo} && newData.val() <= {hi}"}
T={".validate":"newData.isNumber() && (newData.val() >= 1020 && newData.val() <= 1800 || newData.val() === 9999)"}
NO={".validate":False}
rules={"rules":{
  ".read":False,".write":False,
  "staff":{".read":"auth != null",".write":A,
    "$sid":{".validate":"newData.hasChildren(['name','ord'])","name":s(20,1),"ord":num(0,999),"off":{".validate":"newData.val() === true"},"$other":NO}},
  "joins":{".read":A,
    "$uid":{".read":"auth != null && auth.uid === $uid",
      ".write":f"({A}) || (auth != null && auth.uid === $uid && (!newData.exists() || root.child('staff/'+newData.child('sid').val()).exists()))",
      ".validate":"newData.hasChildren(['sid','at'])","sid":s(40,1),"at":{".validate":"newData.isNumber()"},"dev":s(40),"$other":NO}},
  "members":{".read":A,".write":A,
    "$uid":{".read":"auth != null && auth.uid === $uid",".validate":"newData.isString() && root.child('staff/'+newData.val()).exists()"}},
  "periods":{".read":f"({A}) || ({M})",".write":A,
    "$pid":{".validate":"newData.hasChildren(['start','end','phase','open','need'])",
      "start":{".validate":DATE},"end":{".validate":DATE},"deadline":{".validate":DATE},
      "phase":{".validate":"newData.val() === 'closed' || newData.val() === 'request' || newData.val() === 'making' || newData.val() === 'fixed'"},
      "open":num(1020,1800),"need":num(0,20),"name":s(30),"$other":NO}},
  "wishes":{".read":A,".write":A,
    "$pid":{
      "$sid":{".read":f"({M}) && {ME}",
        ".write":f"auth != null && {ME} && root.child('periods/'+$pid+'/phase').val() === 'request'",
        ".validate":"newData.hasChildren(['at'])","at":{".validate":"newData.isNumber()"},"note":s(300),
        "days":{"$d":{".validate":"$d.matches(/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/) && newData.hasChildren(['k']) && (newData.child('k').val() === 'ng' || newData.hasChildren(['s','e']))",
          "k":{".validate":"newData.val() === 'ok' || newData.val() === 'mb' || newData.val() === 'ng'"},"s":T,"e":T,"$other":NO}},
        "$other":NO}}},
  "shifts":{".write":A,
    "$pid":{".read":f"({A}) || (({M}) && root.child('periods/'+$pid+'/phase').val() === 'fixed')",
      "$d":{".validate":"$d.matches(/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$/)",
        "$sid":{".validate":"newData.hasChildren(['s','e'])","s":T,"e":T,"$other":NO}}}},
  "events":{".read":f"({A}) || ({M})",
    "$e":{".write":f"({A}) || (({M}) && ((!data.exists() && newData.child('uid').val() === auth.uid) || (data.exists() && data.child('uid').val() === auth.uid && (!newData.exists() || newData.child('uid').val() === auth.uid))))",
      ".validate":"newData.hasChildren(['uid','name','start','end','createdAt'])",
      "uid":s(128,1),"name":s(30,1),"start":{".validate":DATE},"end":{".validate":DATE},"note":s(200),"who":s(20),
      "createdAt":{".validate":"newData.isNumber()"},
      "need":{".validate":f"newData.isNumber() && newData.val() >= 0 && newData.val() <= 20 && (({A}) || newData.val() === data.val())"},"$other":NO}},
  "notify":{".read":A,".write":A,
    "$pid":{"$sid":{"$d":{".validate":"newData.hasChildren(['b','a'])","b":s(40),"a":s(40),"$other":NO}}}},
  "supplies":{".read":f"({A}) || ({M})",
    "$s":{".write":f"auth != null && (({A}) || (({M}) && ((!data.exists() && newData.child('uid').val() === auth.uid && newData.child('status').val() === 'new') || (data.exists() && !newData.exists() && data.child('uid').val() === auth.uid && data.child('status').val() === 'new'))))",
      ".validate":"newData.hasChildren(['uid','item','status','createdAt'])",
      "uid":s(128,1),"item":s(60,1),"note":s(300),"who":s(20),"createdAt":{".validate":"newData.isNumber()"},
      "status":{".validate":"newData.val() === 'new' || newData.val() === 'seen' || newData.val() === 'ordered' || newData.val() === 'done'"},"$other":NO}}
}}
out=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'database.rules.json')
open(out,'w').write(json.dumps(rules,ensure_ascii=False,indent=2)+'\n');print('ok',out)
