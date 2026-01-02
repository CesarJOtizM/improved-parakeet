# Checklist de Cobertura de Tests - 90% Cobertura Global

**Objetivo**: Alcanzar 90% de cobertura en todas las métricas (statements, branches, lines, functions)

**Estado Actual**: ~64% cobertura | **Objetivo**: 90% cobertura

**Total de archivos a testear**: 279 archivos

---

## 📊 Progreso General

- **Total de archivos**: 279
- **Tests creados**: 65
- **Tests implementados**: 65
- **Progreso**: ~23%

---

## Fase 1: Application Layer - Use Cases (Prioridad Alta)

### Audit Use Cases (4 archivos) ✅
- [x] `src/application/auditUseCases/getAuditLogUseCase.ts` → `test/application/auditUseCases/getAuditLogUseCase.spec.ts`
- [x] `src/application/auditUseCases/getAuditLogsUseCase.ts` → `test/application/auditUseCases/getAuditLogsUseCase.spec.ts`
- [x] `src/application/auditUseCases/getEntityHistoryUseCase.ts` → `test/application/auditUseCases/getEntityHistoryUseCase.spec.ts`
- [x] `src/application/auditUseCases/getUserActivityUseCase.ts` → `test/application/auditUseCases/getUserActivityUseCase.spec.ts`

### Auth Use Cases (7 archivos) ✅
- [x] `src/application/authUseCases/loginUseCase.ts` → `test/application/authUseCases/loginUseCase.spec.ts`
- [x] `src/application/authUseCases/logoutUseCase.ts` → `test/application/authUseCases/logoutUseCase.spec.ts`
- [x] `src/application/authUseCases/refreshTokenUseCase.ts` → `test/application/authUseCases/refreshTokenUseCase.spec.ts`
- [x] `src/application/authUseCases/registerUserUseCase.ts` → `test/application/authUseCases/registerUserUseCase.spec.ts`
- [x] `src/application/authUseCases/requestPasswordResetUseCase.ts` → `test/application/authUseCases/requestPasswordResetUseCase.spec.ts`
- [x] `src/application/authUseCases/resetPasswordUseCase.ts` → `test/application/authUseCases/resetPasswordUseCase.spec.ts`
- [x] `src/application/authUseCases/verifyOtpUseCase.ts` → `test/application/authUseCases/verifyOtpUseCase.spec.ts`

### Import Use Cases (8 archivos)
- [ ] `src/application/importUseCases/createImportBatchUseCase.ts` → `test/application/importUseCases/createImportBatchUseCase.spec.ts`
- [ ] `src/application/importUseCases/downloadErrorReportUseCase.ts` → `test/application/importUseCases/downloadErrorReportUseCase.spec.ts`
- [ ] `src/application/importUseCases/downloadImportTemplateUseCase.ts` → `test/application/importUseCases/downloadImportTemplateUseCase.spec.ts`
- [ ] `src/application/importUseCases/executeImportUseCase.ts` → `test/application/importUseCases/executeImportUseCase.spec.ts`
- [ ] `src/application/importUseCases/getImportStatusUseCase.ts` → `test/application/importUseCases/getImportStatusUseCase.spec.ts`
- [ ] `src/application/importUseCases/previewImportUseCase.ts` → `test/application/importUseCases/previewImportUseCase.spec.ts`
- [ ] `src/application/importUseCases/processImportUseCase.ts` → `test/application/importUseCases/processImportUseCase.spec.ts`
- [ ] `src/application/importUseCases/validateImportUseCase.ts` → `test/application/importUseCases/validateImportUseCase.spec.ts`

### Movement Use Cases (3 archivos)
- [ ] `src/application/movementUseCases/createMovementUseCase.ts` → `test/application/movementUseCases/createMovementUseCase.spec.ts`
- [ ] `src/application/movementUseCases/getMovementsUseCase.ts` → `test/application/movementUseCases/getMovementsUseCase.spec.ts`
- [ ] `src/application/movementUseCases/postMovementUseCase.ts` → `test/application/movementUseCases/postMovementUseCase.spec.ts`

### Product Use Cases (5 archivos)
- [ ] `src/application/productUseCases/createProductUseCase.ts` → `test/application/productUseCases/createProductUseCase.spec.ts`
- [ ] `src/application/productUseCases/getProductByIdUseCase.ts` → `test/application/productUseCases/getProductByIdUseCase.spec.ts`
- [ ] `src/application/productUseCases/getProductsUseCase.ts` → `test/application/productUseCases/getProductsUseCase.spec.ts`
- [ ] `src/application/productUseCases/updateProductUseCase.ts` → `test/application/productUseCases/updateProductUseCase.spec.ts`

### Report Use Cases (7 archivos) - 4/7 completados
- [ ] `src/application/reportUseCases/createReportTemplateUseCase.ts` → `test/application/reportUseCases/createReportTemplateUseCase.spec.ts`
- [x] `src/application/reportUseCases/exportReportUseCase.ts` → `test/application/reportUseCases/exportReportUseCase.spec.ts`
- [ ] `src/application/reportUseCases/getReportTemplatesUseCase.ts` → `test/application/reportUseCases/getReportTemplatesUseCase.spec.ts`
- [x] `src/application/reportUseCases/getReportsUseCase.ts` → `test/application/reportUseCases/getReportsUseCase.spec.ts`
- [x] `src/application/reportUseCases/streamReportUseCase.ts` → `test/application/reportUseCases/streamReportUseCase.spec.ts`
- [x] `src/application/reportUseCases/updateReportTemplateUseCase.ts` → `test/application/reportUseCases/updateReportTemplateUseCase.spec.ts`
- [ ] `src/application/reportUseCases/viewReportUseCase.ts` → `test/application/reportUseCases/viewReportUseCase.spec.ts`

