import { Injectable, Logger } from '@nestjs/common';
import { CreateAnalysisDto } from './dto/create-analysis.dto';
import { UpdateAnalysisDto } from './dto/update-analysis.dto';
import OpenAI from 'openai';
import { response } from 'express';

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);
  private openai: OpenAI

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OEPN_API_KEY is not set');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async testConnection(): Promise<string> {
    const rsp = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'you are an interview analyzer.',
        },
        {
          role: 'user',
          content: '이 문장을 한 줄로 요약해줘',
        },
      ],
    });
    this.logger.log(JSON.stringify(response, null, 2));

    return rsp.choices[0].message.content ?? '';
  }
}
