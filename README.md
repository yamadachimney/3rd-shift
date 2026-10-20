# 3RD シフト

バー「3RD」のシフト希望・シフト表サイトです。詳しくは [HANDOVER.md](HANDOVER.md)。

| ファイル | 中身 |
|---|---|
| `index.html` | サイト本体（`dev/src/` から `python3 dev/build.py` で作る） |
| `firebase-config.js` | Firebase の接続設定（公開して大丈夫な値） |
| `database.rules.json` | データベースのルール（Firebase コンソールの Realtime Database →「ルール」に貼る） |
| `manifest.webmanifest` / `sw.js` / `icons/` | ホーム画面に追加（アプリ化）用 |
