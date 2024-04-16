import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MedicoHasServicioEntity } from './medico-has-servicio.entity';
import { MedicoHasServicioService } from './medico-has-servicio.service';
import { MedicoHasServicioController } from './medico-has-servicio.controller';


@Module({
  imports: [TypeOrmModule.forFeature([MedicoHasServicioEntity])],
  controllers: [MedicoHasServicioController],
  providers: [MedicoHasServicioService],
  exports: [MedicoHasServicioService],
})
export class MedicoHasServicioModule {}
