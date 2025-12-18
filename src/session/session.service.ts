import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SessionEntity } from './session.entity';
import { Repository } from 'typeorm';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);

    constructor(
        @InjectRepository(SessionEntity)
        private readonly sessionRepository: Repository<SessionEntity>
    ) {}

    async create(language: string) {
        const session = this.sessionRepository.create({ language });
        return this.sessionRepository.save(session);
    }

    async findOne(id: string) {
        return 'hello';
    }
}
