export interface PersonaClinica{
    idPersona?: number,
    password: string,
    idRolNativo: number,
    telefono: number,
    email?: string | null,
    dni: string,
    nombre: string,
    apellidos: string,
    fotoPerfil?: string,
}