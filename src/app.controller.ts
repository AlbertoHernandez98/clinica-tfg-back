import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('/cliente')
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Get()
  // getHello(): string {
  //   return this.appService.getPersona();
  // }

  @Get()
  getAllPersonas(): Array<object>{
    return this.appService.getPersona();
  }
}
