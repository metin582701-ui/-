# オフィスレイアウト管理システム

## 起動方法

### バックエンド(FastAPI)
```
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
```
初回起動時に `backend/data.db`(SQLite)が自動生成されます。
管理者初期パスワードは `admin1234`(設定画面で変更してください。現在は `1234` に変更済み)。

### フロントエンド(React + Vite)
```
cd frontend
npm install
npm run dev
```
http://localhost:5173 を開いてください。(`/api`, `/ws` は自動でバックエンドにプロキシされます)

### 本番用ビルド(1サービスにまとめて動作確認する場合)
```
cd frontend
npm run build   # backend/frontend_dist に出力される
cd ../backend
python -m uvicorn app.main:app --port 8000
```
http://localhost:8000 だけでフロント・バックエンドの両方にアクセスできます。

## 使い方
- 初回は `/register` で名前・パスワード・アイコン(テンプレートまたは画像アップロード)を登録します。以後は `/login` でログイン(ブラウザを閉じるとセッションが切れ、再度ログインが必要です)。
- 通常画面(`/floor/8F` または `/floor/9F`):
  - 自分の座る場所を**左クリック**するとそこに自分のアイコンが設置されます。別の場所を左クリックすると移動します。
  - 自分のアイコンを**右クリック**すると退室確認のうえアイコンが消えます。
  - 会議室・応接室・テーブルをクリックすると予約フォームが開きます(予約の仕組みは変更していません)。
  - 右上の自分のアイコン/名前から `/settings` に移動し、名前・パスワード・アイコンを変更できます。
- 管理者モード: 右上「管理者モード」からログイン(パスワード `1234`)。
  - 「+フロア追加」でフロアIDと画像を指定すると新しいフロアを追加できます(既存フロアの背景差し替えも同じフォームから)。
  - 「+会議室・テーブル追加」モードでクリックすると新規追加。
  - 「選択/ドラッグ移動」モードで:
    - ドラッグで会議室・テーブルの位置を移動
    - **ダブルクリックしたままドラッグ**でサイズ変更
    - **右クリック**で削除(確認あり)
    - クリックで選択し、右パネルで種別・名称・定員・位置・サイズを数値入力でも編集可能
  - 社員アカウント管理: 一覧表示、パスワードリセット、アカウント削除ができます。

## データモデルの変更点(旧バージョンからの移行)
以前はCAD変換Excelから座席・什器を自動抽出していましたが、個々の椅子の自動検出には限界があったため、
**固定の座席オブジェクト(Seat)は廃止**し、社員が自分のアイコンを自由な位置に設置する方式に変更しました。
- フロア背景は真静止画像(いただいたレイアウト図)を使用しています。
- 会議室・応接室・テーブル(MeetingRoom)の予約機能は従来通りです。
- 社員(Employee)は名前・パスワード・アイコン・現在の在席位置(floor_id, x, y)を持ちます。

## 公開(HTTPS化)・デプロイ
社外からもHTTPSでアクセスできるように、SSH接続可能な自前/レンタルサーバーへDockerでデプロイする構成にしています。
`Dockerfile`(アプリ本体)+ `Caddyfile`/`docker-compose.yml`(Caddyによるリバースプロキシ+Let's Encrypt自動HTTPS)を用意済みです。
背景画像・アイコン画像はすべてDB内にBase64で保存されるため、SQLiteファイル1つ(`app_data`ボリューム)だけ永続化すればOKです。

### 事前準備
1. [DuckDNS](https://www.duckdns.org/) 等で無料サブドメインを取得し、サーバーのグローバルIPに向ける(例: `office-yourname.duckdns.org`)
2. サーバーで80番・443番ポートを開放(ファイアウォール・クラウドのセキュリティグループ設定)
3. サーバーに Docker / Docker Compose をインストール

### デプロイ手順(サーバーにSSH接続した状態で実行)
```bash
git clone https://github.com/<owner>/<repo>.git
cd <repo>
cp .env.example .env
# .envを編集: DOMAIN・SECRET_KEY・INITIAL_ADMIN_PASSWORDを設定
docker compose up -d --build
```
起動後、`https://<DOMAINで設定したホスト名>/` にアクセスできます(Caddyが自動でLet's Encrypt証明書を取得・更新します)。

### 更新時
```bash
git pull
docker compose up -d --build
```

### 環境変数(.env)
- `DOMAIN`: HTTPS証明書を発行する自分のホスト名(例: DuckDNSで取得したサブドメイン)
- `SECRET_KEY`: セッション署名用の秘密鍵。ランダムな文字列に変更してください
- `INITIAL_ADMIN_PASSWORD`: 初回起動時の管理者パスワード(起動後に設定画面から変更可能)

その他、`COOKIE_SECURE`(Cookieのsecure属性)・`CORS_ORIGINS`・`DB_PATH`も環境変数で調整可能です(docker-compose利用時は通常変更不要)。

## スクリプト(参考・現在は未使用)
`scripts/excel_parser.py`, `scripts/render_preview.py` はCAD変換Excelを解析していた旧方式の名残です。
現在のアプリは背景画像アップロード方式のため参照していませんが、調査時の記録として残しています。
