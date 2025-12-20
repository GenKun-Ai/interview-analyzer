export class SttResultDto {
    segment: TranscriptSegmentDto[]; // 텍스트 세그먼트 목록
    language: string; // 감지된 언어
    duration: number; // 오디오 길이
    speakers?: SpeakerDto[]; // 화자 정보 (선택 사항)
}

export class TranscriptSegmentDto {
    id: string; // 세그먼트 고유 ID
    text: string; // 세그먼트 텍스트
    startTime: number; // 시작 시간
    endTime: number; // 종료 시간
    speakerId?: string; // 화자 ID (선택 사항)
    confidence: number; // 신뢰도
    words?: WordDto[]; // 단어 목록 (선택 사항)
}

export class WordDto {
    text: string; // 단어 텍스트
    startTime: number; // 단어 시작 시간
    endTime: number; // 단어 종료 시간
    confidence: number; // 단어 신뢰도
}

export class SpeakerDto {
    id: string; // 화자 고유 ID
    label: string; // 화자 레이블
}