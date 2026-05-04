import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

const SUPABASE_ISSUER = `${process.env.SUPABASE_URL}/auth/v1`;
const JWKS_URI = `${process.env.SUPABASE_URL}/.well-known/jwks.json`;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: JWKS_URI,
      }),
      issuer: SUPABASE_ISSUER,
      algorithms: ['ES256'],
    });
  }

  async validate(payload: any) {
    // Payload decoded from the Supabase-issued RS256 JWT
    // `sub` holds the Supabase user UUID; injected into `req.user`
    return { supabase_uid: payload.sub, email: payload.email };
  }
}
