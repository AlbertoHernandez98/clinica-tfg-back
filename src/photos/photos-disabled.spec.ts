import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../app.module';
import { PhotosModule } from './photos.module';

describe('Photo upload', () => {
  it('is not registered in the application', () => {
    const imports: unknown[] = Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule);
    expect(imports).not.toContain(PhotosModule);
  });
});
