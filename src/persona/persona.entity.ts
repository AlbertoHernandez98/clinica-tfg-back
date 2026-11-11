import { File } from "buffer";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('persona')
export class PersonaEntity {

    @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
    idPersona: number;

    @Column()
    dni: string;

    @Column()
    nombre: string;

    @Column()
    apellidos: string;

    @Column({ nullable: true })
    telefono: number;

    @Column({ type: 'varchar', length: 254, nullable: true })
    email: string | null;

    @Column({ name: 'password', nullable: true, length: 255 })
    password: string;

    @Column()
    idRolNativo: number;

    @Column({ nullable: true })
    fotoPerfil: string;
}
