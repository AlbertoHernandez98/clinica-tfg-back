import { Controller, ForbiddenException, Get, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginGuard } from './login.guard';
import { Request as ExpressRequest, Response } from 'express';
import { RefreshSessionService, REFRESH_MAX_AGE } from './refresh-session.service';
import { PersonaEntity } from '../persona/persona.entity';

const COOKIE = 'clinica_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/auth',
};

function refreshToken(req: ExpressRequest): string | undefined {
  const values = (req.headers.cookie || '').split(';').map(value => value.trim())
    .filter(value => value.startsWith(`${COOKIE}=`));
  if (values.length !== 1) return undefined;
  return values[0].slice(COOKIE.length + 1);
}

function assertOrigin(req: ExpressRequest): void {
  if (req.headers.origin !== (process.env.FRONTEND_ORIGIN || 'http://localhost:4200')) {
    throw new ForbiddenException('Origen no permitido');
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly sessions: RefreshSessionService) {}

  @UseGuards(LoginGuard)
  @Post('login')
  async login(@Request() req: ExpressRequest & { user: PersonaEntity }, @Res({ passthrough: true }) res: Response) {
    assertOrigin(req);
    const token = await this.sessions.create(req.user);
    res.cookie(COOKIE, token, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
    return this.authService.login(req.user);
  }

  @Post('refresh')
  async refresh(@Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    assertOrigin(req);
    const session = await this.sessions.rotate(refreshToken(req));
    const result = await this.authService.login(session.user);
    res.cookie(COOKIE, session.token, { ...cookieOptions, maxAge: session.maxAge });
    return result;
  }

  @Post('logout')
  async logout(@Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    assertOrigin(req);
    await this.sessions.revoke(refreshToken(req));
    res.clearCookie(COOKIE, cookieOptions);
    return { cerrado: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  me(@Request() req) {
    const { idPersona, nombre, apellidos, idRolNativo } = req.user;
    return { idPersona, nombre, apellidos, idRolNativo };
  }
}
