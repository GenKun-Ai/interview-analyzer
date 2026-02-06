import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile, StrategyOptions } from "passport-google-oauth20";

/**
 * Google OAuth 로그인 전략
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
        super({
          clientID: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          callbackURL: process.env.GOOGLE_CALLBACK as string,
          scope: ['email', 'profile'], // 이메일과 프로필 정보 요청
        } as StrategyOptions);
    }

    // Google 인증 성공 시 호출 → req.user에 저장됨
    async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
        const { id, emails, displayName } = profile;

        if (!emails || !emails.length) {
            throw new Error('Google 프로필에서 이메일을 찾을 수 없습니다');
        }

        const user = {
            googleId: id,
            email: emails[0].value,
            name: displayName,
        };

        return user;
    }
}