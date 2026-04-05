import { IsString, IsInt, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  categoriaId: number;

  @ApiProperty({ example: 'Agua mineral' })
  @IsString()
  @MaxLength(150)
  nombre: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descripcion?: string;
}
