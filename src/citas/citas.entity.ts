import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('citas')
export class CitasEntity {
    @PrimaryColumn()
    idCita:number;

    @Column()
    idServicio: number;

    @Column()
    idCliente: number;

    @Column()
    idMedico: number;

    @Column()
    duracion: number;

    @Column()
    fechaInicio: Date;
}
