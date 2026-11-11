import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HistorialClinicoService } from './historial-clinico.service';

@Controller('historialclinico')
@UseGuards(AuthGuard('jwt'))
export class HistorialClinicoController {
  constructor(private readonly historial: HistorialClinicoService) {}

  @Get('paciente/:id')
  patient(@Request() req, @Param('id') id: string) {
    return this.historial.patient(req.user, id);
  }

  @Get('cita/:id')
  appointment(@Request() req, @Param('id') id: string) {
    return this.historial.appointment(req.user, id);
  }

  @Post()
  add(@Request() req, @Body() body: { idCliente: unknown; idServicio: unknown; idCita?: unknown; comentarios: unknown }) {
    return this.historial.add(req.user, body);
  }

  @Patch(':id')
  edit(@Request() req, @Param('id') id: string, @Body() body: { comentarios: unknown; motivo: unknown }) {
    return this.historial.edit(req.user, id, body);
  }

  @Post(':id/anular')
  annul(@Request() req, @Param('id') id: string, @Body() body: { motivo: unknown }) {
    return this.historial.annul(req.user, id, body);
  }
}
