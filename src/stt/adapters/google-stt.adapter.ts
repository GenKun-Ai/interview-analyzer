// 차후 구현 ..
import { Injectable } from "@nestjs/common";
import { SttEngine, SttOptions, SttResult } from "src/common/interfaces/stt-engine.interface";

// stt/adapters/google-stt.adapter.ts
@Injectable()
export class GoogleSttAdapter implements SttEngine {
    getName(): string {
        return 'Google Cloud STT' // 어댑터 이름 반환함
    }

    getSupportedLanguages(): string[] {
        return ['ko', 'ja', 'en']; // 지원 언어 목록 반환함
    }

    transcribe(audioBuffer: Buffer, options?: SttOptions): Promise<SttResult> {
        // TODO 추후 구현 예정
        throw new Error('Google STT not implemented yet');
    }
}