### Return Use Cases (10 archivos)
- [ ] `src/application/returnUseCases/addReturnLineUseCase.ts` → `test/application/returnUseCases/addReturnLineUseCase.spec.ts`
- [ ] `src/application/returnUseCases/cancelReturnUseCase.ts` → `test/application/returnUseCases/cancelReturnUseCase.spec.ts`
- [ ] `src/application/returnUseCases/confirmReturnUseCase.ts` → `test/application/returnUseCases/confirmReturnUseCase.spec.ts`
- [ ] `src/application/returnUseCases/createReturnUseCase.ts` → `test/application/returnUseCases/createReturnUseCase.spec.ts`
- [ ] `src/application/returnUseCases/getReturnByIdUseCase.ts` → `test/application/returnUseCases/getReturnByIdUseCase.spec.ts`
- [ ] `src/application/returnUseCases/getReturnsByMovementUseCase.ts` → `test/application/returnUseCases/getReturnsByMovementUseCase.spec.ts`
- [ ] `src/application/returnUseCases/getReturnsBySaleUseCase.ts` → `test/application/returnUseCases/getReturnsBySaleUseCase.spec.ts`
- [ ] `src/application/returnUseCases/getReturnsUseCase.ts` → `test/application/returnUseCases/getReturnsUseCase.spec.ts`
- [ ] `src/application/returnUseCases/removeReturnLineUseCase.ts` → `test/application/returnUseCases/removeReturnLineUseCase.spec.ts`
- [ ] `src/application/returnUseCases/updateReturnUseCase.ts` → `test/application/returnUseCases/updateReturnUseCase.spec.ts`

### Role Use Cases (6 archivos)
- [ ] `src/application/roleUseCases/assignPermissionsToRoleUseCase.ts` → `test/application/roleUseCases/assignPermissionsToRoleUseCase.spec.ts`
- [ ] `src/application/roleUseCases/createRoleUseCase.ts` → `test/application/roleUseCases/createRoleUseCase.spec.ts`
- [ ] `src/application/roleUseCases/deleteRoleUseCase.ts` → `test/application/roleUseCases/deleteRoleUseCase.spec.ts`
- [ ] `src/application/roleUseCases/getRoleUseCase.ts` → `test/application/roleUseCases/getRoleUseCase.spec.ts`
- [ ] `src/application/roleUseCases/getRolesUseCase.ts` → `test/application/roleUseCases/getRolesUseCase.spec.ts`
- [ ] `src/application/roleUseCases/updateRoleUseCase.ts` → `test/application/roleUseCases/updateRoleUseCase.spec.ts`

### Sale Use Cases (9 archivos)
- [ ] `src/application/saleUseCases/addSaleLineUseCase.ts` → `test/application/saleUseCases/addSaleLineUseCase.spec.ts`
- [ ] `src/application/saleUseCases/cancelSaleUseCase.ts` → `test/application/saleUseCases/cancelSaleUseCase.spec.ts`
- [ ] `src/application/saleUseCases/confirmSaleUseCase.ts` → `test/application/saleUseCases/confirmSaleUseCase.spec.ts`
- [ ] `src/application/saleUseCases/createSaleUseCase.ts` → `test/application/saleUseCases/createSaleUseCase.spec.ts`
- [ ] `src/application/saleUseCases/getSaleByIdUseCase.ts` → `test/application/saleUseCases/getSaleByIdUseCase.spec.ts`
- [ ] `src/application/saleUseCases/getSaleMovementUseCase.ts` → `test/application/saleUseCases/getSaleMovementUseCase.spec.ts`
- [ ] `src/application/saleUseCases/getSalesUseCase.ts` → `test/application/saleUseCases/getSalesUseCase.spec.ts`
- [ ] `src/application/saleUseCases/removeSaleLineUseCase.ts` → `test/application/saleUseCases/removeSaleLineUseCase.spec.ts`
- [ ] `src/application/saleUseCases/updateSaleUseCase.ts` → `test/application/saleUseCases/updateSaleUseCase.spec.ts`

### Transfer Use Cases (2 archivos)
- [ ] `src/application/transferUseCases/getTransfersUseCase.ts` → `test/application/transferUseCases/getTransfersUseCase.spec.ts`
- [ ] `src/application/transferUseCases/initiateTransferUseCase.ts` → `test/application/transferUseCases/initiateTransferUseCase.spec.ts`

### User Use Cases (7 archivos)
- [ ] `src/application/userUseCases/assignRoleToUserUseCase.ts` → `test/application/userUseCases/assignRoleToUserUseCase.spec.ts`
- [ ] `src/application/userUseCases/changeUserStatusUseCase.ts` → `test/application/userUseCases/changeUserStatusUseCase.spec.ts`
- [ ] `src/application/userUseCases/createUserUseCase.ts` → `test/application/userUseCases/createUserUseCase.spec.ts`
- [ ] `src/application/userUseCases/getUserUseCase.ts` → `test/application/userUseCases/getUserUseCase.spec.ts`
- [ ] `src/application/userUseCases/getUsersUseCase.ts` → `test/application/userUseCases/getUsersUseCase.spec.ts`
- [ ] `src/application/userUseCases/removeRoleFromUserUseCase.ts` → `test/application/userUseCases/removeRoleFromUserUseCase.spec.ts`
- [ ] `src/application/userUseCases/updateUserUseCase.ts` → `test/application/userUseCases/updateUserUseCase.spec.ts`

### Warehouse Use Cases (2 archivos)
- [ ] `src/application/warehouseUseCases/createWarehouseUseCase.ts` → `test/application/warehouseUseCases/createWarehouseUseCase.spec.ts`
- [ ] `src/application/warehouseUseCases/getWarehousesUseCase.ts` → `test/application/warehouseUseCases/getWarehousesUseCase.spec.ts`

