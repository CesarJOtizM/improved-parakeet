import {
  StreamReportUseCase,
  IStreamReportRequest,
} from '@application/reportUseCases/streamReportUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ValidationError } from '@shared/domain/result/domainError';

describe('StreamReportUseCase', () => {
  let useCase: StreamReportUseCase;
  let mockReportGenerationService: any;

  beforeEach(() => {
    mockReportGenerationService = {
      generateReportStream: jest.fn(),
    };

    useCase = new StreamReportUseCase(mockReportGenerationService);
  });

  describe('execute', () => {
    it('Given: valid request When: streaming report Then: should yield batches', async () => {
      // Arrange
      const mockBatches = [
        [
          { id: '1', value: 100 },
          { id: '2', value: 200 },
        ],
        [
          { id: '3', value: 300 },
          { id: '4', value: 400 },
        ],
      ];

      async function* mockGenerator() {
        for (const batch of mockBatches) {
          yield batch;
        }
      }
      mockReportGenerationService.generateReportStream.mockReturnValue(mockGenerator());

      const request: IStreamReportRequest = {
        type: 'VALUATION',
        parameters: { startDate: new Date(), endDate: new Date() },
        orgId: 'org-123',
      };

      // Act
      const results: unknown[][] = [];
      for await (const batch of useCase.execute(request)) {
        results.push(batch);
      }

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(2);
      expect(results[1]).toHaveLength(2);
      expect(mockReportGenerationService.generateReportStream).toHaveBeenCalledWith(
        'VALUATION',
        request.parameters,
        'org-123',
        100 // BATCH_SIZE
      );
    });

    it('Given: invalid report type When: streaming Then: should throw ValidationError', async () => {
      // Arrange
      const request: IStreamReportRequest = {
        type: 'INVALID_TYPE',
        parameters: { startDate: new Date(), endDate: new Date() },
        orgId: 'org-123',
      };

      // Act & Assert
      const generator = useCase.execute(request);
      await expect(generator.next()).rejects.toThrow(ValidationError);
    });

    it('Given: generation fails When: streaming Then: should throw error', async () => {
      // Arrange
      async function* mockFailingGenerator() {
        throw new Error('Generation failed');
        yield []; // Never reached
      }
      mockReportGenerationService.generateReportStream.mockReturnValue(mockFailingGenerator());

      const request: IStreamReportRequest = {
        type: 'VALUATION',
        parameters: { startDate: new Date(), endDate: new Date() },
        orgId: 'org-123',
      };

      // Act & Assert
      const generator = useCase.execute(request);
      await expect(generator.next()).rejects.toThrow('Generation failed');
    });

    it('Given: empty data When: streaming Then: should complete with no batches', async () => {
      // Arrange
      async function* mockEmptyGenerator() {
        // No yields
      }
      mockReportGenerationService.generateReportStream.mockReturnValue(mockEmptyGenerator());

      const request: IStreamReportRequest = {
        type: 'MOVEMENTS',
        parameters: { startDate: new Date(), endDate: new Date() },
        orgId: 'org-123',
      };

      // Act
      const results: unknown[][] = [];
      for await (const batch of useCase.execute(request)) {
        results.push(batch);
      }

      // Assert
      expect(results).toHaveLength(0);
    });
  });
});
