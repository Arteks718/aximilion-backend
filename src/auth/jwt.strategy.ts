import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    const issuer = `${supabaseUrl}/auth/v1`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/.well-known/jwks.json`,
      }),
      issuer: issuer,
      algorithms: ['ES256'],
    });
  }

  async validate(payload: any) {
    // Payload decoded from the Supabase-issued RS256 JWT
    // `sub` holds the Supabase user UUID; injected into `req.user`
    return { supabase_uid: payload.sub, email: payload.email };
  }
}
