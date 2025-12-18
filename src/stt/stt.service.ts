import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SttService {
    constructor(private configService: ConfigService) {}

    testConnection() {
        const apiKey = this.configService.get('OPENAI_API_KEY');
        console.log(`API 키 ${apiKey ? '잘 있다' : '잘 없다'}`);
    }
}
