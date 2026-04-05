import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Bebidas' })
  @IsString()
  @MaxLength(100)
  nombre: string;

  @ApiProperty({ required: false, example: 'Bebidas gaseosas y naturales' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}