### Organization Use Cases (1 archivo)
- [ ] `src/application/organizationUseCases/createOrganizationUseCase.ts` → `test/application/organizationUseCases/createOrganizationUseCase.spec.ts`

### Event Handlers (18 archivos) ✅
- [x] `src/application/eventHandlers/locationAddedEventHandler.ts` → `test/application/eventHandlers/locationAddedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/lowStockAlertEventHandler.ts` → `test/application/eventHandlers/lowStockAlertEventHandler.spec.ts`
- [x] `src/application/eventHandlers/movementPostedAuditHandler.ts` → `test/application/eventHandlers/movementPostedAuditHandler.spec.ts`
- [x] `src/application/eventHandlers/movementPostedEventHandler.ts` → `test/application/eventHandlers/movementPostedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/movementVoidedAuditHandler.ts` → `test/application/eventHandlers/movementVoidedAuditHandler.spec.ts`
- [x] `src/application/eventHandlers/permissionChangedEventHandler.ts` → `test/application/eventHandlers/permissionChangedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/productCreatedEventHandler.ts` → `test/application/eventHandlers/productCreatedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/productUpdatedEventHandler.ts` → `test/application/eventHandlers/productUpdatedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/roleAssignedEventHandler.ts` → `test/application/eventHandlers/roleAssignedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/saleCancelledEventHandler.ts` → `test/application/eventHandlers/saleCancelledEventHandler.spec.ts`
- [x] `src/application/eventHandlers/saleConfirmedEventHandler.ts` → `test/application/eventHandlers/saleConfirmedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/saleCreatedEventHandler.ts` → `test/application/eventHandlers/saleCreatedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/stockThresholdExceededEventHandler.ts` → `test/application/eventHandlers/stockThresholdExceededEventHandler.spec.ts`
- [x] `src/application/eventHandlers/transferInitiatedAuditHandler.ts` → `test/application/eventHandlers/transferInitiatedAuditHandler.spec.ts`
- [x] `src/application/eventHandlers/transferReceivedAuditHandler.ts` → `test/application/eventHandlers/transferReceivedAuditHandler.spec.ts`
- [x] `src/application/eventHandlers/transferRejectedAuditHandler.ts` → `test/application/eventHandlers/transferRejectedAuditHandler.spec.ts`
- [x] `src/application/eventHandlers/userStatusChangedEventHandler.ts` → `test/application/eventHandlers/userStatusChangedEventHandler.spec.ts`
- [x] `src/application/eventHandlers/warehouseCreatedEventHandler.ts` → `test/application/eventHandlers/warehouseCreatedEventHandler.spec.ts`

### Health Check Application Service (1 archivo)
- [ ] `src/application/healthCheck/healthCheck.application.service.ts` → `test/application/healthCheck/healthCheck.application.service.spec.ts`

**Total Fase 1: 83 archivos**

---

## Fase 2: Domain Layer (Prioridad Alta)

### Authentication Domain Services (8 archivos)
- [ ] `src/authentication/domain/services/authenticationService.ts` → `test/authentication/domain/services/authenticationService.spec.ts`
- [ ] `src/authentication/domain/services/authorizationService.ts` → `test/authentication/domain/services/authorizationService.spec.ts`
- [ ] `src/authentication/domain/services/jwtService.ts` → `test/authentication/domain/services/jwtService.spec.ts`
- [ ] `src/authentication/domain/services/otpCleanupService.ts` → `test/authentication/domain/services/otpCleanupService.spec.ts`
- [ ] `src/authentication/domain/services/rateLimitService.ts` → `test/authentication/domain/services/rateLimitService.spec.ts`
- [ ] `src/authentication/domain/services/roleAssignmentService.ts` → `test/authentication/domain/services/roleAssignmentService.spec.ts`
- [ ] `src/authentication/domain/services/tokenBlacklistService.ts` → `test/authentication/domain/services/tokenBlacklistService.spec.ts`
- [ ] `src/authentication/domain/services/userManagementService.ts` → `test/authentication/domain/services/userManagementService.spec.ts`

### Inventory Domain Services (13 archivos) - 1/13 completados
- [ ] `src/inventory/movements/domain/services/ppmService.ts` → `test/inventory/movements/domain/services/ppmService.spec.ts`
- [ ] `src/inventory/products/domain/services/pricing.service.ts` → `test/inventory/products/domain/services/pricing.service.spec.ts`
- [ ] `src/inventory/products/domain/services/productBusinessRules.service.ts` → `test/inventory/products/domain/services/productBusinessRules.service.spec.ts`
- [ ] `src/inventory/products/domain/services/productValidation.service.ts` → `test/inventory/products/domain/services/productValidation.service.spec.ts`
- [ ] `src/inventory/stock/domain/services/alertService.ts` → `test/inventory/stock/domain/services/alertService.spec.ts`
- [ ] `src/inventory/stock/domain/services/inventoryCalculation.service.ts` → `test/inventory/stock/domain/services/inventoryCalculation.service.spec.ts`
- [ ] `src/inventory/stock/domain/services/mandatoryAuditRule.service.ts` → `test/inventory/stock/domain/services/mandatoryAuditRule.service.spec.ts`
- [ ] `src/inventory/stock/domain/services/noNegativeStockRule.service.ts` → `test/inventory/stock/domain/services/noNegativeStockRule.service.spec.ts`
- [ ] `src/inventory/stock/domain/services/stockValidation.service.ts` → `test/inventory/stock/domain/services/stockValidation.service.spec.ts`
- [ ] `src/inventory/transfers/domain/services/transferValidation.service.ts` → `test/inventory/transfers/domain/services/transferValidation.service.spec.ts`
- [x] `src/inventory/transfers/domain/services/transferWorkflow.service.ts` → `test/inventory/transfers/domain/services/transferWorkflow.service.spec.ts`
- [ ] `src/inventory/warehouses/domain/services/warehouseAssignment.service.ts` → `test/inventory/warehouses/domain/services/warehouseAssignment.service.spec.ts`
- [ ] `src/inventory/warehouses/domain/services/warehouseBusinessRules.service.ts` → `test/inventory/warehouses/domain/services/warehouseBusinessRules.service.spec.ts`

