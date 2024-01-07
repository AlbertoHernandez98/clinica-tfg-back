import { File } from "buffer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('servicio')
export class ServiciosEntity {
    @PrimaryGeneratedColumn()
    idServicio: number;

    @Column()
    servicio: string;
}
