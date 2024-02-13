import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('citas')
export class CitasEntity {
    @PrimaryColumn()
    idCita:number;

    @Column()
    fecha: Date;

    @Column()
    idServicio: number;

    @Column()
    historial: string;

    @Column()
    idCliente: number;

    @Column()
    idMedico: number;

}
