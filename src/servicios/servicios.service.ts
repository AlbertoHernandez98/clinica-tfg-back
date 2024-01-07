/*
https://docs.nestjs.com/providers#services
*/

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiciosEntity } from './servicios.entity';

// import { JwtPayload } from 'src/jwt/jwt.strategy';

@Injectable()
export class ServiciosService {
  constructor(
    @InjectRepository(ServiciosEntity)
    private serviciosRepository: Repository<ServiciosEntity>,
  ) {}

  getAllServicios(): Promise<ServiciosEntity[]> {
    console.log(this.serviciosRepository.find());
    
    return this.serviciosRepository.find();
  }

}
