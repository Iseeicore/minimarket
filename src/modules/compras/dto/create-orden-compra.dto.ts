import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemCompraDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  varianteId: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  cantidad: number;

  @ApiProperty({ example: 5.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  costoUnitario: number;
}

export class CreateOrdenCompraDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  almacenId: number;

  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @IsInt()
  contactoId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notas?: string;

  @ApiProperty({ type: [CreateItemCompraDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateItemCompraDto)
  items: CreateItemCompraDto[];
}
