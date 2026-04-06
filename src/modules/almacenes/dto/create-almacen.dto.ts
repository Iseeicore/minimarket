import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAlmacenDto {
  @ApiProperty({ example: 'Almacén Principal' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;
}