### Import Domain Services (4 archivos)
- [ ] `src/import/domain/services/importErrorReport.service.ts` → `test/import/domain/services/importErrorReport.service.spec.ts`
- [ ] `src/import/domain/services/importProcessing.service.ts` → `test/import/domain/services/importProcessing.service.spec.ts`
- [ ] `src/import/domain/services/importTemplate.service.ts` → `test/import/domain/services/importTemplate.service.spec.ts`
- [ ] `src/import/domain/services/importValidation.service.ts` → `test/import/domain/services/importValidation.service.spec.ts`

### Returns Domain Services (4 archivos) - 1/4 completados
- [ ] `src/returns/domain/services/inventoryIntegration.service.ts` → `test/returns/domain/services/inventoryIntegration.service.spec.ts`
- [x] `src/returns/domain/services/returnCalculation.service.ts` → `test/returns/domain/services/returnCalculation.service.spec.ts`
- [ ] `src/returns/domain/services/returnNumberGeneration.service.ts` → `test/returns/domain/services/returnNumberGeneration.service.spec.ts`
- [ ] `src/returns/domain/services/returnValidation.service.ts` → `test/returns/domain/services/returnValidation.service.spec.ts`

### Sales Domain Services (4 archivos) - 1/4 completados
- [ ] `src/sales/domain/services/inventoryIntegration.service.ts` → `test/sales/domain/services/inventoryIntegration.service.spec.ts`
- [x] `src/sales/domain/services/saleCalculation.service.ts` → `test/sales/domain/services/saleCalculation.service.spec.ts`
- [ ] `src/sales/domain/services/saleNumberGeneration.service.ts` → `test/sales/domain/services/saleNumberGeneration.service.spec.ts`
- [ ] `src/sales/domain/services/saleValidation.service.ts` → `test/sales/domain/services/saleValidation.service.spec.ts`

### Report Domain Services (4 archivos)
- [ ] `src/report/domain/services/export.service.ts` → `test/report/domain/services/export.service.spec.ts`
- [ ] `src/report/domain/services/reportCache.service.ts` → `test/report/domain/services/reportCache.service.spec.ts`
- [ ] `src/report/domain/services/reportGeneration.service.ts` → `test/report/domain/services/reportGeneration.service.spec.ts`
- [ ] `src/report/domain/services/reportView.service.ts` → `test/report/domain/services/reportView.service.spec.ts`

### Audit Domain Services (1 archivo)
- [ ] `src/shared/audit/domain/services/auditService.ts` → `test/shared/audit/domain/services/auditService.spec.ts`

**Total Fase 2 - Domain Services: 38 archivos**

### Domain Entities

#### Authentication Entities (5 archivos)
- [ ] `src/authentication/domain/entities/otp.entity.ts` → `test/authentication/domain/entities/otp.entity.spec.ts`
- [ ] `src/authentication/domain/entities/permission.entity.ts` → `test/authentication/domain/entities/permission.entity.spec.ts`
- [ ] `src/authentication/domain/entities/role.entity.ts` → `test/authentication/domain/entities/role.entity.spec.ts`
- [ ] `src/authentication/domain/entities/session.entity.ts` → `test/authentication/domain/entities/session.entity.spec.ts`
- [ ] `src/authentication/domain/entities/user.entity.ts` → `test/authentication/domain/entities/user.entity.spec.ts`

#### Inventory Entities (10 archivos) - 2/10 completados
- [ ] `src/inventory/movements/domain/entities/movement.entity.ts` → `test/inventory/movements/domain/entities/movement.entity.spec.ts`
- [ ] `src/inventory/movements/domain/entities/movementLine.entity.ts` → `test/inventory/movements/domain/entities/movementLine.entity.spec.ts`
- [x] `src/inventory/products/domain/entities/category.entity.ts` → `test/inventory/products/domain/entities/category.entity.spec.ts`
- [ ] `src/inventory/products/domain/entities/product.entity.ts` → `test/inventory/products/domain/entities/product.entity.spec.ts`
- [x] `src/inventory/products/domain/entities/unit.entity.ts` → `test/inventory/products/domain/entities/unit.entity.spec.ts`
- [ ] `src/inventory/stock/domain/entities/reorderRule.entity.ts` → `test/inventory/stock/domain/entities/reorderRule.entity.spec.ts`
- [ ] `src/inventory/transfers/domain/entities/transfer.entity.ts` → `test/inventory/transfers/domain/entities/transfer.entity.spec.ts`
- [ ] `src/inventory/transfers/domain/entities/transferLine.entity.ts` → `test/inventory/transfers/domain/entities/transferLine.entity.spec.ts`
- [ ] `src/inventory/warehouses/domain/entities/location.entity.ts` → `test/inventory/warehouses/domain/entities/location.entity.spec.ts`
- [ ] `src/inventory/warehouses/domain/entities/warehouse.entity.ts` → `test/inventory/warehouses/domain/entities/warehouse.entity.spec.ts`

#### Returns Entities (2 archivos)
- [ ] `src/returns/domain/entities/return.entity.ts` → `test/returns/domain/entities/return.entity.spec.ts`
- [ ] `src/returns/domain/entities/returnLine.entity.ts` → `test/returns/domain/entities/returnLine.entity.spec.ts`

