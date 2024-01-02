import { File } from "buffer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('persona')
export class PersonaEntity {

    @PrimaryGeneratedColumn()
    idPersona:number;

    @Column()
    dni: string;

    @Column()
    telefono: string;

    @Column()
    password: string;

    @Column()
    idRolNativo: number;

    @Column()
    username: string;

    @Column()
    email: string;

    @Column()
    domicilio: string;
}
