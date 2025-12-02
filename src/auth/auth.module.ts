import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as JwtSignOptions['expiresIn'];
export const JWT_SIGN_OPTIONS: JwtSignOptions = {
  secret: JWT_SECRET,
  expiresIn: JWT_EXPIRES_IN,
};

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: JWT_SIGN_OPTIONS.secret,
      signOptions: { expiresIn: JWT_SIGN_OPTIONS.expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}

