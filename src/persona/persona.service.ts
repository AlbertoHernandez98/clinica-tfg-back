/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonaEntity } from './persona.entity';
import { PersonaClinica } from './persona.interface';
// import { JwtPayload } from 'src/jwt/jwt.strategy';

@Injectable()
export class PersonaService {

    constructor(
        @InjectRepository(PersonaEntity)
        private personaRepository: Repository<PersonaEntity>
    ) { }

    async addPersona(persona: PersonaClinica): Promise<any> {
        let newPersona = new PersonaEntity();
        newPersona.apellidos = persona.apellidos;
        newPersona.contraseña = persona.contraseña;
        newPersona.dni = persona.dni;
        // newPersona.fotoPerfil = persona.fotoPerfil;
        newPersona.idPersona = persona.idPersona;
        newPersona.idRolNativo = persona.idRolNativo;
        newPersona.nombre = persona.nombre;
        newPersona.telefono = persona.telefono;

        const item = await this.personaRepository.save(newPersona)

        return item;
    }

    getAllPersonas(): Promise<PersonaEntity[]> {
        return this.personaRepository.find();
    }

    getPersonaById(idPersona: number): Promise<PersonaEntity> {
        return this.personaRepository.findOneBy({ idPersona });
    }

    async editarPersona(idPersona: number, persona: PersonaEntity): Promise<PersonaEntity> {
        let toUpdate = await this.personaRepository.findOneBy({idPersona})
        let update = Object.assign(toUpdate, persona);
        const persona_actualizada = await this.personaRepository.save(toUpdate)
        return persona_actualizada
    }

    async deletePersona(id: number): Promise<void> {
        await this.personaRepository.delete(id);
    }

    // async validateUser(payload: JwtPayload): Promise<PersonaEntity> {
    //     const user = await this.findByPayload(payload);    
    //     if (!user) {
    //         throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);    
    //     }    
    //     return user;  
    // }

    async findByPayload({ dni }: any): Promise<PersonaEntity> {
        return await this.personaRepository.findOne({ 
            where:  { dni } });  
    }
}

    // async login(loginUserDto: LoginUserDto): Promise<LoginStatus> {    
    //     // find user in db    
    //     const user = await this.findByLogin(loginUserDto);
        
    //     // generate and sign token    
    //     const token = this._createToken(user);
        
    //     return {
    //         username: user.nombre, ...token,    
    //     };  
    // }
    
//     private _createToken({ nombre }: PersonaEntity): any {
//         const user: JwtPayload = { nombre };    
//         const accessToken = this.jwtService.sign(user);    
//         return {
//             expiresIn: process.env.EXPIRESIN,
//             accessToken,    
//         };  
//     }

//     async findByLogin({ nombre, password }: LoginUserDto): Promise<PersonaEntity> {    
//         const user = await this.personaRepository.findOne({ where: { nombre } });
        
//         if (!user) {
//             throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);    
//         }
        
//         // compare passwords    
//         const areEqual = await comparePasswords(user.password, password);
        
//         if (!areEqual) {
//             throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);    
//         }
        
//         return toUserDto(user);  
//     }

// }



// export interface LoginUserDto { 
//     username: string; 
//     password: string;
// }

// export const toUserDto = (data: PersonaEntity): PersonaClinica => {  
//     const { dni, nombre, idPersona  } = data;
//     let userDto: PersonaClinica = { dni, nombre, idPersona  };
//     return userDto;
// };

