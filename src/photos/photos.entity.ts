import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Photos {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column()
  filePath: string;
}
