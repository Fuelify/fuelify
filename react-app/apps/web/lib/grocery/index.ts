import type { GroceryProviderStatus, GroceryStoreId } from '@fuelify/shared';
import { instacart } from './instacart';
import { kroger } from './kroger';
import { walmart } from './walmart';
import type { GroceryProvider } from './provider';

export const PROVIDERS: Record<GroceryStoreId, GroceryProvider> = { kroger, walmart, instacart };

export function providerStatus(): GroceryProviderStatus {
  return { kroger: kroger.configured(), walmart: walmart.configured(), instacart: instacart.configured() };
}

export { ProviderError } from './provider';
