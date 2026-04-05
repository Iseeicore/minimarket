import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StockService } from './stock.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('stock')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private service: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todo el stock por almacén' })
  findAll() {
    return this.service.findAll();
  }

  @Get('movimientos')
  @ApiOperation({ summary: 'Listar movimientos de stock paginados — ?almacenId= para filtrar' })
  @ApiQuery({ name: 'almacenId', required: false, type: Number })
  findMovimientos(
    @Query() pagination: PaginationDto,
    @Query('almacenId') almacenId?: string,
  ) {
    return this.service.findMovimientos(pagination, almacenId ? Number(almacenId) : undefined);
  }

  @Get('almacen/:almacenId')
  @ApiOperation({ summary: 'Stock de un almacén específico' })
  findByAlmacen(@Param('almacenId', ParseIntPipe) almacenId: number) {
    return this.service.findByAlmacen(almacenId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un registro de stock por ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
