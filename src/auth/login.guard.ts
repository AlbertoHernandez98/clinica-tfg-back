import { BadRequestException, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { LoginLimiter } from './login-limiter';

@Injectable()
export class LoginGuard extends AuthGuard('local') {
  constructor(private readonly limiter: LoginLimiter) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const body = req.body;
    if (!body || typeof body.username !== 'string' || !body.username.trim() || body.username.length > 9 ||
        typeof body.password !== 'string' || !body.password || body.password.length > 45 ||
        Object.keys(body).some(key => key !== 'username' && key !== 'password')) {
      throw new BadRequestException('Solicitud de inicio de sesión inválida');
    }
    const keys = this.limiter.reserve(req.ip, body.username);
    try {
      const allowed = await super.canActivate(context);
      if (allowed) this.limiter.success(keys);
      return Boolean(allowed);
    } catch (error) {
      if (!(error instanceof UnauthorizedException)) this.limiter.success(keys);
      throw error;
    }
  }
}
