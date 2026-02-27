import { GetStockUseCase } from '@application/stockUseCases/getStockUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Inventory - Stock')
@Controller('inventory/stock')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class StockController {
  private readonly logger = new Logger(StockController.name);

  constructor(private readonly getStockUseCase: GetStockUseCase) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INVENTORY_READ)
  @ApiOperation({
    summary: 'Get stock',
    description:
      'Get current stock levels with optional filters. Requires INVENTORY:READ permission.',
  })
  @ApiQuery({
    name: 'warehouseId',
    required: false,
    type: String,
    description: 'Filter by warehouse ID',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter by product ID',
  })
  @ApiQuery({
    name: 'lowStock',
    required: false,
    type: Boolean,
    description: 'Filter products below minimum quantity (requires reorder rules)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'productName',
      'productSku',
      'warehouseName',
      'quantity',
      'averageCost',
      'totalValue',
      'lastMovementAt',
    ],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Stock retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getStock(
    @OrgId() orgId: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
    @Query('lowStock') lowStock?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc'
  ): Promise<unknown> {
    this.logger.log('Getting stock', { orgId, warehouseId, productId, lowStock });

    const result = await this.getStockUseCase.execute({
      orgId,
      warehouseId,
      productId,
      lowStock: lowStock === 'true',
      sortBy,
      sortOrder,
    });

    return resultToHttpResponse(result);
  }
}
