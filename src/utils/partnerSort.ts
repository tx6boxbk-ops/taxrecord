/**
 * Utility for custom sorting of Suppliers and Customers
 */

export function sortPartners<
  T extends { sortOrder?: number; createdAt?: string; displayName?: string }
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const orderA = typeof a.sortOrder === 'number' ? a.sortOrder : Infinity;
    const orderB = typeof b.sortOrder === 'number' ? b.sortOrder : Infinity;
    if (orderA !== orderB) return orderA - orderB;
    if (a.createdAt && b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
}
