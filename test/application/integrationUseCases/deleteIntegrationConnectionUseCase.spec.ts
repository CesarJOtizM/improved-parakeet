import { DeleteIntegrationConnectionUseCase } from '@application/integrationUseCases/deleteIntegrationConnectionUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IIntegrationConnectionRepository } from '../../../src/integrations/shared/domain/ports/iIntegrationConnectionRepository.port';

describe('DeleteIntegrationConnectionUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: DeleteIntegrationConnectionUseCase;
  let mockConnectionRepository: jest.Mocked<IIntegrationConnectionRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConnectionRepository = {
      findByOrgId: jest.fn(),
      findById: jest.fn(),
      findByProviderAndAccount: jest.fn(),
      findByProviderAndAccountGlobal: jest.fn(),
      findAllConnectedForPolling: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IIntegrationConnectionRepository>;

    useCase = new DeleteIntegrationConnectionUseCase(mockConnectionRepository);
  });

  it('Given: existing connection When: deleting Then: should return success', async () => {
    const connection = IntegrationConnection.reconstitute(
      {
        provider: 'VTEX',
        accountName: 'test',
        storeName: 'Test',
        status: 'DISCONNECTED',
        syncStrategy: 'BOTH',
        syncDirection: 'BIDIRECTIONAL',
        encryptedAppKey: 'key',
        encryptedAppToken: 'token',
        webhookSecret: 'secret',
        defaultWarehouseId: 'wh-1',
        createdBy: 'user-1',
      },
      'conn-1',
      mockOrgId
    );
    mockConnectionRepository.findById.mockResolvedValue(connection);
    mockConnectionRepository.delete.mockResolvedValue(undefined);

    const result = await useCase.execute({ connectionId: 'conn-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.id).toBe('conn-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockConnectionRepository.delete).toHaveBeenCalledWith('conn-1', mockOrgId);
  });

  it('Given: non-existent connection When: deleting Then: should return NotFoundError', async () => {
    mockConnectionRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({ connectionId: 'non-existent', orgId: mockOrgId });

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
