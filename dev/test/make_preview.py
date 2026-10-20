# 引数 beta でテスト版から作る。本物の Firebase の代わりに rtdb-mock を使う確認用ページを作る（dev/test/preview.html）
import os,re,json
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(os.path.dirname(HERE))
import sys
BETA=len(sys.argv)>1 and sys.argv[1]=='beta'
html=open(ROOT+('/beta/index.html' if BETA else '/index.html')).read().replace('"../','"')
rules=open(ROOT+'/database.rules.json').read()
html=re.sub(r'<script src="https://www.gstatic.com/firebasejs/[^"]+"></script>\n','',html)
inj='<script>window.__RULES='+rules+';window.__USERS={"owner@rd-shift.example":{"pw":"testpin","uid":"OWNER"}};window.__ANON_UID=new URLSearchParams(location.search).get("uid")||"dev1";</script>\n<script src="rtdb-mock.js"></script>\n'
html=html.replace('<script src="firebase-config.js"></script>',inj+'<script src="../../firebase-config.js"></script>')
html=html.replace("navigator.serviceWorker.register('sw.js')","Promise.reject()").replace('href="manifest.webmanifest"','')
open(HERE+'/preview.html','w').write(html);print('preview ok')
