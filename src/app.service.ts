import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  getPersona(): Array<object> {
    return [{
      idPersona: '1',
      dni: '12345678A',
      nombre: 'root',
      apellidos: 'root',
      telefono: '123456789',
      contraseña: 'root',
      idRolNativo: '1',
      fotoPerfil: null
    }]
  }

  createUser(user): Array<object> {
    return [user];
  }

  updateUser(user, id): Array<object> {
    user.id = id;
    return [user];
  }
}
