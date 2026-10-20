# 3RD シフト 引き継ぎメモ

バー「3RD」のシフト希望・シフト表サイト（＋備品リクエスト）の現状まとめ。
作り方は「北見軽音予約」（yamadachimney/kitami-keion-yoyaku）と同じ。
**暗証番号（オーナーのパスワード）はここには書きません。**

---

## 1. どこに何があるか

| もの | 場所 |
|---|---|
| 本番サイト | https://yamadachimney.github.io/3rd-shift/ |
| LINE固定用URL | https://yamadachimney.github.io/3rd-shift/?openExternalBrowser=1&v=1 （画像を変えたら `v=` を上げる） |
| テスト版 | https://yamadachimney.github.io/3rd-shift/beta/ （本番と同じDB） |
| GitHub | `yamadachimney/3rd-shift`（main → GitHub Pages、ルート配信） |
| Firebase | プロジェクト `rd-shift`（表示名 3rd-shift、Sparkプラン＝無料） |
| Realtime Database | `https://rd-shift-default-rtdb.asia-southeast1.firebasedatabase.app`（シンガポール） |
| 認証 | 匿名ログイン（スタッフ、スマホごと）＋ メール/パスワード（オーナー共通アカウント） |
| オーナーアカウント | `owner@rd-shift.example`（実在しないアドレス）。**パスワード＝サイトの暗証番号**（6文字以上） |

- Firebase コンソールの操作（ルールの貼り付け、ユーザー追加）と GitHub Pages の設定はユーザーにやってもらう。
- 新しい Firebase の画面では、Authentication は左の「セキュリティ」、Realtime Database は「Database と Storage」の中。

## 2. 仕組み

- 1ファイルの静的サイト（`index.html`）＋ PWA（`manifest.webmanifest`, `sw.js`, `icons/`）
- Firebase JS SDK compat 10.12.2。設定は `firebase-config.js`
- **スタッフの登録**：最初に名前を選ぶ → `joins/<uid>` に申請 → オーナーが承認すると `members/<uid> = スタッフID`。
  承認されたスマホだけがシフトを読める。機種変更したら新しいスマホから申請し直す（古いのは設定で解除）
- 時間は「営業日の0時からの分」。日をまたぐと1440以上（翌2:00＝1560）。**ラスト＝9999**。営業日は朝6時で切り替え
- 選べる時間は 17:00〜翌6:00（30分刻み）。ルールもこの範囲（1020〜1800 か 9999）
- 書き込みは複数パス同時更新（update）。同じ update で親と子を両方書かない

### 期間の流れ

準備中（closed、オーナーだけ見える）→ 希望募集中（request、スタッフが出せる）→ 組み中（making、受付終了）→ 確定（fixed、全員に公開）

### データの形

```
staff/<sid>        {name, ord, off?}               ※ off=true は「表示しない」（辞めた人）
joins/<uid>        {sid, at, dev}                  ※ 承認待ち
members/<uid>      = <sid>
periods/<pid>      {start, end, phase, open(分), need(1日の人数), deadline?, name?}
wishes/<pid>/<sid> {days/<YYYY-MM-DD> {k: ok|mb|ng, s?, e?}, note, at}   ※ ok=○ mb=△ ng=×
shifts/<pid>/<YYYY-MM-DD>/<sid> {s, e}
supplies/<id>      {uid, item, note, who, status: new|seen|ordered|done, createdAt}
```

### ルール（`database.rules.json`）

- `dev/make_rules.py` で作っている（直接いじらず、こっちを直して `python3 dev/make_rules.py`）
- スタッフの名前：ログインしていれば読める（名前を選ぶため）
- 期間・備品：承認済みのスマホとオーナーだけ
- 希望：本人とオーナーだけ読める。本人は「希望募集中」のときだけ書ける
- シフト：オーナーは常に、スタッフは「確定」のときだけ読める。書けるのはオーナーだけ
- **ルールを変えたら Firebase コンソール → Realtime Database →「ルール」に貼り直して「公開」**

## 3. 機能

**スタッフ**
- シフト：決まったシフト表（日付×スタッフ）、自分のシフト一覧、カレンダー追加（.ics、1時間前通知）、今日の出勤、LINE用コピー
- 希望を出す：日ごとに ○ / △ / × と時間（はじまり〜終わり、ラストも可）。「残りを全部○」などのまとめ入力、ひとこと
- 備品リクエスト（メニューから）

**オーナー**（メニュー →「オーナーログイン」）
- 組む：受付の開始・締め切り・確定、提出状況とひとこと、表のマスを押して入れる/外す、「○の希望をそのまま入れる」、人数が足りない日は赤
- 設定：承認待ち、スタッフ（追加・並べ替え・名前変更・表示しない・スマホ解除）、期間（来月まるごと/前半/後半のボタン、締め切り、必要人数、いつもの入り時間）

## 4. 直し方・出し方

ソースは `dev/src/`。`index.html` は組み立てた結果なので直接いじらない。

```
python3 dev/build.py          # 本番用 index.html
python3 dev/build.py beta     # テスト版 beta/index.html
node --check dev/built_check.js
node dev/test/rules_test.js   # ルールのテスト
python3 dev/test/make_preview.py  # 偽のDBで動く確認用ページ dev/test/preview.html（?uid=xxx で別のスマホのふり）
```

- 組み立て順：a1（共通）→ a2（Firebase）→ a3（スタッフの画面）→ a4（オーナーの画面）→ a5（メニュー・備品・描画・起動）
- 確認用ページのオーナー暗証番号は `testpin`（偽物の中だけ）
- 本番に出すとき：`sw.js` の `VERSION` を1つ上げる → main に push
- 新機能はまず `beta/` に出して、OKをもらってから本番へ

## 5. 制限・注意

- 無料プラン：同時接続100、Cloud Functions なし（LINEへの自動通知は不可。受付開始・確定は「LINE用にコピー」で手動で知らせる）
- 画面を閉じて60秒で接続を切る
- サイトのコードは公開（Public）だが、データはルールで守っている

## 6. 進め方の好み（ユーザー）

- 見やすさ・わかりやすさが最優先。カジュアルな口調
- 使い方の画像（スライド）は「！」を使わない
- 大きな変更は話がまとまるまで変えない → テスト版で確認 →「反映して」で本番へ
- 暗証番号・パスワードはチャットに書かない／書かせない
