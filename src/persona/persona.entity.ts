import { File } from "buffer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('persona')
export class PersonaEntity {

    @PrimaryGeneratedColumn()
    idPersona:number;

    @Column({nullable: true})
    dni: string;

    @Column({nullable: true})
    nombre: string;

    @Column({nullable: true})
    apellidos: string;

    @Column({nullable: true})
    telefono: string;

    @Column({nullable: true})
    contraseña: string;

    @Column({nullable: true})
    idRolNativo: number;

    // @Column()
    // fotoPerfil: File;

}