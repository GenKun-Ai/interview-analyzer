export class SttResultDto {
    segment: TranscriptSegmentDto[];
    language: string;
    duration: number;
    speakers?: SpeakerDto[];
}

export class TranscriptSegmentDto {
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    speakerId?: string;
    confidence: number;
    words?: WordDto[];
}

export class WordDto {
    text: string;
    startTime: number;
    endTime: number;
    confidence: number;
}

export class SpeakerDto {
    id: string;
    label: string;
}