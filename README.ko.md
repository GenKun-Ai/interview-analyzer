# GenKun Backend

> AI 음성 분석 시스템 백엔드 API 서버

NestJS 기반의 RESTful API 서버로, 오디오 파일 업로드, STT 처리, AI 분석, 오디오 스트리밍 기능을 제공합니다.

このプロジェクトのREDMEは日本語と韓国語で提供いたします。
<br />
이 프로젝트의 README는 한국어와 일본어로 제공됩니다.

- [日本語 (Japanese)](README.md)
- [한국어 (Korean)](README.ko.md)

<br />

**📌 [전체 프로젝트 보기](https://github.com/ias-kim/genkun-platform)**

---

## 🛠 기술 스택

### Core
- **NestJS** 11.0.1 - 메인 프레임워크
- **TypeScript** 5.7.3 - 프로그래밍 언어
- **Node.js** 20.x - 런타임

### Database & Cache
- **PostgreSQL** 15 - 메인 데이터베이스
- **TypeORM** 0.3.28 - ORM
- **Redis** 7 - 메시지 큐 & 캐시

### Message Queue
- **BullMQ** 5.66.3 - 비동기 작업 큐

### AI/ML
- **OpenAI Whisper API** - STT (음성→텍스트)
- **OpenAI GPT-4** - 음성 분석 및 피드백

### DevOps
- **Docker** & **Docker Compose** - 컨테이너화
- **Swagger** - API 문서 자동 생성

---

## 🔥 주요 기능

### 1. 비동기 오디오 처리
- BullMQ 기반 백그라운드 처리로 응답 시간 2초 이내
- 실시간 작업 진행 상황 추적

### 2. 다중 STT 엔진 지원
- Adapter Pattern으로 OpenAI Whisper / Google STT 유연하게 전환
- 다중 언어 지원 (ja, ko)

### 3. HTTP Range 오디오 스트리밍
- 206 Partial Content 지원으로 브라우저 seek 기능 구현
- 대용량 파일 효율적 전송

### 4. AI 기반 음성 분석
- GPT-4를 활용한 구조적 분석 및 피드백 생성
- 말하기 습관, 개선 추천사항 제공

---

## 📂 프로젝트 구조

```
src/
├── analysis/          # 음성 분석 모듈
│   ├── adapters/      # AI 분석 엔진 어댑터
│   ├── entities/
│   └── analysis.service.ts
├── stt/               # STT 모듈
│   ├── adapters/      # Whisper, Google STT 어댑터
│   ├── entities/
│   └── stt.service.ts
├── session/           # 세션 관리 모듈
│   ├── processors/    # BullMQ 프로세서
│   ├── entities/
│   └── session.service.ts
├── common/            # 공통 모듈
│   ├── config/        # 설정 파일
│   ├── interfaces/    # 공통 인터페이스
│   └── entities/
├── app.module.ts
└── main.ts
```

---

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 20.x 이상
- Docker & Docker Compose
- OpenAI API Key

### 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일에서 OPENAI_API_KEY, DB 설정

# 3. Docker 컨테이너 시작 (PostgreSQL, Redis)
docker-compose up -d

# 4. 개발 서버 실행
npm run start:dev
```

서버 실행: `http://localhost:5000`

### API 문서

Swagger UI: `http://localhost:5000/docs`
- Username: `root`
- Password: `root`

---

## 🔌 주요 API 엔드포인트

### 세션 관리
- `POST /session` - 새 세션 생성
- `GET /session` - 세션 목록 조회
- `GET /session/:id` - 세션 상세 조회
- `DELETE /session/:id` - 세션 삭제

### 오디오 처리
- `POST /session/:id/upload` - 오디오 업로드 (비동기)
- `GET /session/:id/job-status` - 작업 진행 상황 조회
- `GET /session/:id/audio` - 오디오 스트리밍 (Range 지원)

---

## 🏗 핵심 아키텍처

### Adapter Pattern
```
SttService (공통 인터페이스)
├── OpenAI Whisper Adapter
└── Google STT Adapter
```

### 비동기 처리 파이프라인
```
Upload → Queue (202 응답) → Background Processing
                              ├─ STT
                              ├─ Analysis
                              └─ Save
```

---

## 📝 환경 변수

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

## 📊 성능 최적화

- ✅ BullMQ 비동기 처리로 응답 시간 2초 이내
- ✅ HTTP Range 요청으로 대역폭 절약
- ✅ TypeORM 인덱싱 및 쿼리 최적화
- ✅ Node.js 메모리 8GB 할당

---

## 🔐 보안

- ✅ 환경 변수로 민감 정보 관리
- ✅ Multer 파일 검증 (MIME 타입, 크기 제한)
- ✅ CORS 설정
- ✅ Swagger Basic Auth

---

## 📚 참고 자료

- [NestJS 공식 문서](https://docs.nestjs.com/)
- [TypeORM 공식 문서](https://typeorm.io/)
- [BullMQ 공식 문서](https://docs.bullmq.io/)
- [OpenAI API 문서](https://platform.openai.com/docs)

---

## 👤 개발자

**Gwankwon An**
- GitHub: [@ias-kim](https://github.com/ias-kim)

---

**📌 전체 프로젝트 (Frontend 포함) 보기:**
https://github.com/ias-kim/genkun-platform
