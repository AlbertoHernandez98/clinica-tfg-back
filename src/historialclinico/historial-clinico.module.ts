import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialClinicoEntity } from './historial-clinico.entity';
import { HistorialClinicoService } from './historial-clinico.service';
import { HistorialClinicoController } from './historial-clinico.controller';
import { AuditoriaHistorialService } from './auditoria-historial.service';


@Module({
  imports: [TypeOrmModule.forFeature([HistorialClinicoEntity])],
  controllers: [HistorialClinicoController],
  providers: [HistorialClinicoService, AuditoriaHistorialService],
  exports: [HistorialClinicoService],
})
export class HistorialClinicoModule {}
