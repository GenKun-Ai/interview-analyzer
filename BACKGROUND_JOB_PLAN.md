# 백그라운드 작업 처리 개선 계획

## 📋 현재 문제점

### 1. 동기 처리 방식의 한계
**현재 구조**: `POST /session/:id/upload` → 즉시 처리 → 응답 대기

```typescript
// session.controller.ts:114-120
async uploadAudio(sessionId, audioFile) {
  return this.sessionService.processAudio(sessionId, audioFile);
  // ⚠️ 10-60초 소요 → HTTP 타임아웃 위험
}
```

**문제점**:
- ⏱️ **지연 시간**: OpenAI Whisper API 10-60초 소요
- 🌐 **네트워크**: 프론트엔드 타임아웃 (보통 30초 제한)
- 💥 **서버 부하**: 동시 업로드 시 스레드 블로킹
- ❌ **에러 복구**: 실패 시 재시도 불가능

### 2. 사용자 경험 저하
- 업로드 후 1분간 화면 멈춤
- 진행 상황 확인 불가
- 네트워크 끊김 시 처음부터 재시작

### 3. 확장성 부족
- 동시 처리 제한 (Node.js 단일 스레드)
- 부하 분산 불가능
- 우선순위 관리 불가

---

## 🎯 목표

1. **즉시 응답**: 업로드 후 2초 내 응답
2. **비동기 처리**: 백그라운드에서 STT/분석 진행
3. **진행 상황 추적**: 실시간 상태 업데이트
4. **에러 복구**: 자동 재시도 + 알림
5. **확장성**: 수평 확장 가능한 구조

---

## 🏗️ 솔루션 아키텍처

### 선택지 비교

| 방식 | 장점 | 단점 | 추천도 |
|------|------|------|--------|
| **Bull Queue** | NestJS 통합, Redis 기반, 강력한 기능 | Redis 의존성 | ⭐⭐⭐⭐⭐ |
| **BullMQ** | Bull 후속, 더 나은 성능 | 비교적 신규 | ⭐⭐⭐⭐ |
| **Agenda** | MongoDB 기반, 스케줄링 강력 | MongoDB 필요 | ⭐⭐⭐ |
| **직접 구현** | 의존성 없음 | 기능 제한적 | ⭐⭐ |

**권장**: **Bull Queue** (NestJS 공식 지원, 안정성, 풍부한 기능)

---

## 📐 설계 방안

### 1단계: Bull Queue 설정

#### 1.1 의존성 설치
```bash
npm install @nestjs/bull bull
npm install @types/bull -D
npm install ioredis  # Redis 클라이언트
```

#### 1.2 모듈 설정
```typescript
// app.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
      },
    }),
    // 세션 모듈에서 큐 등록
  ],
})
```

#### 1.3 세션 모듈에 큐 등록
```typescript
// session.module.ts
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audio-processing',  // 큐 이름
      defaultJobOptions: {
        attempts: 3,              // 실패 시 재시도 3회
        backoff: {
          type: 'exponential',    // 지수 백오프
          delay: 5000,            // 5초부터 시작
        },
        removeOnComplete: false,  // 완료된 작업 기록 보관
        removeOnFail: false,      // 실패한 작업 기록 보관
      },
    }),
  ],
  // ...
})
```

---

### 2단계: 프로듀서 (작업 추가)

#### 2.1 컨트롤러 수정
```typescript
// session.controller.ts
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Controller('session')
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    @InjectQueue('audio-processing') private audioQueue: Queue,
  ) {}

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('audio', multerConfig))
  async uploadAudio(
    @Param('id') sessionId: string,
    @UploadedFile() audioFile: Express.Multer.File,
  ) {
    this.logger.log(`오디오 파일 업로드 완료: ${sessionId}`);

    // 즉시 파일 메타데이터 저장
    await this.sessionService.updateSessionMetadata(sessionId, {
      originalAudioPath: audioFile.path,
      status: 'UPLOADING',
    });

    // 백그라운드 작업 큐에 추가
    const job = await this.audioQueue.add('process-audio', {
      sessionId,
      audioFilePath: audioFile.path,
      originalName: audioFile.originalname,
    });

    // ✅ 즉시 응답 (2초 이내)
    return {
      message: '파일 업로드 완료. 처리 중입니다.',
      sessionId,
      jobId: job.id,  // 작업 추적용 ID
      status: 'QUEUED',
    };
  }
}
```

---

### 3단계: 컨슈머 (작업 처리)

