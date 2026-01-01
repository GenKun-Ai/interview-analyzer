# GenKun Backend

> AI 음성 분석 시스템 백엔드 API 서버

NestJS 기반의 RESTful API 서버로, 오디오 파일 업로드, STT 처리, AI 분석, 오디오 스트리밍 기능을 제공합니다.

**📌 [전체 프로젝트 보기](https://github.com/ias-kim/genkun)**

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

- 대용량 오디오 비동기 처리
- 다중 STT 엔진 지원
- AI 기반 음성 분석 결과 제공
- 오디오 스트리밍 (재생 위치 이동 지원)
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

- 비동기 처리 및 스트리밍 최적화 적용
- DB 쿼리 및 리소스 사용 최적화

---

## 🔐 보안

- 환경 변수로 민감 정보 관리
- 파일 업로드 및 접근 제어 기반 보안 적용

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
https://github.com/ias-kim/genkun
