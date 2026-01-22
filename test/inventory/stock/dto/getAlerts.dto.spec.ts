import { GetAlertsDto } from '@inventory/stock/dto/getAlerts.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

describe('GetAlertsDto', () => {
  it('Given: valid filters When: validating Then: should pass validation', async () => {
    // Arrange
    const payload = {
      productId: 'product-id-123',
      warehouseId: 'warehouse-id-123',
      severity: 'LOW',
      page: 1,
      limit: 10,
    };
    const dto = plainToInstance(GetAlertsDto, payload);

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(0);
  });

  it('Given: invalid severity When: validating Then: should report enum error', async () => {
    // Arrange
    const dto = plainToInstance(GetAlertsDto, { severity: 'HIGH' });

    // Act
    const errors = await validate(dto);

    // Assert
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('severity');
  });

  it('Given: zero page and limit When: validating Then: should report min errors', async () => {
    // Arrange
    const dto = plainToInstance(GetAlertsDto, { page: 0, limit: 0 });

    // Act
    const errors = await validate(dto);

    // Assert
    const properties = errors.map(error => error.property).sort();
    expect(properties).toEqual(['limit', 'page']);
  });

  it('Given: numeric strings When: transforming Then: should cast to numbers', () => {
    // Arrange
    const dto = plainToInstance(GetAlertsDto, { page: '2', limit: '5' });

    // Act & Assert
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(5);
  });
});