#### 3.1 프로세서 생성
```typescript
// session/processors/audio-processing.processor.ts
import { Process, Processor, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';

@Processor('audio-processing')
export class AudioProcessingProcessor {
  private readonly logger = new Logger(AudioProcessingProcessor.name);

  constructor(
    private readonly sessionService: SessionService,
    private readonly sttService: SttService,
    private readonly analysisService: AnalysisService,
  ) {}

  @Process('process-audio')
  async handleAudioProcessing(job: Job) {
    const { sessionId, audioFilePath, originalName } = job.data;

    this.logger.log(`작업 시작: ${sessionId} (Job ID: ${job.id})`);

    try {
      // 상태 업데이트: TRANSCRIBING
      await this.sessionService.updateStatus(sessionId, 'TRANSCRIBING');
      await job.progress(10); // 진행률 10%

      // STT 처리
      const session = await this.sessionService.findOne(sessionId);
      const audioBuffer = await fs.readFile(audioFilePath);

      const sttResult = await this.sttService.transcribeAudio(
        audioBuffer,
        session.language,
        originalName,
      );

      await job.progress(50); // 진행률 50%

      // 결과 저장
      await this.sessionService.saveTranscript(sessionId, sttResult);
      await this.sessionService.updateSessionMetadata(sessionId, {
        audioDuration: Math.round(sttResult.duration),
      });

      // 상태 업데이트: ANALYZING
      await this.sessionService.updateStatus(sessionId, 'ANALYZING');
      await job.progress(60);

      // 분석 처리
      const analysisResult = await this.analysisService.analyze(sttResult);
      await this.sessionService.saveAnalysis(sessionId, analysisResult);

      await job.progress(90);

      // 완료 처리
      await this.sessionService.updateStatus(sessionId, 'COMPLETED');
      await job.progress(100);

      // 파일 정리 (옵션)
      if (session.deleteAfterAnalysis) {
        await this.sessionService.deleteAudioFile(audioFilePath);
      }

      this.logger.log(`작업 완료: ${sessionId}`);

      return { sessionId, status: 'COMPLETED' };

    } catch (error) {
      this.logger.error(`작업 실패: ${sessionId}`, error.stack);

      // 에러 정보 저장
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.sessionService.updateSessionMetadata(sessionId, {
        status: 'FAILED',
        errorMessage,
      });

      throw error; // Bull이 재시도 처리
    }
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`작업 완료 알림: Job ${job.id}, 세션 ${result.sessionId}`);
    // TODO: 웹소켓으로 프론트엔드에 알림 전송
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(`작업 최종 실패: Job ${job.id}`, error.stack);
    // TODO: 관리자에게 알림 전송
  }
}
```

#### 3.2 서비스 메서드 public으로 변경
```typescript
// session.service.ts
export class SessionService {
  // private → public으로 변경 (프로세서에서 접근)
  public async updateStatus(sessionId: string, status: SessionStatus) { }
  public async updateSessionMetadata(sessionId: string, metadata: Partial<SessionEntity>) { }
  public async saveTranscript(sessionId: string, sttResult: SttResult) { }
  public async saveAnalysis(sessionId: string, analysisResult: AnalysisResult) { }
  public async deleteAudioFile(filePath?: string) { }
}
```

---

### 4단계: 진행 상황 추적 API

#### 4.1 작업 상태 조회
```typescript
// session.controller.ts
@Get(':id/job-status')
async getJobStatus(@Param('id') sessionId: string) {
  // 세션 정보 조회
  const session = await this.sessionService.findOne(sessionId);

  if (!session) {
    throw new NotFoundException('세션을 찾을 수 없습니다');
  }

  // Bull 큐에서 작업 찾기
  const jobs = await this.audioQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
  const job = jobs.find(j => j.data.sessionId === sessionId);

  if (!job) {
    return {
      sessionId,
      status: session.status,
      progress: session.status === 'COMPLETED' ? 100 : 0,
    };
  }

  return {
    sessionId,
    jobId: job.id,
    status: await job.getState(),
    progress: job.progress(),
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
  };
}
```

#### 4.2 WebSocket으로 실시간 업데이트 (선택)
```typescript
// session.gateway.ts (새 파일)
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/session' })
export class SessionGateway {
  @WebSocketServer()
  server: Server;

  notifyProgress(sessionId: string, progress: number, status: string) {
    this.server.to(sessionId).emit('progress', { progress, status });
  }

  notifyCompleted(sessionId: string) {
    this.server.to(sessionId).emit('completed', { sessionId });
  }

  notifyFailed(sessionId: string, error: string) {
    this.server.to(sessionId).emit('failed', { sessionId, error });
  }
}
```

---

## 📊 개선 효과

### Before (현재)
```
클라이언트 → 업로드 → [대기 10-60초] → 응답
                    ↓
                  타임아웃 위험
```

### After (개선)
```
클라이언트 → 업로드 → [2초 응답] ✅
                         ↓
                    백그라운드 작업
                         ↓
              WebSocket 실시간 알림
```

