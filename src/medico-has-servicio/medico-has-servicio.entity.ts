import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity('medico_has_servicio')
export class MedicoHasServicioEntity {
    @PrimaryColumn()
    idPersona:number;

    @PrimaryColumn()
    idServicio: string;
}
