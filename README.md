# 言君(GenKun) バックエンド

> AI音声分析システム バックエンドAPIサーバー

NestJSベースのRESTful APIサーバーで、オーディオファイルアップロード、STT処理、AI分析、オーディオストリーミング機能を提供します。

このプロジェクトのREDMEは日本語と韓国語で提供いたします。
<br />
이 프로젝트의 README는 한국어와 일본어로 제공됩니다.

- [日本語 (Japanese)](README.md)
- [한국어 (Korean)](README.ko.md)

<br />

**📌 [プロジェクト全体を見る](https://github.com/ias-kim/genkun-platform)**

---

## 🛠 技術スタック

### コア
- **NestJS** 11.0.1 - メインフレームワーク
- **TypeScript** 5.7.3 - プログラミング言語
- **Node.js** 20.x - ランタイム

### データベース & キャッシュ
- **PostgreSQL** 15 - メインデータベース
- **TypeORM** 0.3.28 - ORM
- **Redis** 7 - メッセージキュー & キャッシュ

### メッセージキュー
- **BullMQ** 5.66.3 - 非同期タスクキュー

### AI/ML
- **OpenAI Whisper API** - STT (音声→テキスト)
- **OpenAI GPT-4** - 音声分析およびフィードバック

### DevOps
- **Docker** & **Docker Compose** - コンテナ化
- **Swagger** - APIドキュメント自動生成

---

## 🔥 主要機能

### 1. 非同期オーディオ処理
- BullMQベースのバックグラウンド処理により応答時間2秒以内
- リアルタイムでのタスク進行状況追跡

### 2. 複数STTエンジンサポート
- アダプターパターンによりOpenAI Whisper / Google STTを柔軟に切り替え可能
- 多言語サポート (ja, ko)

### 3. HTTP Rangeオーディオストリーミング
- 206 Partial Contentサポートによりブラウザのシーク機能を実現
- 大容量ファイルの効率的な転送

### 4. AIベースの音声分析
- GPT-4を活用した構造分析およびフィードバック生成
- 話し方の癖、改善推奨事項の提供

---

## 📂 プロジェクト構造

```
src/
├── analysis/          # 音声分析モジュール
│   ├── adapters/      # AI分析エンジンアダプター
│   ├── entities/
│   └── analysis.service.ts
├── stt/               # STTモジュール
│   ├── adapters/      # Whisper, Google STTアダプター
│   ├── entities/
│   └── stt.service.ts
├── session/           # セッション管理モジュール
│   ├── processors/    # BullMQプロセッサー
│   ├── entities/
│   └── session.service.ts
├── common/            # 共通モジュール
│   ├── config/        # 設定ファイル
│   ├── interfaces/    # 共通インターフェース
│   └── entities/
├── app.module.ts
└── main.ts
```

---

## 🚀 クイックスタート

### 前提条件
- Node.js 20.x 以上
- Docker & Docker Compose
- OpenAI APIキー

### インストールと実行

```bash
# 1. 依存関係のインストール
npm install

# 2. 環境変数の設定
cp .env.example .env
# .envファイルでOPENAI_API_KEY, DB設定

# 3. Dockerコンテナの起動 (PostgreSQL, Redis)
docker-compose up -d

# 4. 開発サーバーの実行
npm run start:dev
```

サーバー実行: `http://localhost:5000`

### APIドキュメント

Swagger UI: `http://localhost:5000/docs`
- ユーザー名: `root`
- パスワード: `root`

---

## 🔌 主要APIエンドポイント

### セッション管理
- `POST /session` - 新規セッション作成
- `GET /session` - セッションリスト照会
- `GET /session/:id` - セッション詳細照会
- `DELETE /session/:id` - セッション削除

### オーディオ処理
- `POST /session/:id/upload` - オーディオアップロード (非同期)
- `GET /session/:id/job-status` - タスク進行状況照会
- `GET /session/:id/audio` - オーディオストリーミング (Rangeサポート)

---

## 🏗 コアアーキテクチャ

### アダプターパターン
```
SttService (共通インターフェース)
├── OpenAI Whisper アダプター
└── Google STT アダプター
```

### 非同期処理パイプライン
```
Upload → Queue (202応答) → Background Processing
                              ├─ STT
                              ├─ Analysis
                              └─ Save
```

---

## 📝 環境変数

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=genkun_user
DB_PASSWORD=genkun_password
DB_NAME=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# AI API
OPENAI_API_KEY=your_api_key_here

# CORS
CORS_ORIGIN_LIST=http://localhost:5173
```

---

## 📊 パフォーマンス最適化

- ✅ BullMQ非同期処理により応答時間2秒以内
- ✅ HTTP Rangeリクエストにより帯域幅を節約
- ✅ TypeORMインデックス作成とクエリ最適化
- ✅ Node.jsメモリ8GB割り当て

---

## 🔐 セキュリティ

- ✅ 環境変数による機密情報管理
- ✅ Multerファイル検証 (MIMEタイプ、サイズ制限)
- ✅ CORS設定
- ✅ Swagger Basic Auth

---

## 📚 参考資料

- [NestJS公式ドキュメント](https://docs.nestjs.com/)
- [TypeORM公式ドキュメント](https://typeorm.io/)
- [BullMQ公式ドキュメント](https://docs.bullmq.io/)
- [OpenAI APIドキュメント](https://platform.openai.com/docs)

---

## 👤 開発者

**Gwankwon An**
- GitHub: [@ias-kim](https://github.com/ias-kim)

---

**📌 プロジェクト全体 (フロントエンド含む) を見る:**
https://github.com/ias-kim/genkun-platform
