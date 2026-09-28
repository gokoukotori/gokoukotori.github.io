# ポートフォリオサイト

## ディレクトリ構成

`site/` にブラウザー向けのファイルを集約しています。プロジェクトのルートは、起動・ビルド設定とサーバー・運用・テストの入口です。

```text
site/
├─ index.html                # / の入口
├─ gallery/index.html        # /gallery/ の入口
├─ avatars/index.html        # /avatars/ の入口
├─ cms/index.html            # /cms/ の入口（ローカル管理用）
├─ src/
│  ├─ pages/
│  │  ├─ home/               # Home画面と起動処理
│  │  ├─ gallery/            # Gallery画面と起動処理
│  │  ├─ avatars/            # Avatars画面と起動処理
│  │  └─ admin/              # CMS管理画面と起動処理
│  ├─ components/            # 共通の画面部品
│  ├─ lib/                   # 表示用データ・画像URL・ナビゲーション
│  ├─ data/                  # 公開コンテンツJSON・既存写真の台帳
│  └─ app.css                # 公開サイトの共通CSS
└─ public/                   # 公開用アイコン・画像
cms/
├─ server/                   # CMSの起動・API・保存・R2処理
├─ shared/                   # 管理画面・サーバー・ビルド共通の検証
└─ README.md                 # CMS操作手順
scripts/gallery/             # 既存画像の運用スクリプト（Git管理対象外）
tests/                       # avatars・cms・galleryごとのテスト
```

編集するコンテンツは `site/src/data/content.json`、既存写真の台帳は `site/src/data/gallery.json` です。CMSもこの配置を読み書きします。

Viteの公開ルートは `site/` ですが、公開URLは `/`・`/gallery/`・`/avatars/` のままです。CMSのURLは `/cms/` で、管理画面・APIは公開用ビルドに含めません。

## 実行

コマンドは引き続きプロジェクトのルートで実行します。

- `npm run dev`：公開サイトの開発サーバー
- `npm run cms`：ローカルCMS（操作方法は [cms/README.md](cms/README.md)）
- `npm test`：ギャラリー処理のテスト（ローカル専用ファイルが必要）
- `npm run test:avatars`：アバター・関連ギャラリーのテスト
- `npm run test:cms`：CMSのテスト（R2は模擬ストレージ）
- `npm run gallery:validate`：既存写真の台帳・参照の検証（ローカル専用スクリプトが必要）
- `npm run build`：公開用ファイルをルートの `dist/` に生成

`tests/gallery/gallery-pipeline.test.mjs` と `tests/gallery/justified-gallery.test.mjs` は従来どおりGit管理対象外です。

## 設定・ローカルデータ・生成物

`package.json`、`vite.config.js`、`svelte.config.js`、`jsconfig.json` はルートに置きます。環境変数ファイルもルートから読み込みます。公開処理は `.github/workflows/` にあります。

`upimg/` は既存ギャラリー用画像、`.cms/` はCMSの元画像・変換画像・保存前バックアップです。どちらもGit管理対象外です。`.env.r2.local` はR2認証情報です。これらの場所は変更していません。

`dist/` は公開用ビルド、`output/` はテスト等の出力、`node_modules/` は依存パッケージです。画像・コンテンツを編集する場所ではありません。
