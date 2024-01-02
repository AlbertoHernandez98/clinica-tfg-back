import { Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PhotosService } from './photos.service';
import * as fs from 'fs';
import * as path from 'path';
import * as Busboy from 'busboy';

@Controller('photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('upload')
  async uploadPhoto(@Req() req: Request, @Res() res: Response) {
    try {      
      const busboy = new Busboy({ headers: req.headers });
      const filePromises: Promise<string>[] = [];

      busboy.on('file', (fieldname, file, filename) => {
        const fileId = uuidv4();
        const saveToPath = path.join('./uploads', fileId);

        const writeStream = fs.createWriteStream(saveToPath);
        file.pipe(writeStream);

        const promise = new Promise<string>((resolve, reject) => {
          writeStream.on('finish', () => {
            resolve(fileId);
          });

          writeStream.on('error', (error) => {
            reject(error);
          });
        });

        filePromises.push(promise);
      });

      busboy.on('finish', async () => {
        const fileIds = await Promise.all(filePromises);

        // Guardar los archivos en la base de datos utilizando el servicio PhotosService
        await Promise.all(
          fileIds.map((fileId) => {
            const filePath = path.join('./uploads', fileId);
            return this.photosService.createPhoto(fileId, filePath);
          }),
        );

        return res.status(201).json({ message: 'Fotos guardadas exitosamente' });
      });

      req.pipe(busboy);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al guardar las fotos' });
    }
  }
}
