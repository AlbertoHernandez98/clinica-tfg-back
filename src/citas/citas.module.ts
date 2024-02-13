import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitasEntity } from './citas.entity';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';


@Module({
  imports: [TypeOrmModule.forFeature([CitasEntity])],
  controllers: [CitasController],
  providers: [CitasService],
  exports: [CitasService],
})
export class CitasModule {}