#### Sales Entities (2 archivos)
- [ ] `src/sales/domain/entities/sale.entity.ts` → `test/sales/domain/entities/sale.entity.spec.ts`
- [ ] `src/sales/domain/entities/saleLine.entity.ts` → `test/sales/domain/entities/saleLine.entity.spec.ts`

#### Import Entities (2 archivos)
- [ ] `src/import/domain/entities/importBatch.entity.ts` → `test/import/domain/entities/importBatch.entity.spec.ts`
- [ ] `src/import/domain/entities/importRow.entity.ts` → `test/import/domain/entities/importRow.entity.spec.ts`

#### Report Entities (2 archivos)
- [ ] `src/report/domain/entities/report.entity.ts` → `test/report/domain/entities/report.entity.spec.ts`
- [ ] `src/report/domain/entities/reportTemplate.entity.ts` → `test/report/domain/entities/reportTemplate.entity.spec.ts`

#### Organization Entities (1 archivo)
- [ ] `src/organization/domain/entities/organization.entity.ts` → `test/organization/domain/entities/organization.entity.spec.ts`

#### Audit Entities (1 archivo)
- [ ] `src/shared/audit/domain/entities/auditLog.entity.ts` → `test/shared/audit/domain/entities/auditLog.entity.spec.ts`

**Total Fase 2 - Domain Entities: 25 archivos**

### Value Objects

#### Authentication Value Objects (6 archivos)
- [ ] `src/authentication/domain/valueObjects/email.valueObject.ts` → `test/authentication/domain/valueObjects/email.valueObject.spec.ts`
- [ ] `src/authentication/domain/valueObjects/jwtToken.valueObject.ts` → `test/authentication/domain/valueObjects/jwtToken.valueObject.spec.ts`
- [ ] `src/authentication/domain/valueObjects/password.valueObject.ts` → `test/authentication/domain/valueObjects/password.valueObject.spec.ts`
- [ ] `src/authentication/domain/valueObjects/roleName.valueObject.ts` → `test/authentication/domain/valueObjects/roleName.valueObject.spec.ts`
- [ ] `src/authentication/domain/valueObjects/userStatus.valueObject.ts` → `test/authentication/domain/valueObjects/userStatus.valueObject.spec.ts`
- [ ] `src/authentication/domain/valueObjects/username.valueObject.ts` → `test/authentication/domain/valueObjects/username.valueObject.spec.ts`

#### Inventory Value Objects (múltiples - verificar todos)
- [ ] `src/inventory/movements/domain/valueObjects/movementStatus.valueObject.ts` → `test/inventory/movements/domain/valueObjects/movementStatus.valueObject.spec.ts`
- [ ] `src/inventory/movements/domain/valueObjects/movementType.valueObject.ts` → `test/inventory/movements/domain/valueObjects/movementType.valueObject.spec.ts`
- [ ] `src/inventory/movements/domain/valueObjects/unitCost.valueObject.ts` → `test/inventory/movements/domain/valueObjects/unitCost.valueObject.spec.ts`
- [ ] `src/inventory/products/domain/valueObjects/costMethod.valueObject.ts` → `test/inventory/products/domain/valueObjects/costMethod.valueObject.spec.ts`
- [ ] `src/inventory/products/domain/valueObjects/price.valueObject.ts` → `test/inventory/products/domain/valueObjects/price.valueObject.spec.ts`
- [ ] `src/inventory/products/domain/valueObjects/productName.valueObject.ts` → `test/inventory/products/domain/valueObjects/productName.valueObject.spec.ts`
- [ ] `src/inventory/products/domain/valueObjects/productStatus.valueObject.ts` → `test/inventory/products/domain/valueObjects/productStatus.valueObject.spec.ts`
- [ ] `src/inventory/products/domain/valueObjects/sku.valueObject.ts` → `test/inventory/products/domain/valueObjects/sku.valueObject.spec.ts`
- [ ] `src/inventory/products/domain/valueObjects/unit.valueObject.ts` → `test/inventory/products/domain/valueObjects/unit.valueObject.spec.ts`
- [ ] `src/inventory/stock/domain/valueObjects/maxQuantity.valueObject.ts` → `test/inventory/stock/domain/valueObjects/maxQuantity.valueObject.spec.ts`
- [ ] `src/inventory/stock/domain/valueObjects/minQuantity.valueObject.ts` → `test/inventory/stock/domain/valueObjects/minQuantity.valueObject.spec.ts`
- [ ] `src/inventory/stock/domain/valueObjects/money.valueObject.ts` → `test/inventory/stock/domain/valueObjects/money.valueObject.spec.ts`
- [ ] `src/inventory/stock/domain/valueObjects/quantity.valueObject.ts` → `test/inventory/stock/domain/valueObjects/quantity.valueObject.spec.ts`
- [ ] `src/inventory/stock/domain/valueObjects/safetyStock.valueObject.ts` → `test/inventory/stock/domain/valueObjects/safetyStock.valueObject.spec.ts`
- [x] `src/inventory/transfers/domain/valueObjects/transferDirection.valueObject.ts` → `test/inventory/transfers/domain/valueObjects/transferDirection.valueObject.spec.ts`
- [ ] `src/inventory/transfers/domain/valueObjects/transferStatus.valueObject.ts` → `test/inventory/transfers/domain/valueObjects/transferStatus.valueObject.spec.ts`
- [ ] `src/inventory/warehouses/domain/valueObjects/address.valueObject.ts` → `test/inventory/warehouses/domain/valueObjects/address.valueObject.spec.ts`
- [ ] `src/inventory/warehouses/domain/valueObjects/locationCode.valueObject.ts` → `test/inventory/warehouses/domain/valueObjects/locationCode.valueObject.spec.ts`
- [ ] `src/inventory/warehouses/domain/valueObjects/warehouseCode.valueObject.ts` → `test/inventory/warehouses/domain/valueObjects/warehouseCode.valueObject.spec.ts`

