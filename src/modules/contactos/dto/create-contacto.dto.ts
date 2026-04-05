import { IsString, IsOptional, IsEnum, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';

export enum TipoContacto {
  CLIENTE = 'CLIENTE',
  PROVEEDOR = 'PROVEEDOR',
  AMBOS = 'AMBOS',
}

export class CreateContactoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  empresaId: number;

  @ApiProperty({ enum: TipoContacto, default: TipoContacto.CLIENTE })
  @IsEnum(TipoContacto)
  tipo: TipoContacto;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MaxLength(150)
  nombre: string;

  @ApiProperty({ required: false, example: 'DNI' })
  @IsOptional()
  @IsString()
  tipoDoc?: string;

  @ApiProperty({ required: false, example: '12345678' })
  @IsOptional()
  @IsString()
  nroDoc?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  direccion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;
}
