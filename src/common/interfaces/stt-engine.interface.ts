// stt-engine.interface.ts
export interface SttResult {
    fullText: string;  // 전체 텍스트
    segments: TranscriptSegment[];
    language: string;
    duration: number;
    speakers?: Speaker[];
}

export interface TranscriptSegment {
    id: string;
    text: string;
    startTime: number; //ms
    endTime: number;
    speakerId?: string;  // typo 수정: speakedId → speakerId
    confidence: number;
    words?: Word[];
}

export interface Word {
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
}

export interface Speaker {
    id: string;
    label: string; // "면접자", "면접관"
}

export interface SttEngine {
    transcribe(audioBuffer: Buffer, options?: SttOptions): Promise<SttResult>;
    getSupportedLanguages(): string[];
    getName(): string;
}

export interface SttOptions {
    language?: string;
    enableSpeakerDiarization?: boolean;
    enableWordTimestamps?: boolean;
}