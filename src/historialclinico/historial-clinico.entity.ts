import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('historialclinico')
export class HistorialClinicoEntity {
    @PrimaryGeneratedColumn()
    idHistorialClinico:number;

    @Column()
    comentarios: string;
    
    @Column()
    fecha: string;

    @Column()
    hora: string;

    @Column()
    idCliente: number;

    @Column()
    idMedico: number;

    @Column()
    idServicio: number;

    @Column({ nullable: true })
    idCita: number | null;

    @Column({ type: 'tinyint', default: 0 })
    anulada: boolean;
}
