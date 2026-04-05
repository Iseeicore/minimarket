import { IsInt, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBitacoraDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  almacenId: number;

  @ApiProperty({ example: 'Se realizó conteo físico de inventario en zona A' })
  @IsString()
  @MaxLength(1000)
  contenido: string;
}
