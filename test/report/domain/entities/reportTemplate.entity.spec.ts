// ReportTemplate Entity Tests
// Unit tests for ReportTemplate aggregate root following AAA and Given-When-Then pattern

import { ReportTemplate } from '@report/domain/entities/reportTemplate.entity';
import { ReportParameters, ReportType, REPORT_TYPES } from '@report/domain/valueObjects';

describe('ReportTemplate Entity', () => {
  const createValidProps = () => ({
    name: 'Monthly Sales Report',
    description: 'Sales report for monthly analysis',
    type: ReportType.create(REPORT_TYPES.SALES),
    defaultParameters: ReportParameters.create({ warehouseId: 'warehouse-123' }),
    isActive: true,
    createdBy: 'user-123',
  });

  describe('create', () => {
    it('Given: valid props When: creating ReportTemplate Then: should create instance', () => {
      // Arrange
      const props = createValidProps();
      const orgId = 'org-123';

      // Act
      const template = ReportTemplate.create(props, orgId);

      // Assert
      expect(template).toBeDefined();
      expect(template.id).toBeDefined();
      expect(template.orgId).toBe(orgId);
      expect(template.name).toBe('Monthly Sales Report');
      expect(template.type.getValue()).toBe(REPORT_TYPES.SALES);
      expect(template.isActive).toBe(true);
    });

    it('Given: creating template When: create Then: should emit ReportTemplateCreated event', () => {
      // Arrange
      const props = createValidProps();

      // Act
      const template = ReportTemplate.create(props, 'org-123');

      // Assert
      expect(template.domainEvents.length).toBeGreaterThan(0);
      const event = template.domainEvents.find(e => e.eventName === 'ReportTemplateCreated');
      expect(event).toBeDefined();
    });

    it('Given: props without description When: creating Then: should allow undefined description', () => {
      // Arrange
      const props = {
        ...createValidProps(),
        description: undefined,
      };

      // Act
      const template = ReportTemplate.create(props, 'org-123');

      // Assert
      expect(template.description).toBeUndefined();
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting ReportTemplate Then: should restore entity', () => {
      // Arrange
      const props = createValidProps();
      const id = 'template-123';
      const orgId = 'org-123';

      // Act
      const template = ReportTemplate.reconstitute(props, id, orgId);

      // Assert
      expect(template.id).toBe(id);
      expect(template.orgId).toBe(orgId);
      expect(template.domainEvents.length).toBe(0); // No events on reconstitute
    });
  });

  describe('activate', () => {
    it('Given: inactive template When: activating Then: should set isActive to true', () => {
      // Arrange
      const props = {
        ...createValidProps(),
        isActive: false,
      };
      const template = ReportTemplate.reconstitute(props, 'template-123', 'org-123');

      // Act
      template.activate();

      // Assert
      expect(template.isActive).toBe(true);
    });

    it('Given: active template When: activating Then: should remain active', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');

      // Act
      template.activate();

      // Assert
      expect(template.isActive).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('Given: active template When: deactivating Then: should set isActive to false', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');

      // Act
      template.deactivate();

      // Assert
      expect(template.isActive).toBe(false);
    });

    it('Given: inactive template When: deactivating Then: should remain inactive', () => {
      // Arrange
      const props = {
        ...createValidProps(),
        isActive: false,
      };
      const template = ReportTemplate.reconstitute(props, 'template-123', 'org-123');

      // Act
      template.deactivate();

      // Assert
      expect(template.isActive).toBe(false);
    });
  });

  describe('updateName', () => {
    it('Given: valid name When: updating name Then: should update name', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');
      const newName = 'Updated Report Name';

      // Act
      template.updateName(newName, 'user-456');

      // Assert
      expect(template.name).toBe(newName);
    });

    it('Given: updating name When: updateName Then: should emit ReportTemplateUpdated event', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');
      template.clearEvents(); // Clear creation event

      // Act
      template.updateName('New Name', 'user-456');

      // Assert
      const event = template.domainEvents.find(e => e.eventName === 'ReportTemplateUpdated');
      expect(event).toBeDefined();
    });

    it('Given: empty name When: updating name Then: should throw error', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');

      // Act & Assert
      expect(() => template.updateName('', 'user-456')).toThrow('Template name cannot be empty');
    });

    it('Given: name too short When: updating name Then: should throw error', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');

      // Act & Assert
      expect(() => template.updateName('AB', 'user-456')).toThrow(
        'Template name must be at least 3 characters long'
      );
    });

    it('Given: name too long When: updating name Then: should throw error', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');
      const longName = 'A'.repeat(101);

      // Act & Assert
      expect(() => template.updateName(longName, 'user-456')).toThrow(
        'Template name must be at most 100 characters long'
      );
    });
  });

  describe('updateDescription', () => {
    it('Given: valid description When: updating description Then: should update description', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');
      const newDescription = 'Updated description';

      // Act
      template.updateDescription(newDescription);

      // Assert
      expect(template.description).toBe(newDescription);
    });

    it('Given: undefined description When: updating description Then: should clear description', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');

      // Act
      template.updateDescription(undefined);

      // Assert
      expect(template.description).toBeUndefined();
    });
  });

  describe('updateParameters', () => {
    it('Given: new parameters When: updating parameters Then: should update parameters', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');
      const newParams = { productId: 'product-456' };

      // Act
      template.updateParameters(newParams, 'user-456');

      // Assert
      expect(template.defaultParameters.getProductId()).toBe('product-456');
    });

    it('Given: updating parameters When: updateParameters Then: should emit event', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');
      template.clearEvents();

      // Act
      template.updateParameters({ productId: 'product-456' }, 'user-456');

      // Assert
      const event = template.domainEvents.find(e => e.eventName === 'ReportTemplateUpdated');
      expect(event).toBeDefined();
    });
  });

  describe('toPlainObject', () => {
    it('Given: template When: converting to plain object Then: should return correct structure', () => {
      // Arrange
      const template = ReportTemplate.create(createValidProps(), 'org-123');

      // Act
      const plain = template.toPlainObject();

      // Assert
      expect(plain.id).toBe(template.id);
      expect(plain.name).toBe('Monthly Sales Report');
      expect(plain.type).toBe(REPORT_TYPES.SALES);
      expect(plain.isActive).toBe(true);
      expect(plain.createdBy).toBe('user-123');
      expect(plain.orgId).toBe('org-123');
      expect(plain.defaultParameters).toBeDefined();
    });
  });
});
