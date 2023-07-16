# SkyWay Convert Speech

## 概要

Skyway + ChatGPT + Amazon Polly で作成した話した言葉が敬語に変換されるビデオ通話アプリです。

https://qiita.com/falya128/items/8ae563059b5d024188ac

## 開始手順

### 各種ライブラリのインストール

```powershell
cd skyway-convert-speech
npm install
```

### 環境設定

```powershell
cp .env.example .env
```

以下の箇所を変更

```
VITE_SKYWAY_APP_ID=[SkyWay コンソールから取得したアプリケーションID]
VITE_SKYWAY_SECRET_KEY=[SkyWay コンソールから取得したシークレットキー]
VITE_FETCH_AUDIO_URL=[文字データから音声データを生成するAPIのURL]
VITE_CONVERT_TEXT_URL=[話した言葉を敬語に変換するAPIのURL]
```

### 起動

```powershell
npm run dev
```