#### Import Value Objects (3 archivos)
- [ ] `src/import/domain/valueObjects/importStatus.valueObject.ts` → `test/import/domain/valueObjects/importStatus.valueObject.spec.ts`
- [ ] `src/import/domain/valueObjects/importType.valueObject.ts` → `test/import/domain/valueObjects/importType.valueObject.spec.ts`
- [ ] `src/import/domain/valueObjects/validationResult.valueObject.ts` → `test/import/domain/valueObjects/validationResult.valueObject.spec.ts`

#### Returns Value Objects (4 archivos)
- [ ] `src/returns/domain/valueObjects/returnNumber.valueObject.ts` → `test/returns/domain/valueObjects/returnNumber.valueObject.spec.ts`
- [ ] `src/returns/domain/valueObjects/returnReason.valueObject.ts` → `test/returns/domain/valueObjects/returnReason.valueObject.spec.ts`
- [ ] `src/returns/domain/valueObjects/returnStatus.valueObject.ts` → `test/returns/domain/valueObjects/returnStatus.valueObject.spec.ts`
- [ ] `src/returns/domain/valueObjects/returnType.valueObject.ts` → `test/returns/domain/valueObjects/returnType.valueObject.spec.ts`

#### Sales Value Objects (3 archivos)
- [ ] `src/sales/domain/valueObjects/saleNumber.valueObject.ts` → `test/sales/domain/valueObjects/saleNumber.valueObject.spec.ts`
- [ ] `src/sales/domain/valueObjects/salePrice.valueObject.ts` → `test/sales/domain/valueObjects/salePrice.valueObject.spec.ts`
- [ ] `src/sales/domain/valueObjects/saleStatus.valueObject.ts` → `test/sales/domain/valueObjects/saleStatus.valueObject.spec.ts`

#### Report Value Objects (4 archivos)
- [ ] `src/report/domain/valueObjects/reportFormat.valueObject.ts` → `test/report/domain/valueObjects/reportFormat.valueObject.spec.ts`
- [ ] `src/report/domain/valueObjects/reportParameters.valueObject.ts` → `test/report/domain/valueObjects/reportParameters.valueObject.spec.ts`
- [ ] `src/report/domain/valueObjects/reportStatus.valueObject.ts` → `test/report/domain/valueObjects/reportStatus.valueObject.spec.ts`
- [ ] `src/report/domain/valueObjects/reportType.valueObject.ts` → `test/report/domain/valueObjects/reportType.valueObject.spec.ts`

#### Audit Value Objects (3 archivos)
- [ ] `src/shared/audit/domain/valueObjects/auditAction.valueObject.ts` → `test/shared/audit/domain/valueObjects/auditAction.valueObject.spec.ts`
- [ ] `src/shared/audit/domain/valueObjects/auditMetadata.valueObject.ts` → `test/shared/audit/domain/valueObjects/auditMetadata.valueObject.spec.ts`
- [ ] `src/shared/audit/domain/valueObjects/entityType.valueObject.ts` → `test/shared/audit/domain/valueObjects/entityType.valueObject.spec.ts`

**Total Fase 2 - Value Objects: 46 archivos**

### Domain Specifications (6 archivos)
- [ ] `src/inventory/movements/domain/specifications/movementSpecifications.ts` → `test/inventory/movements/domain/specifications/movementSpecifications.spec.ts`
- [ ] `src/inventory/products/domain/specifications/productSpecifications.ts` → `test/inventory/products/domain/specifications/productSpecifications.spec.ts`
- [ ] `src/sales/domain/specifications/saleSpecifications.ts` → `test/sales/domain/specifications/saleSpecifications.spec.ts`
- [ ] `src/shared/audit/domain/specifications/auditLogSpecifications.ts` → `test/shared/audit/domain/specifications/auditLogSpecifications.spec.ts`
- [ ] `src/shared/domain/specifications/baseSpecification.ts` → `test/shared/domain/specifications/baseSpecification.spec.ts`
- [ ] `src/shared/domain/specifications/prismaSpecification.base.ts` → `test/shared/domain/specifications/prismaSpecification.base.spec.ts`

**Total Fase 2: 115 archivos**

---

## Fase 3: Infrastructure Layer (Prioridad Media)

### Repositories (18 archivos) - 1/18 completados
- [ ] `src/infrastructure/database/repositories/auditLog.repository.ts` → `test/infrastructure/database/repositories/auditLog.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/movement.repository.ts` → `test/infrastructure/database/repositories/movement.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/organization.repository.ts` → `test/infrastructure/database/repositories/organization.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/otp.repository.ts` → `test/infrastructure/database/repositories/otp.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/prismaImportBatchRepository.ts` → `test/infrastructure/database/repositories/prismaImportBatchRepository.spec.ts`
- [x] `src/infrastructure/database/repositories/product.repository.ts` → `test/infrastructure/database/repositories/product.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/reorderRule.repository.ts` → `test/infrastructure/database/repositories/reorderRule.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/report.repository.ts` → `test/infrastructure/database/repositories/report.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/reportTemplate.repository.ts` → `test/infrastructure/database/repositories/reportTemplate.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/role.repository.ts` → `test/infrastructure/database/repositories/role.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/sale.repository.ts` → `test/infrastructure/database/repositories/sale.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/session.repository.ts` → `test/infrastructure/database/repositories/session.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/transfer.repository.ts` → `test/infrastructure/database/repositories/transfer.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/user.repository.ts` → `test/infrastructure/database/repositories/user.repository.spec.ts`
- [ ] `src/infrastructure/database/repositories/warehouse.repository.ts` → `test/infrastructure/database/repositories/warehouse.repository.spec.ts`
- [ ] `src/infrastructure/database/services/base.repository.service.ts` → `test/infrastructure/database/services/base.repository.service.spec.ts`
- [ ] `src/infrastructure/database/utils/queryOptimizer.ts` → `test/infrastructure/database/utils/queryOptimizer.spec.ts`
- [ ] `src/infrastructure/database/utils/streamQuery.ts` → `test/infrastructure/database/utils/streamQuery.spec.ts`

