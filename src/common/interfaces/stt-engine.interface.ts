// stt-engine.interface.ts
export interface SttResult {
    fullText: string;  // 전체 텍스트를 포함함
    segments: TranscriptSegment[]; // 텍스트 세그먼트 목록
    language: string; // 감지된 언어 코드
    duration: number; // 오디오 총 길이 (초 단위)
    speakers?: Speaker[]; // 화자 정보 (선택 사항)
}

export interface TranscriptSegment {
    id: string; // 세그먼트 고유 ID
    text: string; // 세그먼트 텍스트 내용
    startTime: number; // 세그먼트 시작 시간 (밀리초)
    endTime: number; // 세그먼트 종료 시간 (밀리초)
    speakerId?: string;  // 화자 ID (선택 사항)
    confidence: number; // 세그먼트 신뢰도
    words?: Word[]; // 단어별 정보 (선택 사항)
}

export interface Word {
    text: string; // 단어 텍스트
    startTime: number; // 단어 시작 시간 (밀리초)
    endTime: number; // 단어 종료 시간 (밀리초)
    confidence: number; // 단어 신뢰도
}

export interface Speaker {
    id: string; // 화자 고유 ID
    label: string; // 화자 레이블 (예: "면접자", "면접관")
}

export interface SttEngine {
    transcribe(audioBuffer: Buffer, options?: SttOptions): Promise<SttResult>; // 오디오를 텍스트로 변환함
    getSupportedLanguages(): string[]; // 지원하는 언어 목록 반환함
    getName(): string; // 엔진 이름 반환함
}

export interface SttOptions {
    language?: string; // 변환할 오디오 언어 (선택 사항)
    filename?: string;
    enableSpeakerDiarization?: boolean; // 화자 분리 활성화 여부 (선택 사항)
    enableWordTimestamps?: boolean; // 단어별 타임스탬프 활성화 여부 (선택 사항)
}