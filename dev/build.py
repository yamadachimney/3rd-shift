import os,sys
HERE=os.path.dirname(os.path.abspath(__file__)); SRC=os.path.join(HERE,'src'); OUT=os.path.dirname(HERE)
p1=open(SRC+'/part1.html').read()
title_end=p1.index('</title>')+len('</title>')
head_rest=p1[title_end:p1.index('<div class="app"')]   # fonts link + <style>…</style>
body=p1[p1.index('<div class="app"'):]
order=['a1.js','a2.js','a3.js','a4.js','a5.js']   # a5 に起動処理がある
js=''.join(open(SRC+'/'+f).read() for f in order)
FB='https://www.gstatic.com/firebasejs/10.12.2/'
URL='https://yamadachimney.github.io/3RD-shift/'
html=f'''<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>3RD シフト</title>
<meta name="description" content="3RD のシフト希望・シフト表">
<meta name="robots" content="noindex">
<meta property="og:type" content="website">
<meta property="og:title" content="3RD シフト">
<meta property="og:description" content="シフトの希望を出す・決まったシフトを見る">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="{URL}icons/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1b1814">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="3RD シフト">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
{head_rest.strip()}
</head>
<body>
{body.strip()}
<script src="{FB}firebase-app-compat.js"></script>
<script src="{FB}firebase-auth-compat.js"></script>
<script src="{FB}firebase-database-compat.js"></script>
<script src="firebase-config.js"></script>
<script>
{js}</script>
<script>
if('serviceWorker' in navigator){{window.addEventListener('load',()=>{{navigator.serviceWorker.register('sw.js').catch(()=>{{}})}})}}
</script>
</body>
</html>
'''
if len(sys.argv)>1 and sys.argv[1]=='beta':
    os.makedirs(OUT+'/beta',exist_ok=True)
    bh=html.replace('href="manifest.webmanifest"','href="../manifest.webmanifest"').replace('"icons/','"../icons/').replace('src="firebase-config.js"','src="../firebase-config.js"')
    bh=bh.replace("navigator.serviceWorker.register('sw.js')","Promise.reject()").replace('<title>3RD シフト</title>','<title>3RD シフト（テスト版）</title>')
    open(OUT+'/beta/index.html','w').write(bh)
    print('beta',len(bh))
else:
    open(OUT+'/index.html','w').write(html)
    print('index.html',len(html))
open(os.path.join(HERE,'built_check.js'),'w').write(js)  # node --check で文法チェック用
