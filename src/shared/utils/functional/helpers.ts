// Functional helper functions with types

/**
 * Type-safe map function
 */
export function map<T, R>(fn: (item: T, index: number) => R): (array: T[]) => R[] {
  return (array: T[]): R[] => array.map(fn);
}

/**
 * Type-safe filter function
 */
export function filter<T>(fn: (item: T, index: number) => boolean): (array: T[]) => T[] {
  return (array: T[]): T[] => array.filter(fn);
}

/**
 * Type-safe reduce function
 */
export function reduce<T, R>(
  fn: (acc: R, item: T, index: number) => R,
  initial: R
): (array: T[]) => R {
  return (array: T[]): R => array.reduce(fn, initial);
}

/**
 * Type-safe flatMap function
 */
export function flatMap<T, R>(fn: (item: T, index: number) => R[]): (array: T[]) => R[] {
  return (array: T[]): R[] => array.flatMap(fn);
}

/**
 * Type-safe find function
 */
export function find<T>(fn: (item: T) => boolean): (array: T[]) => T | undefined {
  return (array: T[]): T | undefined => array.find(fn);
}

/**
 * Type-safe every function
 */
export function every<T>(fn: (item: T) => boolean): (array: T[]) => boolean {
  return (array: T[]): boolean => array.every(fn);
}

/**
 * Type-safe some function
 */
export function some<T>(fn: (item: T) => boolean): (array: T[]) => boolean {
  return (array: T[]): boolean => array.some(fn);
}

/**
 * Identity function
 */
export function identity<T>(x: T): T {
  return x;
}

/**
 * Constant function
 */
export function constant<T>(x: T): () => T {
  return () => x;
}

/**
 * No-op function
 */
export function noop(): void {
  // Intentionally empty
}

/**
 * Functional forEach: executes a provided function once for each array element
 */
export function forEach<T>(fn: (item: T, index: number) => void): (array: T[]) => void {
  return (array: T[]): void => array.forEach(fn);
}

/**
 * Functional tap: performs a side effect with a value and then returns the value
 */
export function tap<T>(fn: (value: T) => void): (value: T) => T {
  return (value: T): T => {
    fn(value);
    return value;
  };
}

/**
 * Prop function: returns a named property of an object
 */
export function prop<K extends PropertyKey>(
  key: K
): <T extends Record<K, unknown>>(obj: T) => T[K] {
  return <T extends Record<K, unknown>>(obj: T): T[K] => obj[key];
}

/**
 * Pick function: creates an object composed of the picked object properties
 */
export function pick<T extends object, K extends keyof T>(keys: K[]): (obj: T) => Pick<T, K> {
  return (obj: T): Pick<T, K> => {
    return keys.reduce(
      (acc, key) => {
        if (key in obj) {
          acc[key] = obj[key];
        }
        return acc;
      },
      {} as Pick<T, K>
    );
  };
}

/**
 * Omit function: creates an object composed of the own enumerable string keyed properties
 * that are not omitted
 */
export function omit<T extends object, K extends keyof T>(keys: K[]): (obj: T) => Omit<T, K> {
  return (obj: T): Omit<T, K> => {
    const newObj = { ...obj };
    for (const key of keys) {
      delete newObj[key];
    }
    return newObj;
  };
}
