import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RolUsuario } from '@prisma/client';

export class UpdateUsuarioDto {
  @ApiProperty({ required: false, example: 'Juan Pérez' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nombre?: string;

  @ApiProperty({ required: false, enum: RolUsuario })
  @IsOptional()
  @IsEnum(RolUsuario)
  rol?: RolUsuario;

  @ApiProperty({ required: false, example: 1 })
  @IsOptional()
  @IsInt()
  almacenId?: number;

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @ApiProperty({ required: false, minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
