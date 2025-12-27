import { ConfigService } from "@nestjs/config";

export const queueFactory = (configService: ConfigService<string>) => ({
    redis: {
        host: configService.get<string>('REDIS_HOST', { infer: true }),
        port: configService.get<string>('REDIS_PORT', { infer: true }),
        db: configService.get<string>('REDIS_DB', { infer: true }),
    },
});