import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CerrarCajaDto {
  @ApiProperty({ example: 350.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  montoCierre: number;
}