### External Services (4 archivos)
- [ ] `src/infrastructure/externalServices/documentGenerationService.ts` → `test/infrastructure/externalServices/documentGenerationService.spec.ts`
- [ ] `src/infrastructure/externalServices/emailService.ts` → `test/infrastructure/externalServices/emailService.spec.ts`
- [ ] `src/infrastructure/externalServices/fileParsingService.ts` → `test/infrastructure/externalServices/fileParsingService.spec.ts`
- [ ] `src/infrastructure/externalServices/notificationService.ts` → `test/infrastructure/externalServices/notificationService.spec.ts`

### Jobs (1 archivo)
- [ ] `src/infrastructure/jobs/stockValidationJob.ts` → `test/infrastructure/jobs/stockValidationJob.spec.ts`

**Total Fase 3: 23 archivos**

---

## Fase 4: Shared Layer (Prioridad Media)

### Services (2 archivos) ✅
- [x] `src/shared/services/metrics.service.ts` → `test/shared/services/metrics.service.spec.ts`
- [x] `src/shared/services/structuredLogger.service.ts` → `test/shared/services/structuredLogger.service.spec.ts`

### Middlewares (3 archivos) - 2/3 completados
- [ ] `src/shared/middlewares/correlationId.middleware.ts` → `test/shared/middlewares/correlationId.middleware.spec.ts`
- [x] `src/interfaces/http/middlewares/clientIpMiddleware.ts` → `test/interfaces/http/middlewares/clientIpMiddleware.spec.ts`
- [x] `src/interfaces/http/middlewares/tenant.middleware.ts` → `test/interfaces/http/middlewares/tenant.middleware.spec.ts`

### Guards (4 archivos) - 3/4 completados
- [x] `src/shared/guards/permission.guard.ts` → `test/shared/guards/permission.guard.spec.ts`
- [ ] `src/authentication/security/guards/jwtAuthGuard.ts` → `test/authentication/security/guards/jwtAuthGuard.spec.ts`
- [x] `src/authentication/security/guards/permissionsGuard.ts` → `test/authentication/security/guards/permissionsGuard.spec.ts`
- [x] `src/authentication/security/guards/roleBasedAuthGuard.ts` → `test/authentication/security/guards/roleBasedAuthGuard.spec.ts`

### Interceptors (7 archivos) - 4/7 completados
- [ ] `src/shared/interceptors/audit.interceptor.ts` → `test/shared/interceptors/audit.interceptor.spec.ts`
- [x] `src/shared/interceptors/metrics.interceptor.ts` → `test/shared/interceptors/metrics.interceptor.spec.ts`
- [ ] `src/shared/interceptors/responseInterceptor.ts` → `test/shared/interceptors/responseInterceptor.spec.ts`
- [x] `src/authentication/security/interceptors/authenticationLoggingInterceptor.ts` → `test/authentication/security/interceptors/authenticationLoggingInterceptor.spec.ts`
- [x] `src/authentication/security/interceptors/authorizationLoggingInterceptor.ts` → `test/authentication/security/interceptors/authorizationLoggingInterceptor.spec.ts`
- [x] `src/authentication/security/interceptors/rateLimitInterceptor.ts` → `test/authentication/security/interceptors/rateLimitInterceptor.spec.ts`
- [ ] `src/report/interceptors/reportLogging.interceptor.ts` → `test/report/interceptors/reportLogging.interceptor.spec.ts`

### Filters (1 archivo) ✅
- [x] `src/shared/filters/globalExceptionFilter.ts` → `test/shared/filters/globalExceptionFilter.spec.ts`

### Utils (6 archivos) - 5/6 completados
- [x] `src/shared/utils/functional/compose.ts` → `test/shared/utils/functional/compose.spec.ts`
- [x] `src/shared/utils/functional/curry.ts` → `test/shared/utils/functional/curry.spec.ts`
- [x] `src/shared/utils/functional/helpers.ts` → `test/shared/utils/functional/helpers.spec.ts`
- [x] `src/shared/utils/functional/pipe.ts` → `test/shared/utils/functional/pipe.spec.ts`
- [x] `src/shared/utils/responseUtils.ts` → `test/shared/utils/responseUtils.spec.ts`
- [ ] `src/shared/utils/resultToHttp.ts` → `test/shared/utils/resultToHttp.spec.ts`

### Domain Base Classes (11 archivos) - 2/11 completados
- [ ] `src/shared/domain/base/aggregateRoot.base.ts` → `test/shared/domain/base/aggregateRoot.base.spec.ts`
- [ ] `src/shared/domain/base/entity.base.ts` → `test/shared/domain/base/entity.base.spec.ts`
- [ ] `src/shared/domain/base/valueObject.base.ts` → `test/shared/domain/base/valueObject.base.spec.ts`
- [ ] `src/shared/domain/events/domainEvent.base.ts` → `test/shared/domain/events/domainEvent.base.spec.ts`
- [x] `src/shared/domain/events/domainEventBus.service.ts` → `test/shared/domain/events/domainEventBus.service.spec.ts`
- [x] `src/shared/domain/events/domainEventDispatcher.service.ts` → `test/shared/domain/events/domainEventDispatcher.service.spec.ts`
- [ ] `src/shared/domain/result/domainError.ts` → `test/shared/domain/result/domainError.spec.ts`
- [ ] `src/shared/domain/result/err.ts` → `test/shared/domain/result/err.spec.ts`
- [ ] `src/shared/domain/result/ok.ts` → `test/shared/domain/result/ok.spec.ts`
- [ ] `src/shared/domain/result/result.ts` → `test/shared/domain/result/result.spec.ts`
- [ ] `src/shared/domain/result/resultUtils.ts` → `test/shared/domain/result/resultUtils.spec.ts`

