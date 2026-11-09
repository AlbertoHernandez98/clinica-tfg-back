import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cita')
export class CitasEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  idCita: number;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time' })
  hora: string;

  @Column()
  idServicio: number;

  @Column()
  idCliente: number;

  @Column()
  idMedico: number;

  @Column()
  duracion: number;
}
