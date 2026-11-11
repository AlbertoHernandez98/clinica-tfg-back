import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { jwtConstants } from './constants';
import { PersonaModule } from 'src/persona/persona.module';
import { LoginGuard } from './login.guard';
import { LoginLimiter } from './login-limiter';
import { RefreshSessionService } from './refresh-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([]), // Importa las entidades relacionadas con la autenticación si es necesario
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '15m' },
    }),
    PersonaModule, // Importa el módulo de usuario si es necesario
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, LoginGuard, LoginLimiter, RefreshSessionService],
  exports: [AuthService], // Exporta el servicio de autenticación si es necesario
})
export class AuthModule {}
