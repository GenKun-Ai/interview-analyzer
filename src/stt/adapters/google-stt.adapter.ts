// 차후 구현 ..
import { Injectable } from "@nestjs/common";
import { SttEngine, SttOptions, SttResult } from "src/common/interfaces/stt-engine.interface";

// stt/adapters/google-stt.adapter.ts
@Injectable()
export class GoogleSttAdapter implements SttEngine {
    getName(): string {
        return 'Google Cloud STT'
    }

    getSupportedLanguages(): string[] {
        return ['ko', 'ja', 'en'];
    }

    transcribe(audioBuffer: Buffer, options?: SttOptions): Promise<SttResult> {
        throw new Error('Google STT not implemented yet');
    }
}