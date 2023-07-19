# SkyWay Convert Speech

## 概要

話した言葉が敬語に変換されるビデオ通話アプリです。  
SkyWay + ChatGPT + Amazon Polly の技術を用いて実現しています。  
全体的な構成についてはこちらのQiita記事をご参照ください。  
https://qiita.com/falya128/items/8ae563059b5d024188ac

なお、動作するためにはバックエンドのAPIを作成する必要があります。  
別リポジトリにてAWS CDKプロジェクトを用意しておりますので、必要に応じてご利用ください。  
https://github.com/falya128/skyway-convert-speech-cdk

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
VITE_SKYWAY_APP_ID=[SkyWayコンソールから取得したアプリケーションID]
VITE_SKYWAY_SECRET_KEY=[SkyWayコンソールから取得したシークレットキー]
VITE_FETCH_AUDIO_URL=[文字データから音声データを生成するAPIのURL]
VITE_CONVERT_TEXT_URL=[話した言葉を敬語に変換するAPIのURL]
```

### 起動

```powershell
npm run dev
```