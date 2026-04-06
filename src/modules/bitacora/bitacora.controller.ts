import {
  Body, Controller, Get, Post, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BitacoraService } from './bitacora.service';
import { CreateBitacoraDto } from './dto/create-bitacora.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('bitacora')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bitacora')
export class BitacoraController {
  constructor(private service: BitacoraService) {}

  @Get()
  @ApiOperation({ summary: 'Listar bitácora paginada — ?almacenId= para filtrar' })
  @ApiQuery({ name: 'almacenId', required: false, type: Number })
  findAll(
    @Request() req: any,
    @Query() pagination: PaginationDto,
    @Query('almacenId') almacenId?: string,
  ) {
    return this.service.findAll(pagination, req.user.empresaId, almacenId ? Number(almacenId) : undefined);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nueva entrada en bitácora' })
  create(@Body() dto: CreateBitacoraDto, @Request() req: any) {
    return this.service.create(dto, req.user.id);
  }
}
