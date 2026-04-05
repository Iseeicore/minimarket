import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUnidadMedidaDto {
  @ApiProperty({ example: 'Litros' })
  @IsString()
  @MaxLength(50)
  nombre: string;

  @ApiProperty({ example: 'LT' })
  @IsString()
  @MaxLength(10)
  abreviatura: string;
}
