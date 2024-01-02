import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcrypt';

import { PersonaService } from 'src/persona/persona.service';
import { PersonaEntity } from 'src/persona/persona.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly personaService: PersonaService,
        private readonly jwtService: JwtService,
    ) { }

    async validateUser(username: string, password: string): Promise<PersonaEntity | null> {
        const user = await this.personaService.findByUsername(username);

        if (user && this.comparePasswords(password, user.password)) {
            return user;
        }

        return null;
    }

    private comparePasswords(password: string, hashedPassword: string): boolean {
        return password === hashedPassword;
    }

    async login(persona: PersonaEntity) {
        const payload = { username: persona.username, password: persona.password };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
