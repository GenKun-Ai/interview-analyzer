import { Test, TestingModule } from '@nestjs/testing';
import { SttService } from './stt.service';
import { STT_ENGINE } from 'src/common/constans/injection-tokens';
import type { SttEngine, SttResult } from 'src/common/interfaces/stt-engine.interface';

describe('SttService', () => {
  let service: SttService;
  let sttEngine: jest.Mocked<SttEngine>;

  const mockSttResult: SttResult = {
    fullText: '안녕하세요 저는 개발자입니다',
    segments: [
      {
        id: 'seg-1',
        text: '안녕하세요',
        startTime: 0,
        endTime: 1.5,
        confidence: 0.95,
        speakerId: 'Speaker_A',
      },
      {
        id: 'seg-2',
        text: '저는 개발자입니다',
        startTime: 1.5,
        endTime: 3.2,
        confidence: 0.91,
        speakerId: 'Speaker_A',
      },
    ],
    language: 'ko',
    duration: 3.2,
  };

  beforeEach(async () => {
    const mockSttEngine: jest.Mocked<SttEngine> = {
      transcribe: jest.fn(),
      getSupportedLanguages: jest.fn(),
      getName: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SttService,
        { provide: STT_ENGINE, useValue: mockSttEngine },
      ],
    }).compile();

    service = module.get<SttService>(SttService);
    sttEngine = module.get(STT_ENGINE);
  });

  afterEach(() => jest.clearAllMocks());

  it('서비스가 정의되어야 함', () => {
    expect(service).toBeDefined();
  });

  describe('transcribeAudio', () => {
    it('STT 엔진에 오디오 버퍼와 옵션을 전달하고 결과를 반환해야 함', async () => {
      // Given
      const audioBuffer = Buffer.from('mock audio data');
      const language = 'ko';
      const filename = 'interview.mp3';
      sttEngine.transcribe.mockResolvedValue(mockSttResult);

      // When
      const result = await service.transcribeAudio(audioBuffer, language, filename);

      // Then
      expect(sttEngine.transcribe).toHaveBeenCalledWith(audioBuffer, {
        language,
        filename,
        enableSpeakerDiarization: true,
        enableWordTimestamps: true,
      });
      expect(result).toEqual(mockSttResult);
    });

    it('일본어 음성도 처리해야 함', async () => {
      // Given
      const audioBuffer = Buffer.from('mock audio data');
      const jpResult = { ...mockSttResult, language: 'ja' };
      sttEngine.transcribe.mockResolvedValue(jpResult);

      // When
      const result = await service.transcribeAudio(audioBuffer, 'ja', 'interview.mp3');

      // Then
      expect(sttEngine.transcribe).toHaveBeenCalledWith(
        audioBuffer,
        expect.objectContaining({ language: 'ja' }),
      );
      expect(result.language).toBe('ja');
    });

    it('STT 엔진 오류 시 에러를 그대로 전파해야 함', async () => {
      // Given
      sttEngine.transcribe.mockRejectedValue(new Error('STT API 오류'));

      // When & Then
      await expect(
        service.transcribeAudio(Buffer.from(''), 'ko', 'test.mp3'),
      ).rejects.toThrow('STT API 오류');
    });
  });

  describe('getSupportedLanguages', () => {
    it('엔진이 지원하는 언어 목록을 반환해야 함', () => {
      // Given
      sttEngine.getSupportedLanguages.mockReturnValue(['ko', 'ja', 'en']);

      // When
      const result = service.getSupportedLanguages();

      // Then
      expect(sttEngine.getSupportedLanguages).toHaveBeenCalled();
      expect(result).toEqual(['ko', 'ja', 'en']);
    });
  });
});