### 성능 개선
| 지표 | Before | After | 개선율 |
|------|--------|-------|--------|
| **응답 시간** | 10-60초 | 2초 | **95%↓** |
| **동시 처리** | 제한적 | 무제한* | **10배↑** |
| **재시도** | 불가 | 자동 3회 | ✅ |
| **진행 추적** | 불가 | 실시간 | ✅ |

*Redis/서버 리소스 한도 내

---

## 🔧 구현 체크리스트

### Phase 1: 기본 구조 (2-3시간)
- [ ] Redis 설치 및 설정
- [ ] Bull Queue 의존성 설치
- [ ] 모듈 설정 (app.module.ts, session.module.ts)
- [ ] 프로세서 생성 (audio-processing.processor.ts)
- [ ] 컨트롤러 수정 (즉시 응답)

### Phase 2: 진행 추적 (1-2시간)
- [ ] 작업 상태 조회 API 추가
- [ ] 진행률 업데이트 로직 구현
- [ ] 프론트엔드 폴링 구현

### Phase 3: 실시간 알림 (선택, 2-3시간)
- [ ] WebSocket Gateway 구현
- [ ] 진행 상황 실시간 전송
- [ ] 프론트엔드 Socket.io 연결

### Phase 4: 모니터링 (1-2시간)
- [ ] Bull Board UI 설치 (관리자용 대시보드)
- [ ] 에러 알림 설정
- [ ] 성능 메트릭 수집

---

## 🚀 배포 고려사항

### 1. Redis 설정
**개발 환경**:
```bash
# Docker로 Redis 실행
docker run -d -p 6379:6379 redis:alpine
```

**프로덕션 환경**:
- AWS ElastiCache (Redis)
- Azure Cache for Redis
- 자체 Redis 클러스터

### 2. 환경 변수
```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=       # 프로덕션에서 필수
REDIS_DB=0            # 기본값

# Bull Queue 설정
BULL_MAX_CONCURRENCY=5   # 동시 처리 작업 수
BULL_RETRY_ATTEMPTS=3
BULL_RETRY_DELAY=5000
```

### 3. 모니터링 대시보드
```bash
# Bull Board 설치 (선택)
npm install @bull-board/api @bull-board/express

# app.module.ts에 추가
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullAdapter(audioQueue)],
  serverAdapter,
});

// 관리자 전용 라우트
app.use('/admin/queues', serverAdapter.getRouter());
```

접속: `http://localhost:3000/admin/queues`

---

## 📚 참고 자료

- [NestJS Bull 공식 문서](https://docs.nestjs.com/techniques/queues)
- [Bull GitHub](https://github.com/OptimalBits/bull)
- [Bull Board (모니터링 UI)](https://github.com/felixmosh/bull-board)
- [Redis 설치 가이드](https://redis.io/docs/getting-started/)

---

## 🎯 마이그레이션 전략

### 1. 점진적 도입 (권장)
```typescript
// 기존 동기 처리 유지 + 새로운 비동기 엔드포인트 추가
@Post(':id/upload')           // 기존: 동기 처리
@Post(':id/upload-async')     // 신규: 비동기 처리
```

### 2. Feature Flag
```typescript
const USE_ASYNC_PROCESSING = process.env.FEATURE_ASYNC_JOBS === 'true';

if (USE_ASYNC_PROCESSING) {
  await this.audioQueue.add('process-audio', { ... });
} else {
  await this.sessionService.processAudio(sessionId, audioFile);
}
```

### 3. A/B 테스팅
- 50% 트래픽 → 비동기 처리
- 50% 트래픽 → 기존 동기 처리
- 성능/안정성 비교 후 전환

---

## ⚠️ 주의사항

1. **Redis 단일 장애점**: Redis 다운 시 큐 동작 중단
   - **해결**: Redis Sentinel/Cluster로 고가용성 확보

2. **작업 데이터 크기**: Bull은 Job 데이터를 Redis에 저장
   - **주의**: 큰 데이터(오디오 파일)는 경로만 전달

3. **메모리 관리**: 완료된 작업 기록 축적
   - **해결**: TTL 설정 또는 주기적 정리

4. **동시성 제한**: CPU/메모리 한계 고려
   - **설정**: `concurrency` 옵션으로 조절 (기본 5-10)

---

## 📝 다음 단계

1. **현재**: 계획서 검토
2. **선택**: 구현 진행 여부 결정
3. **구현**: Phase별 순차 진행
4. **테스트**: 로컬 환경 검증
5. **배포**: 프로덕션 적용

---

**작성일**: 2025-12-27
**버전**: 1.0
**담당**: Claude Code Analysis
