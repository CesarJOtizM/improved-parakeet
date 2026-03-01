import { describe, expect, it } from '@jest/globals';
import {
  LocationType,
  LocationTypeEnum,
} from '@location/domain/valueObjects/locationType.valueObject';

describe('LocationType', () => {
  describe('create', () => {
    it('Given: ZONE value When: creating Then: should create successfully', () => {
      // Act
      const type = LocationType.create('ZONE');

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.ZONE);
    });

    it('Given: AISLE value When: creating Then: should create successfully', () => {
      // Act
      const type = LocationType.create('AISLE');

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.AISLE);
    });

    it('Given: RACK value When: creating Then: should create successfully', () => {
      // Act
      const type = LocationType.create('RACK');

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.RACK);
    });

    it('Given: SHELF value When: creating Then: should create successfully', () => {
      // Act
      const type = LocationType.create('SHELF');

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.SHELF);
    });

    it('Given: BIN value When: creating Then: should create successfully', () => {
      // Act
      const type = LocationType.create('BIN');

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.BIN);
    });

    it('Given: lowercase value When: creating Then: should normalize and create', () => {
      // Act
      const type = LocationType.create('zone');

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.ZONE);
    });

    it('Given: invalid value When: creating Then: should throw error', () => {
      // Act & Assert
      expect(() => LocationType.create('INVALID')).toThrow(
        'Invalid location type: INVALID. Valid types are: ZONE, AISLE, RACK, SHELF, BIN'
      );
    });
  });

  describe('static factory methods', () => {
    it('Given: zone factory When: creating Then: should return ZONE type', () => {
      // Act
      const type = LocationType.zone();

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.ZONE);
      expect(type.isZone()).toBe(true);
    });

    it('Given: aisle factory When: creating Then: should return AISLE type', () => {
      // Act
      const type = LocationType.aisle();

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.AISLE);
      expect(type.isAisle()).toBe(true);
    });

    it('Given: rack factory When: creating Then: should return RACK type', () => {
      // Act
      const type = LocationType.rack();

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.RACK);
      expect(type.isRack()).toBe(true);
    });

    it('Given: shelf factory When: creating Then: should return SHELF type', () => {
      // Act
      const type = LocationType.shelf();

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.SHELF);
      expect(type.isShelf()).toBe(true);
    });

    it('Given: bin factory When: creating Then: should return BIN type', () => {
      // Act
      const type = LocationType.bin();

      // Assert
      expect(type.getValue()).toBe(LocationTypeEnum.BIN);
      expect(type.isBin()).toBe(true);
    });
  });

  describe('type check methods', () => {
    it('Given: ZONE type When: checking isZone Then: should return true', () => {
      // Arrange
      const type = LocationType.create('ZONE');

      // Act & Assert
      expect(type.isZone()).toBe(true);
      expect(type.isAisle()).toBe(false);
      expect(type.isRack()).toBe(false);
      expect(type.isShelf()).toBe(false);
      expect(type.isBin()).toBe(false);
    });

    it('Given: AISLE type When: checking isAisle Then: should return true', () => {
      // Arrange
      const type = LocationType.create('AISLE');

      // Act & Assert
      expect(type.isAisle()).toBe(true);
      expect(type.isZone()).toBe(false);
    });

    it('Given: RACK type When: checking isRack Then: should return true', () => {
      // Arrange
      const type = LocationType.create('RACK');

      // Act & Assert
      expect(type.isRack()).toBe(true);
      expect(type.isZone()).toBe(false);
    });

    it('Given: SHELF type When: checking isShelf Then: should return true', () => {
      // Arrange
      const type = LocationType.create('SHELF');

      // Act & Assert
      expect(type.isShelf()).toBe(true);
      expect(type.isZone()).toBe(false);
    });

    it('Given: BIN type When: checking isBin Then: should return true', () => {
      // Arrange
      const type = LocationType.create('BIN');

      // Act & Assert
      expect(type.isBin()).toBe(true);
      expect(type.isZone()).toBe(false);
    });
  });

  describe('getValue', () => {
    it('Given: any type When: getting value Then: should return correct enum value', () => {
      // Act
      const zone = LocationType.create('ZONE');
      const bin = LocationType.create('BIN');

      // Assert
      expect(zone.getValue()).toBe(LocationTypeEnum.ZONE);
      expect(bin.getValue()).toBe(LocationTypeEnum.BIN);
    });
  });
});
