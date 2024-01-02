import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('historialclinico')
export class HistorialClinicoEntity {
    @PrimaryColumn()
    idHistorialClinico:number;

    @Column()
    comentarios: string;
    
    @Column()
    fecha: Date;

    @Column()
    idCliente: number;

    @Column()
    idMedico: number;

    @Column()
    idServicio: number;
}
