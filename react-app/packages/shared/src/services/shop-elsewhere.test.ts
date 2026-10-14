import { describe, expect, it } from 'vitest';
import { guessShopElsewhereStore, listAsText, storeSearchUrl } from './shop-elsewhere';

describe('storeSearchUrl', () => {
  it('encodes the item into the store search', () => {
    expect(storeSearchUrl('target', ' almond  milk ')).toBe('https://www.target.com/s?searchTerm=almond%20milk');
    expect(storeSearchUrl('aldi', 'mac & cheese')).toBe('https://www.aldi.us/results?q=mac%20%26%20cheese');
  });
  it('falls back to a web search', () => {
    expect(storeSearchUrl('other', 'eggs')).toBe('https://www.google.com/search?q=eggs%20grocery');
  });
});

describe('guessShopElsewhereStore', () => {
  it('matches a retailer name', () => {
    expect(guessShopElsewhereStore('Publix')).toBe('publix');
    expect(guessShopElsewhereStore('ALDI US')).toBe('aldi');
    expect(guessShopElsewhereStore(null)).toBe('aldi');
  });
});

describe('listAsText', () => {
  it('lists items with amounts and combines repeats', () => {
    expect(listAsText([{ name: 'Eggs', amount: '12' }, { name: 'milk' }, { name: 'eggs', amount: '6' }])).toBe(
      'Groceries (2)\n\n☐ Eggs — 12 + 6\n☐ milk',
    );
  });
  it('groups by aisle, ungrouped last', () => {
    const text = listAsText([{ name: 'tea' }, { name: 'apples', group: 'Produce' }, { name: 'cheese', group: 'Dairy' }], 'List');
    expect(text).toBe('List (3)\n\nDairy\n☐ cheese\n\nProduce\n☐ apples\n\nOther\n☐ tea');
  });
});
