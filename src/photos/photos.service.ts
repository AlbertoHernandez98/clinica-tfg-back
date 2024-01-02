import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photos } from './photos.entity';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photos)
    private readonly photoRepository: Repository<Photos>,
  ) {}

  async createPhoto(filename: string, filePath: string): Promise<Photos> {
    const photo = new Photos();
    photo.filename = filename;
    photo.filePath = filePath;
    return this.photoRepository.save(photo);
  }
}
