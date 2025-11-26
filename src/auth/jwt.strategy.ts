import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { db } from '../firebase.config';

type JwtPayload = {
  sub: string;
  email: string;
  role?: string;
  tokenVersion?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-secret',
    });
  }

  async validate(payload: JwtPayload) {
    // Validate tokenVersion against stored user document to allow server-side token revocation
    try {
      const doc = await db.collection(process.env.FIREBASE_USERS_COLLECTION ?? 'users').doc(payload.sub).get();
      if (!doc.exists) throw new UnauthorizedException('Invalid token');
      const data = doc.data() as any;
      const currentVersion = (data?.tokenVersion as number | undefined) ?? 0;
      const tokenVersion = payload.tokenVersion ?? 0;
      if (tokenVersion !== currentVersion) {
        throw new UnauthorizedException('Token revoked');
      }
      return { userId: payload.sub, email: payload.email, role: payload.role };
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

