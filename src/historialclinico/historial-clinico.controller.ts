import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HistorialClinicoService } from './historial-clinico.service';
import { AuditoriaHistorialService } from './auditoria-historial.service';

@Controller('historialclinico')
@UseGuards(AuthGuard('jwt'))
export class HistorialClinicoController {
  constructor(private readonly historial: HistorialClinicoService, private readonly audit: AuditoriaHistorialService) {}

  @Get('auditoria')
  auditHistory(@Request() req, @Query('antes') before?: string) {
    return this.audit.list(req.user, before);
  }

  @Get('paciente/:id')
  async patient(@Request() req, @Param('id') id: string) {
    return this.recordDenied(req.user, 'CONSULTA', id, null, () => this.historial.patient(req.user, id));
  }

  @Get('cita/:id')
  async appointment(@Request() req, @Param('id') id: string) {
    return this.recordDenied(req.user, 'CONSULTA', null, null, () => this.historial.appointment(req.user, id));
  }

  @Post()
  add(@Request() req, @Body() body: { idCliente: unknown; idServicio: unknown; idCita?: unknown; comentarios: unknown }) {
    return this.recordDenied(req.user, 'ALTA', body?.idCliente, null, () => this.historial.add(req.user, body));
  }

  @Patch(':id')
  edit(@Request() req, @Param('id') id: string, @Body() body: { comentarios: unknown; motivo: unknown }) {
    return this.recordDenied(req.user, 'EDICION', null, id, () => this.historial.edit(req.user, id, body));
  }

  @Post(':id/anular')
  annul(@Request() req, @Param('id') id: string, @Body() body: { motivo: unknown }) {
    return this.recordDenied(req.user, 'ANULACION', null, id, () => this.historial.annul(req.user, id, body));
  }

  private async recordDenied<T>(
    actor: { idPersona: number; idRolNativo: number },
    operation: 'CONSULTA' | 'ALTA' | 'EDICION' | 'ANULACION',
    patient: unknown, entry: unknown, work: () => Promise<T>,
  ): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ForbiddenException) await this.audit.denied(actor, operation, patient, entry);
      throw error;
    }
  }
}
