import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcrypt';

import { PersonaService } from '../persona/persona.service';
import { PersonaEntity } from '../persona/persona.entity';

@Injectable()
export class AuthService {
    constructor(
        private readonly personaService: PersonaService,
        private readonly jwtService: JwtService,
    ) { }

    async validateUser(dni: string, password: string): Promise<PersonaEntity | null> {
        const user = await this.personaService.findByDni(dni);

        if (user && this.comparePasswords(password, user.password)) {
            return user;
        }

        return null;
    }

    private comparePasswords(password: string, hashedPassword: string): boolean {
        return password === hashedPassword;
    }

    async login(persona: PersonaEntity) {
        const payload = { sub: persona.idPersona };
        return {
            access_token: this.jwtService.sign(payload),
            user: { idPersona: persona.idPersona, dni: persona.dni, nombre: persona.nombre, idRolNativo: persona.idRolNativo },
        };
    }

    async findById(id: number): Promise<PersonaEntity | null> {
        return this.personaService.getPersonaById(id);
    }
}