### Mappers (7 archivos)
- [ ] `src/inventory/products/mappers/product.mapper.ts` → `test/inventory/products/mappers/product.mapper.spec.ts`
- [ ] `src/inventory/movements/mappers/movement.mapper.ts` → `test/inventory/movements/mappers/movement.mapper.spec.ts`
- [ ] `src/sales/mappers/sale.mapper.ts` → `test/sales/mappers/sale.mapper.spec.ts`
- [ ] `src/returns/mappers/return.mapper.ts` → `test/returns/mappers/return.mapper.spec.ts`
- [ ] `src/report/mappers/report.mapper.ts` → `test/report/mappers/report.mapper.spec.ts`
- [ ] `src/report/mappers/reportTemplate.mapper.ts` → `test/report/mappers/reportTemplate.mapper.spec.ts`

**Total Fase 4: 41 archivos**

---

## Fase 5: Interface Layer - Controllers (Prioridad Baja)

### Controllers (17 archivos) - 5/17 completados
- [ ] `src/interfaces/http/audit/audit.controller.ts` → `test/interfaces/http/audit/audit.controller.spec.ts`
- [ ] `src/interfaces/http/healthCheck/healthCheck.controller.ts` → `test/interfaces/http/healthCheck/healthCheck.controller.spec.ts`
- [ ] `src/interfaces/http/import/import.controller.ts` → `test/interfaces/http/import/import.controller.spec.ts`
- [x] `src/interfaces/http/inventory/movements.controller.ts` → `test/interfaces/http/inventory/movements.controller.spec.ts`
- [x] `src/interfaces/http/inventory/products.controller.ts` → `test/interfaces/http/inventory/products.controller.spec.ts`
- [ ] `src/interfaces/http/inventory/transfers.controller.ts` → `test/interfaces/http/inventory/transfers.controller.spec.ts`
- [ ] `src/interfaces/http/inventory/warehouses.controller.ts` → `test/interfaces/http/inventory/warehouses.controller.spec.ts`
- [ ] `src/interfaces/http/report/report.controller.ts` → `test/interfaces/http/report/report.controller.spec.ts`
- [ ] `src/interfaces/http/report/reportTemplate.controller.ts` → `test/interfaces/http/report/reportTemplate.controller.spec.ts`
- [x] `src/interfaces/http/returns/returns.controller.ts` → `test/interfaces/http/returns/returns.controller.spec.ts`
- [ ] `src/interfaces/http/routes/auth.controller.ts` → `test/interfaces/http/routes/auth.controller.spec.ts`
- [ ] `src/interfaces/http/routes/passwordReset.controller.ts` → `test/interfaces/http/routes/passwordReset.controller.spec.ts`
- [ ] `src/interfaces/http/routes/register.controller.ts` → `test/interfaces/http/routes/register.controller.spec.ts`
- [ ] `src/interfaces/http/routes/roles.controller.ts` → `test/interfaces/http/routes/roles.controller.spec.ts`
- [ ] `src/interfaces/http/routes/users.controller.ts` → `test/interfaces/http/routes/users.controller.spec.ts`
- [x] `src/interfaces/http/sales/sales.controller.ts` → `test/interfaces/http/sales/sales.controller.spec.ts`
- [x] `src/organization/organization.controller.ts` → `test/organization/organization.controller.spec.ts`

**Total Fase 5: 17 archivos**

---

## Resumen por Fase

| Fase | Descripción | Archivos | Prioridad |
|------|-------------|----------|-----------|
| **Fase 1** | Application Layer - Use Cases | 83 | Alta |
| **Fase 2** | Domain Layer | 115 | Alta |
| **Fase 3** | Infrastructure Layer | 23 | Media |
| **Fase 4** | Shared Layer | 41 | Media |
| **Fase 5** | Interface Layer - Controllers | 17 | Baja |
| **TOTAL** | | **279** | |

---

## Notas

1. **Archivos excluidos de cobertura** (según `jest.config.js`):
   - `src/**/*.module.ts`
   - `src/**/index.ts`
   - `src/main.ts`
   - `src/**/*.d.ts`

2. **Archivos adicionales** que pueden necesitar tests:
   - Configuraciones (`src/**/config/*.ts`)
   - Decoradores (`src/**/decorators/*.ts`)
   - Eventos de dominio (`src/**/domain/events/*.event.ts`)
   - Tipos e interfaces (generalmente no requieren tests)

3. **Verificación de progreso**:
   ```bash
   # Ejecutar tests con cobertura
   bun run test:cov
   
   # Ver reporte HTML
   open coverage/lcov-report/index.html
   ```

4. **Marcar progreso**: Usa `[x]` para marcar archivos completados en este documento.

---

**Última actualización**: 2026-01-01
**Progreso total**: 65/279 archivos (~23%)

---

## 📈 Archivos Adicionales con Tests (no listados originalmente)

Los siguientes archivos fueron testeados pero no estaban en la lista original:

- [x] `src/infrastructure/database/prisma.service.ts` → `test/infrastructure/database/prisma.service.spec.ts`
- [x] `src/authentication/security/strategies/jwtStrategy.ts` → `test/authentication/security/strategies/jwtStrategy.spec.ts`

