import { CreateIntegrationConnectionUseCase } from '@application/integrationUseCases/createIntegrationConnectionUseCase';
import { DeleteIntegrationConnectionUseCase } from '@application/integrationUseCases/deleteIntegrationConnectionUseCase';
import { GetIntegrationConnectionsUseCase } from '@application/integrationUseCases/getIntegrationConnectionsUseCase';
import { GetIntegrationConnectionByIdUseCase } from '@application/integrationUseCases/getIntegrationConnectionByIdUseCase';
import { UpdateIntegrationConnectionUseCase } from '@application/integrationUseCases/updateIntegrationConnectionUseCase';
import { CreateSkuMappingUseCase } from '@application/integrationUseCases/createSkuMappingUseCase';
import { DeleteSkuMappingUseCase } from '@application/integrationUseCases/deleteSkuMappingUseCase';
import { GetSkuMappingsUseCase } from '@application/integrationUseCases/getSkuMappingsUseCase';
import { GetSyncLogsUseCase } from '@application/integrationUseCases/getSyncLogsUseCase';
import { GetUnmatchedSkusUseCase } from '@application/integrationUseCases/getUnmatchedSkusUseCase';
import { RetrySyncUseCase } from '@application/integrationUseCases/retrySyncUseCase';
import { RetryAllFailedSyncsUseCase } from '@application/integrationUseCases/retryAllFailedSyncsUseCase';
import { VtexTestConnectionUseCase } from '../../../integrations/vtex/application/vtexTestConnectionUseCase.js';
import { VtexPollOrdersUseCase } from '../../../integrations/vtex/application/vtexPollOrdersUseCase.js';
import { VtexSyncOrderUseCase } from '../../../integrations/vtex/application/vtexSyncOrderUseCase.js';
import { VtexRegisterWebhookUseCase } from '../../../integrations/vtex/application/vtexRegisterWebhookUseCase.js';
import { MeliTestConnectionUseCase } from '../../../integrations/mercadolibre/application/meliTestConnectionUseCase.js';
import { MeliPollOrdersUseCase } from '../../../integrations/mercadolibre/application/meliPollOrdersUseCase.js';
import { MeliSyncOrderUseCase } from '../../../integrations/mercadolibre/application/meliSyncOrderUseCase.js';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(
    private readonly createConnectionUseCase: CreateIntegrationConnectionUseCase,
    private readonly getConnectionsUseCase: GetIntegrationConnectionsUseCase,
    private readonly getConnectionByIdUseCase: GetIntegrationConnectionByIdUseCase,
    private readonly updateConnectionUseCase: UpdateIntegrationConnectionUseCase,
    private readonly deleteConnectionUseCase: DeleteIntegrationConnectionUseCase,
    private readonly createSkuMappingUseCase: CreateSkuMappingUseCase,
    private readonly deleteSkuMappingUseCase: DeleteSkuMappingUseCase,
    private readonly getSkuMappingsUseCase: GetSkuMappingsUseCase,
    private readonly getSyncLogsUseCase: GetSyncLogsUseCase,
    private readonly getUnmatchedSkusUseCase: GetUnmatchedSkusUseCase,
    private readonly retrySyncUseCase: RetrySyncUseCase,
    private readonly retryAllFailedSyncsUseCase: RetryAllFailedSyncsUseCase,
    private readonly vtexTestConnectionUseCase: VtexTestConnectionUseCase,
    private readonly vtexPollOrdersUseCase: VtexPollOrdersUseCase,
    private readonly vtexSyncOrderUseCase: VtexSyncOrderUseCase,
    private readonly vtexRegisterWebhookUseCase: VtexRegisterWebhookUseCase,
    private readonly meliTestConnectionUseCase: MeliTestConnectionUseCase,
    private readonly meliPollOrdersUseCase: MeliPollOrdersUseCase,
    private readonly meliSyncOrderUseCase: MeliSyncOrderUseCase
  ) {}

  // --- Connection CRUD ---

  @Get('connections')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_READ)
  @ApiOperation({ summary: 'Get all integration connections' })
  @ApiQuery({ name: 'provider', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: HttpStatus.OK, description: 'Connections retrieved successfully' })
  async getConnections(
    @Query('provider') provider: string | undefined,
    @Query('status') status: string | undefined,
    @OrgId() orgId: string
  ) {
    this.logger.log('Getting integration connections', { orgId });
    const result = await this.getConnectionsUseCase.execute({ orgId, provider, status });
    return resultToHttpResponse(result);
  }

  @Get('connections/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_READ)
  @ApiOperation({ summary: 'Get integration connection by ID' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Connection retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async getConnectionById(@Param('id') connectionId: string, @OrgId() orgId: string) {
    this.logger.log('Getting connection by ID', { connectionId, orgId });
    const result = await this.getConnectionByIdUseCase.execute({ connectionId, orgId });
    return resultToHttpResponse(result);
  }

  @Post('connections')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_CREATE)
  @ApiOperation({ summary: 'Create a new integration connection' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Connection created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Connection already exists' })
  async createConnection(
    @Body()
    dto: {
      provider: string;
      accountName: string;
      storeName: string;
      appKey: string;
      appToken: string;
      syncStrategy?: string;
      syncDirection?: string;
      defaultWarehouseId: string;
      defaultContactId?: string;
      companyId?: string;
    },
    @OrgId() orgId: string
  ) {
    this.logger.log('Creating integration connection', { provider: dto.provider, orgId });
    const result = await this.createConnectionUseCase.execute({
      ...dto,
      createdBy: 'system', // Will be replaced by authenticated user
      orgId,
    });
    return resultToHttpResponse(result);
  }

  @Put('connections/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_UPDATE)
  @ApiOperation({ summary: 'Update an integration connection' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Connection updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async updateConnection(
    @Param('id') connectionId: string,
    @Body()
    dto: {
      storeName?: string;
      appKey?: string;
      appToken?: string;
      syncStrategy?: string;
      syncDirection?: string;
      defaultWarehouseId?: string;
      defaultContactId?: string;
      companyId?: string;
    },
    @OrgId() orgId: string
  ) {
    this.logger.log('Updating integration connection', { connectionId, orgId });
    const result = await this.updateConnectionUseCase.execute({
      connectionId,
      orgId,
      ...dto,
    });
    return resultToHttpResponse(result);
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_DELETE)
  @ApiOperation({ summary: 'Delete an integration connection' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Connection deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async deleteConnection(@Param('id') connectionId: string, @OrgId() orgId: string) {
    this.logger.log('Deleting integration connection', { connectionId, orgId });
    const result = await this.deleteConnectionUseCase.execute({ connectionId, orgId });
    return resultToHttpResponse(result);
  }

  // --- Connection Actions ---

  @Post('connections/:id/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Test integration connection' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  async testConnection(@Param('id') connectionId: string, @OrgId() orgId: string) {
    this.logger.log('Testing connection', { connectionId, orgId });
    const connection = await this.getConnectionByIdUseCase.execute({ connectionId, orgId });
    const provider = connection.isOk() ? connection.unwrap().data?.provider : undefined;

    if (provider === 'MERCADOLIBRE') {
      const result = await this.meliTestConnectionUseCase.execute({ connectionId, orgId });
      return resultToHttpResponse(result);
    }

    const result = await this.vtexTestConnectionUseCase.execute({ connectionId, orgId });
    return resultToHttpResponse(result);
  }

  @Post('connections/:id/sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Trigger manual sync for a connection' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  async syncConnection(@Param('id') connectionId: string, @OrgId() orgId: string) {
    this.logger.log('Manually syncing connection', { connectionId, orgId });
    const connection = await this.getConnectionByIdUseCase.execute({ connectionId, orgId });
    const provider = connection.isOk() ? connection.unwrap().data?.provider : undefined;

    if (provider === 'MERCADOLIBRE') {
      const result = await this.meliPollOrdersUseCase.execute({ connectionId, orgId });
      return resultToHttpResponse(result);
    }

    const result = await this.vtexPollOrdersUseCase.execute({ connectionId, orgId });
    return resultToHttpResponse(result);
  }

  @Post('connections/:id/sync/:orderId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Sync a specific external order' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  @ApiParam({ name: 'orderId', description: 'External order ID' })
  async syncOrder(
    @Param('id') connectionId: string,
    @Param('orderId') externalOrderId: string,
    @OrgId() orgId: string
  ) {
    this.logger.log('Syncing specific order', { connectionId, externalOrderId, orgId });
    const connection = await this.getConnectionByIdUseCase.execute({ connectionId, orgId });
    const provider = connection.isOk() ? connection.unwrap().data?.provider : undefined;

    if (provider === 'MERCADOLIBRE') {
      const result = await this.meliSyncOrderUseCase.execute({
        connectionId,
        externalOrderId,
        orgId,
      });
      return resultToHttpResponse(result);
    }

    const result = await this.vtexSyncOrderUseCase.execute({
      connectionId,
      externalOrderId,
      orgId,
    });
    return resultToHttpResponse(result);
  }

  @Post('connections/:id/register-webhook')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Register webhook in VTEX' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  async registerWebhook(
    @Param('id') connectionId: string,
    @Body() dto: { webhookBaseUrl: string },
    @OrgId() orgId: string
  ) {
    this.logger.log('Registering webhook', { connectionId, orgId });
    const result = await this.vtexRegisterWebhookUseCase.execute({
      connectionId,
      webhookBaseUrl: dto.webhookBaseUrl,
      orgId,
    });
    return resultToHttpResponse(result);
  }

  // --- SKU Mappings ---

  @Get('connections/:id/sku-mappings')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_READ)
  @ApiOperation({ summary: 'Get SKU mappings for a connection' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  async getSkuMappings(@Param('id') connectionId: string, @OrgId() orgId: string) {
    this.logger.log('Getting SKU mappings', { connectionId, orgId });
    const result = await this.getSkuMappingsUseCase.execute({ connectionId, orgId });
    return resultToHttpResponse(result);
  }

  @Post('connections/:id/sku-mappings')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_CREATE)
  @ApiOperation({ summary: 'Create a SKU mapping' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  async createSkuMapping(
    @Param('id') connectionId: string,
    @Body() dto: { externalSku: string; productId: string },
    @OrgId() orgId: string
  ) {
    this.logger.log('Creating SKU mapping', { connectionId, ...dto, orgId });
    const result = await this.createSkuMappingUseCase.execute({
      connectionId,
      externalSku: dto.externalSku,
      productId: dto.productId,
      orgId,
    });
    return resultToHttpResponse(result);
  }

  @Delete('connections/:id/sku-mappings/:mappingId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_DELETE)
  @ApiOperation({ summary: 'Delete a SKU mapping' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  @ApiParam({ name: 'mappingId', description: 'SKU mapping ID' })
  async deleteSkuMapping(
    @Param('id') connectionId: string,
    @Param('mappingId') mappingId: string,
    @OrgId() orgId: string
  ) {
    this.logger.log('Deleting SKU mapping', { connectionId, mappingId, orgId });
    const result = await this.deleteSkuMappingUseCase.execute({
      mappingId,
      connectionId,
      orgId,
    });
    return resultToHttpResponse(result);
  }

  // --- Sync Logs ---

  @Get('connections/:id/logs')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_READ)
  @ApiOperation({ summary: 'Get sync logs for a connection' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sync logs retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Connection not found' })
  async getSyncLogs(
    @Param('id') connectionId: string,
    @Query('action') action: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @OrgId() orgId: string
  ) {
    this.logger.log('Getting sync logs', { connectionId, orgId });
    const result = await this.getSyncLogsUseCase.execute({
      connectionId,
      orgId,
      action,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return resultToHttpResponse(result);
  }

  // --- Unmatched SKUs & Retry ---

  @Get('connections/:id/unmatched')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_READ)
  @ApiOperation({ summary: 'Get unmatched/failed syncs' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  async getUnmatchedSkus(@Param('id') connectionId: string, @OrgId() orgId: string) {
    this.logger.log('Getting unmatched SKUs', { connectionId, orgId });
    const result = await this.getUnmatchedSkusUseCase.execute({ connectionId, orgId });
    return resultToHttpResponse(result);
  }

  @Post('connections/:id/retry/:syncLogId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Retry a failed sync' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  @ApiParam({ name: 'syncLogId', description: 'Sync log ID to retry' })
  async retrySync(
    @Param('id') connectionId: string,
    @Param('syncLogId') syncLogId: string,
    @OrgId() orgId: string
  ) {
    this.logger.log('Retrying sync', { connectionId, syncLogId, orgId });
    const result = await this.retrySyncUseCase.execute({ syncLogId, connectionId, orgId });
    return resultToHttpResponse(result);
  }

  @Post('connections/:id/retry-all')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.INTEGRATIONS_SYNC)
  @ApiOperation({ summary: 'Retry all failed syncs for a connection' })
  @ApiParam({ name: 'id', description: 'Connection ID' })
  async retryAllFailedSyncs(@Param('id') connectionId: string, @OrgId() orgId: string) {
    this.logger.log('Retrying all failed syncs', { connectionId, orgId });
    const result = await this.retryAllFailedSyncsUseCase.execute({ connectionId, orgId });
    return resultToHttpResponse(result);
  }
}
