import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CitasService } from './citas.service';

@Controller()
@UseGuards(AuthGuard('jwt'))
export class CitasController {
  constructor(private readonly citas: CitasService) {}

  @Get('citas')
  list(@Request() req) { return this.citas.list(req.user); }

  @Get('citas/mi-agenda')
  agenda(@Request() req, @Query('inicio') inicio: string) { return this.citas.agenda(req.user, inicio); }

  @Get('citas/mis-citas')
  myAppointments(@Request() req) { return this.citas.myAppointments(req.user); }

  @Get('citas/agenda')
  managedAgenda(@Request() req, @Query('inicio') inicio: string, @Query('idMedico') idMedico: string) {
    return this.citas.managedAgenda(req.user, inicio, idMedico);
  }

  @Post('citas')
  create(@Request() req, @Body() body) { return this.citas.save(req.user, body); }

  @Post('citas/disponibilidad')
  check(@Request() req, @Body() body) { return this.citas.check(req.user, body); }

  @Post('citas/huecos')
  slots(@Request() req, @Body() body) { return this.citas.slots(req.user, body); }

  @Put('citas/:id')
  update(@Request() req, @Param('id') id: string, @Body() body) { return this.citas.save(req.user, body, id); }

  @Delete('citas/:id')
  delete(@Request() req, @Param('id') id: string) { return this.citas.delete(req.user, id); }

  @Get('medicos/:id/vacaciones')
  holidays(@Request() req, @Param('id') id: string) { return this.citas.holidays(req.user, id); }

  @Post('medicos/:id/vacaciones')
  addHoliday(@Request() req, @Param('id') id: string, @Body() body) { return this.citas.addHoliday(req.user, id, body); }

  @Delete('medicos/:id/vacaciones/:holidayId')
  deleteHoliday(@Request() req, @Param('id') id: string, @Param('holidayId') holiday: string) {
    return this.citas.deleteHoliday(req.user, id, holiday);
  }
}
