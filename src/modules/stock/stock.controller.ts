import {
  Controller, Get, Param, ParseIntPipe, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StockService } from './stock.service';
import { GetMovimientosDto } from './dto/get-movimientos.dto';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private service: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todo el stock de la empresa' })
  findAll(@Request() req: any) {
    return this.service.findAll(req.user.empresaId);
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Movimientos de stock paginados — ?almacenId= para filtrar' })
  findMovimientos(
    @Request() req: any,
    @Query() query: GetMovimientosDto,
  ) {
    const { almacenId, ...pagination } = query;
    return this.service.findMovimientos(pagination, req.user.empresaId, almacenId);
  }

  @Get('dual/:almacenId')
  @ApiOperation({ summary: 'Stock dual: almacen + tienda desglosados por variante' })
  findDual(@Param('almacenId', ParseIntPipe) almacenId: number, @Request() req: any) {
    return this.service.findDual(almacenId, req.user.empresaId);
  }

  @Get('almacen/:almacenId')
  @ApiOperation({ summary: 'Stock de un almacén específico' })
  findByAlmacen(@Param('almacenId', ParseIntPipe) almacenId: number, @Request() req: any) {
    return this.service.findByAlmacen(almacenId, req.user.empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener registro de stock por ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.service.findOne(id, req.user.empresaId);
  }
}
