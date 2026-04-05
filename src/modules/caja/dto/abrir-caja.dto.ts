import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AbrirCajaDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  almacenId: number;

  @ApiProperty({ example: 200.0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoApertura: number;
}
