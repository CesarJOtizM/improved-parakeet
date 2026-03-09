import { GetCategoriesUseCase } from '@application/categoryUseCases/getCategoriesUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Category } from '@product/domain/entities/category.entity';

import type { ICategoryRepository } from '@product/domain/ports/repositories/iCategoryRepository.port';
import type { IProductRepository } from '@product/domain/ports/repositories/iProductRepository.port';

describe('GetCategoriesUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetCategoriesUseCase;
  let mockCategoryRepository: jest.Mocked<ICategoryRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCategoryRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
      findByParentId: jest.fn(),
      findRootCategories: jest.fn(),
      existsByName: jest.fn(),
    } as jest.Mocked<ICategoryRepository>;

    mockProductRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
      findBySpecification: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    useCase = new GetCategoriesUseCase(mockCategoryRepository, mockProductRepository);
  });

  describe('execute', () => {
    const createMockCategory = (
      overrides: Partial<{
        name: string;
        id: string;
        parentId: string;
        isActive: boolean;
        description: string;
      }> = {}
    ): Category => {
      return Category.reconstitute(
        {
          name: overrides.name ?? 'Electronics',
          description: overrides.description ?? 'Electronic devices',
          parentId: overrides.parentId,
          isActive: overrides.isActive ?? true,
        },
        overrides.id ?? 'cat-123',
        mockOrgId
      );
    };

    it('Given: categories exist When: getting all categories Then: should return paginated success result', async () => {
      // Arrange
      const cat1 = createMockCategory({ name: 'Electronics', id: 'cat-1' });
      const cat2 = createMockCategory({ name: 'Clothing', id: 'cat-2' });
      mockCategoryRepository.findAll.mockResolvedValue([cat1, cat2]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Categories retrieved successfully');
          expect(value.data).toHaveLength(2);
          expect(value.pagination.total).toBe(2);
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.totalPages).toBe(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: no categories exist When: getting all categories Then: should return empty list', async () => {
      // Arrange
      mockCategoryRepository.findAll.mockResolvedValue([]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(0);
          expect(value.pagination.total).toBe(0);
          expect(value.pagination.totalPages).toBe(0);
          expect(value.pagination.hasNext).toBe(false);
          expect(value.pagination.hasPrev).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with search filter When: getting categories Then: should filter by name', async () => {
      // Arrange
      const cat1 = createMockCategory({
        name: 'Electronics',
        id: 'cat-1',
        description: 'Electronic devices',
      });
      const cat2 = createMockCategory({
        name: 'Clothing',
        id: 'cat-2',
        description: 'Apparel and fashion',
      });
      const cat3 = createMockCategory({
        name: 'Electronic Parts',
        id: 'cat-3',
        description: 'Components',
      });
      mockCategoryRepository.findAll.mockResolvedValue([cat1, cat2, cat3]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        search: 'electro',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          expect(value.data.map(c => c.name)).toEqual(
            expect.arrayContaining(['Electronics', 'Electronic Parts'])
          );
          expect(value.pagination.total).toBe(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with isActive filter When: getting categories Then: should filter by active status', async () => {
      // Arrange
      const activeCat = createMockCategory({ name: 'Active', id: 'cat-1', isActive: true });
      const inactiveCat = createMockCategory({ name: 'Inactive', id: 'cat-2', isActive: false });
      mockCategoryRepository.findAll.mockResolvedValue([activeCat, inactiveCat]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        isActive: true,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].name).toBe('Active');
          expect(value.data[0].isActive).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with parentId filter When: getting categories Then: should filter by parentId', async () => {
      // Arrange
      const rootCat = createMockCategory({ name: 'Root', id: 'cat-1' });
      const childCat = createMockCategory({ name: 'Child', id: 'cat-2', parentId: 'cat-1' });
      const otherChild = createMockCategory({
        name: 'Other Child',
        id: 'cat-3',
        parentId: 'cat-99',
      });
      mockCategoryRepository.findAll.mockResolvedValue([rootCat, childCat, otherChild]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        parentId: 'cat-1',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].name).toBe('Child');
          expect(value.data[0].parentId).toBe('cat-1');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: many categories When: requesting page 2 Then: should return correct pagination', async () => {
      // Arrange - Create 15 categories
      const categories = Array.from({ length: 15 }, (_, i) =>
        createMockCategory({ name: `Category ${i + 1}`, id: `cat-${i + 1}` })
      );
      mockCategoryRepository.findAll.mockResolvedValue(categories);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 2,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(5);
          expect(value.pagination.page).toBe(2);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.total).toBe(15);
          expect(value.pagination.totalPages).toBe(2);
          expect(value.pagination.hasNext).toBe(false);
          expect(value.pagination.hasPrev).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with parent When: getting categories Then: should include parentName', async () => {
      // Arrange
      const parentCat = createMockCategory({ name: 'Parent', id: 'parent-id' });
      const childCat = createMockCategory({ name: 'Child', id: 'child-id', parentId: 'parent-id' });
      mockCategoryRepository.findAll.mockResolvedValue([parentCat, childCat]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          const child = value.data.find(c => c.name === 'Child');
          expect(child).toBeDefined();
          expect(child!.parentName).toBe('Parent');

          const parent = value.data.find(c => c.name === 'Parent');
          expect(parent).toBeDefined();
          expect(parent!.parentName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with search by description When: getting categories Then: should match description', async () => {
      // Arrange
      const cat1 = createMockCategory({
        name: 'Category A',
        id: 'cat-1',
        description: 'Gadgets and devices',
      });
      const cat2 = createMockCategory({
        name: 'Category B',
        id: 'cat-2',
        description: 'Apparel items',
      });
      mockCategoryRepository.findAll.mockResolvedValue([cat1, cat2]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        search: 'gadgets',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].name).toBe('Category A');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: default pagination When: getting categories Then: should use page 1 and limit 10', async () => {
      // Arrange
      mockCategoryRepository.findAll.mockResolvedValue([]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(10);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with sortBy name desc When: getting categories Then: should return sorted results', async () => {
      // Arrange
      const catA = createMockCategory({ name: 'Alpha', id: 'cat-a' });
      const catB = createMockCategory({ name: 'Beta', id: 'cat-b' });
      const catC = createMockCategory({ name: 'Charlie', id: 'cat-c' });
      mockCategoryRepository.findAll.mockResolvedValue([catA, catB, catC]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'name',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].name).toBe('Charlie');
          expect(value.data[1].name).toBe('Beta');
          expect(value.data[2].name).toBe('Alpha');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with sortBy isActive When: getting categories Then: should sort by active status', async () => {
      // Arrange
      const activeCat = createMockCategory({ name: 'Active', id: 'cat-1', isActive: true });
      const inactiveCat = createMockCategory({ name: 'Inactive', id: 'cat-2', isActive: false });
      mockCategoryRepository.findAll.mockResolvedValue([activeCat, inactiveCat]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'isActive',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // isActive false=0, true=1, so inactive first in asc
          expect(value.data[0].isActive).toBe(false);
          expect(value.data[1].isActive).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with sortBy productCount When: getting categories Then: should sort by product count', async () => {
      // Arrange
      const catA = createMockCategory({ name: 'Few Products', id: 'cat-a' });
      const catB = createMockCategory({ name: 'Many Products', id: 'cat-b' });
      mockCategoryRepository.findAll.mockResolvedValue([catA, catB]);

      // Create products that belong to catB through categories array
      const mockProducts = [
        { categories: [{ id: 'cat-b' }] },
        { categories: [{ id: 'cat-b' }] },
        { categories: [{ id: 'cat-b' }] },
        { categories: [{ id: 'cat-a' }] },
      ] as unknown as ReturnType<typeof mockProductRepository.findAll> extends Promise<infer U>
        ? U
        : never;
      mockProductRepository.findAll.mockResolvedValue(mockProducts);

      const request = {
        orgId: mockOrgId,
        sortBy: 'productCount',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].productCount).toBeLessThanOrEqual(value.data[1].productCount);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with sortBy updatedAt When: getting categories Then: should sort by update date', async () => {
      // Arrange
      const catA = createMockCategory({ name: 'CatA', id: 'cat-a' });
      const catB = createMockCategory({ name: 'CatB', id: 'cat-b' });
      mockCategoryRepository.findAll.mockResolvedValue([catA, catB]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'updatedAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with sortBy createdAt When: getting categories Then: should sort by creation date', async () => {
      // Arrange
      const catA = createMockCategory({ name: 'CatA', id: 'cat-a' });
      const catB = createMockCategory({ name: 'CatB', id: 'cat-b' });
      mockCategoryRepository.findAll.mockResolvedValue([catA, catB]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'createdAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with sortBy unknown field When: getting categories Then: should fallback to createdAt sort', async () => {
      // Arrange
      const catA = createMockCategory({ name: 'CatA', id: 'cat-a' });
      const catB = createMockCategory({ name: 'CatB', id: 'cat-b' });
      mockCategoryRepository.findAll.mockResolvedValue([catA, catB]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'unknownField',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with sortBy but no sortOrder When: getting categories Then: should default to ascending', async () => {
      // Arrange
      const catA = createMockCategory({ name: 'Zeta', id: 'cat-a' });
      const catB = createMockCategory({ name: 'Alpha', id: 'cat-b' });
      mockCategoryRepository.findAll.mockResolvedValue([catA, catB]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'name',
        // no sortOrder - should default to 'asc'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].name).toBe('Alpha');
          expect(value.data[1].name).toBe('Zeta');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with isActive=false filter When: getting categories Then: should return only inactive categories', async () => {
      // Arrange
      const activeCat = createMockCategory({ name: 'Active', id: 'cat-1', isActive: true });
      const inactiveCat = createMockCategory({ name: 'Inactive', id: 'cat-2', isActive: false });
      mockCategoryRepository.findAll.mockResolvedValue([activeCat, inactiveCat]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        isActive: false,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].name).toBe('Inactive');
          expect(value.data[0].isActive).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: category with no description When: searching by description Then: should not crash on undefined', async () => {
      // Arrange
      const catNoDesc = Category.reconstitute(
        {
          name: 'No Description',
          isActive: true,
          // description is undefined
        },
        'cat-nodesc',
        mockOrgId
      );
      mockCategoryRepository.findAll.mockResolvedValue([catNoDesc]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        search: 'something',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // Category without description should not match search for 'something'
          expect(value.data).toHaveLength(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: categories with name asc sort When: getting categories Then: should sort by name ascending', async () => {
      // Arrange
      const catZ = createMockCategory({ name: 'Zulu', id: 'cat-z' });
      const catA = createMockCategory({ name: 'Alpha', id: 'cat-a' });
      const catM = createMockCategory({ name: 'Mike', id: 'cat-m' });
      mockCategoryRepository.findAll.mockResolvedValue([catZ, catA, catM]);
      mockProductRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        sortBy: 'name',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].name).toBe('Alpha');
          expect(value.data[1].name).toBe('Mike');
          expect(value.data[2].name).toBe('Zulu');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
