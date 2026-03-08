import { CreateContactUseCase } from '@application/contactUseCases/createContactUseCase';
import { DeleteContactUseCase } from '@application/contactUseCases/deleteContactUseCase';
import { GetContactsUseCase } from '@application/contactUseCases/getContactsUseCase';
import { GetContactByIdUseCase } from '@application/contactUseCases/getContactByIdUseCase';
import { UpdateContactUseCase } from '@application/contactUseCases/updateContactUseCase';
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
import { CreateContactDto, GetContactsQueryDto, UpdateContactDto } from '@contacts/dto';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { AuditInterceptor } from '@shared/interceptors/audit.interceptor';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@UseInterceptors(AuditInterceptor)
@ApiBearerAuth()
export class ContactsController {
  private readonly logger = new Logger(ContactsController.name);

  constructor(
    private readonly getContactsUseCase: GetContactsUseCase,
    private readonly getContactByIdUseCase: GetContactByIdUseCase,
    private readonly createContactUseCase: CreateContactUseCase,
    private readonly updateContactUseCase: UpdateContactUseCase,
    private readonly deleteContactUseCase: DeleteContactUseCase
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.CONTACTS_READ)
  @ApiOperation({ summary: 'Get all contacts' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['CUSTOMER', 'SUPPLIER'] })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'identification', 'type', 'isActive', 'createdAt', 'updatedAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contacts retrieved successfully' })
  async getContacts(@Query() query: GetContactsQueryDto, @OrgId() orgId: string) {
    this.logger.log('Getting contacts', { orgId, ...query });

    const result = await this.getContactsUseCase.execute({
      orgId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      type: query.type,
      isActive: query.isActive,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    return resultToHttpResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.CONTACTS_READ)
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contact retrieved successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
  async getContactById(@Param('id') contactId: string, @OrgId() orgId: string) {
    this.logger.log('Getting contact by ID', { contactId, orgId });

    const result = await this.getContactByIdUseCase.execute({ contactId, orgId });
    return resultToHttpResponse(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(SYSTEM_PERMISSIONS.CONTACTS_CREATE)
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Contact created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Validation failed' })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Contact identification already exists',
  })
  async createContact(@Body() dto: CreateContactDto, @OrgId() orgId: string) {
    this.logger.log('Creating contact', { name: dto.name, orgId });

    const result = await this.createContactUseCase.execute({
      name: dto.name,
      identification: dto.identification,
      type: dto.type,
      address: dto.address,
      notes: dto.notes,
      orgId,
    });

    return resultToHttpResponse(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.CONTACTS_UPDATE)
  @ApiOperation({ summary: 'Update a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contact updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
  async updateContact(
    @Param('id') contactId: string,
    @Body() dto: UpdateContactDto,
    @OrgId() orgId: string
  ) {
    this.logger.log('Updating contact', { contactId, orgId });

    const result = await this.updateContactUseCase.execute({
      contactId,
      orgId,
      name: dto.name,
      identification: dto.identification,
      type: dto.type,
      address: dto.address,
      notes: dto.notes,
      isActive: dto.isActive,
    });

    return resultToHttpResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(SYSTEM_PERMISSIONS.CONTACTS_DELETE)
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiParam({ name: 'id', description: 'Contact ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contact deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Contact has associated sales',
  })
  async deleteContact(@Param('id') contactId: string, @OrgId() orgId: string) {
    this.logger.log('Deleting contact', { contactId, orgId });

    const result = await this.deleteContactUseCase.execute({ contactId, orgId });
    return resultToHttpResponse(result);
  }
}
