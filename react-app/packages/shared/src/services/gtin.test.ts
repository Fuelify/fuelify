import { describe, expect, it } from 'vitest';
import { gtinForms, isValidGtin, upcEToA } from './gtin';

describe('barcodes', () => {
  it('checks the check digit', () => {
    expect(isValidGtin('016000275287')).toBe(true); // Cheerios UPC-A
    expect(isValidGtin('016000275288')).toBe(false); // one digit off (a misread)
    expect(isValidGtin('5449000000996')).toBe(true); // Coca-Cola EAN-13
    expect(isValidGtin('96385074')).toBe(true); // EAN-8
    expect(isValidGtin('abc')).toBe(false);
  });

  it('expands UPC-E', () => {
    expect(upcEToA('04252614')).toBe('042100005264');
    expect(isValidGtin(upcEToA('04252614')!)).toBe(true);
  });

  it('gives the forms each database uses', () => {
    expect(gtinForms('016000275287')).toEqual({ ean13: '0016000275287', upcA: '016000275287', krogerId: '0001600027528' });
    expect(gtinForms('5449000000996')).toEqual({ ean13: '5449000000996', upcA: null, krogerId: '0544900000099' });
    expect(gtinForms('04252614')?.upcA).toBe('042100005264');
  });
});

import { mergeProductInfo } from './barcode-lookup';

describe('combining barcode sources', () => {
  it('fills gaps from the stores: photo from Walmart, size from Kroger', () => {
    const merged = mergeProductInfo('0016000275287', {
      openfoodfacts: { name: 'Cheerios', category: 'Grains & Pasta' },
      walmart: { name: 'Cheerios Heart Healthy Cereal, 18 oz', brand: 'General Mills', imageUrl: 'walmart.jpg' },
      kroger: { name: 'General Mills Cheerios', quantity: 18, unit: 'oz', imageUrl: 'kroger.jpg' },
    });
    expect(merged?.product).toEqual({ barcode: '0016000275287', name: 'Cheerios', brand: 'General Mills', category: 'Grains & Pasta', imageUrl: 'walmart.jpg', quantity: 18, unit: 'oz' });
    expect(merged?.sources.sort()).toEqual(['kroger', 'openfoodfacts', 'walmart']);
  });

  it('prefers what someone confirmed, and is null when nobody knows it', () => {
    expect(mergeProductInfo('1', { saved: { name: 'Grandma Jam' }, walmart: { name: 'Jam', imageUrl: 'w.jpg' } })?.product).toMatchObject({ name: 'Grandma Jam', imageUrl: 'w.jpg' });
    expect(mergeProductInfo('1', { openfoodfacts: null, walmart: null })).toBeNull();
  });
});
