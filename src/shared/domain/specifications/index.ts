// Core specification interfaces and base classes
export type { ISpecification } from './iSpecification.port';
export {
  BaseSpecification,
  AndSpecification,
  OrSpecification,
  NotSpecification,
} from './baseSpecification';

// Prisma specification interfaces and implementations
export type { PrismaWhereInput } from './iPrismaSpecification.port';
export type { IPrismaSpecification } from './iPrismaSpecification.port';
export {
  PrismaSpecification,
  PrismaAndSpecification,
  PrismaOrSpecification,
  PrismaNotSpecification,
} from './prismaSpecification.base';
