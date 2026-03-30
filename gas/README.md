# Google Apps Script Setup

このディレクトリには、採用フォーム送信用の Google Apps Script 一式を置いています。

## 役割

- 応募者情報をスプレッドシートに追記
- 履歴書と職務経歴書を Google Drive に保存
- `index.html` からの `POST` を受けて JSON を返却

## 必要な準備

1. 応募データを保存する Google スプレッドシートを作成
2. 応募ファイルの保存先にしたい Google Drive フォルダを用意

## スクリプトプロパティ

Apps Script の `プロジェクトの設定 -> スクリプト プロパティ` に以下を設定してください。

- `SPREADSHEET_ID`
  - 保存先スプレッドシートの ID
  - 未設定でも、既定で `1vDwV2V81pUszVFx7RnbnBvApzBL8TxVh4CRTwMJsSAQ` に保存します
- `DRIVE_FOLDER_ID`
  - 応募ファイルを格納する親フォルダの ID
  - 未設定でも、既定で `1RryuJalbT2FsnaYy-PKwlrxLcHn0YJ7B` に保存します
  - 別フォルダにしたい場合だけ上書きしてください

## デプロイ手順

1. Apps Script プロジェクトを新規作成
2. [`Code.gs`](/Users/firstmbpro04/src/cpp-recruit/gas/Code.gs) の内容を貼り付け
3. [`appsscript.json`](/Users/firstmbpro04/src/cpp-recruit/gas/appsscript.json) の設定を反映
4. スクリプトプロパティを設定
5. `デプロイ -> 新しいデプロイ -> 種類を選択 -> ウェブアプリ`
6. 以下でデプロイ
   - 実行ユーザー: 自分
   - アクセスできるユーザー: 全員
7. 発行された `.../exec` URL を [`index.html`](/Users/firstmbpro04/src/cpp-recruit/index.html) の `gasUrl` に設定

## メモ

- フロントは `text/plain` で JSON を送っています
- `doPost` は将来的な互換用に `payload` フィールド経由の送信も受けられるようにしてあります
- Apps Script の実行上限があるため、極端に大きいファイルは別途制限を入れるのがおすすめです
