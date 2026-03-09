import { DeleteSkuMappingUseCase } from '@application/integrationUseCases/deleteSkuMappingUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationSkuMapping } from '../../../src/integrations/shared/domain/entities/integrationSkuMapping.entity';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationSkuMappingRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationSkuMappingRepository.port';

describe('DeleteSkuMappingUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: DeleteSkuMappingUseCase;
  let mockSkuMappingRepository: jest.Mocked<IIntegrationSkuMappingRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSkuMappingRepository = {
      findByConnectionId: jest.fn(),
      findByExternalSku: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationSkuMappingRepository>;

    useCase = new DeleteSkuMappingUseCase(mockSkuMappingRepository);
  });

  it('Given: existing mapping When: deleting Then: should return success', async () => {
    const mapping = IntegrationSkuMapping.reconstitute(
      { connectionId: 'conn-1', externalSku: 'VTEX-001', productId: 'prod-1' },
      'mapping-1',
      mockOrgId
    );
    mockSkuMappingRepository.findByConnectionId.mockResolvedValue([mapping]);
    mockSkuMappingRepository.delete.mockResolvedValue(undefined);

    const result = await useCase.execute({
      mappingId: 'mapping-1',
      connectionId: 'conn-1',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.id).toBe('mapping-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockSkuMappingRepository.delete).toHaveBeenCalledWith('mapping-1');
  });

  it('Given: non-existent mapping When: deleting Then: should return NotFoundError', async () => {
    mockSkuMappingRepository.findByConnectionId.mockResolvedValue([]);

    const result = await useCase.execute({
      mappingId: 'non-existent',
      connectionId: 'conn-1',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.code).toBe('SKU_MAPPING_NOT_FOUND');
      }
    );
  });

  it('Given: mapping exists but for different connection When: deleting Then: should return NotFoundError', async () => {
    const mapping = IntegrationSkuMapping.reconstitute(
      { connectionId: 'conn-1', externalSku: 'VTEX-001', productId: 'prod-1' },
      'mapping-other',
      mockOrgId
    );
    mockSkuMappingRepository.findByConnectionId.mockResolvedValue([mapping]);

    const result = await useCase.execute({
      mappingId: 'mapping-1',
      connectionId: 'conn-1',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    );
  });
});
