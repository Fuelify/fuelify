// Instacart Developer Platform (https://docs.instacart.com/developer_platform_api/):
// turns a shopping list into an Instacart page where the user picks a store
// (Publix, Aldi, Costco, …) and checks out. Instacart doesn't expose prices.
// Env: INSTACART_API_KEY; INSTACART_API_BASE (default production,
// https://connect.instacart.com; use https://connect.dev.instacart.tools for development keys).

import { fetchJson, ProviderError, type GroceryProvider } from './provider';

export const instacart: GroceryProvider = {
  id: 'instacart',
  configured: () => !!process.env.INSTACART_API_KEY,

  async search() {
    return []; // no price search
  },

  async checkout(items, config) {
    if (items.length === 0) throw new ProviderError('Nothing to send to Instacart.');
    const base = process.env.INSTACART_API_BASE || 'https://connect.instacart.com';
    const data = await fetchJson<{ products_link_url?: string }>(
      `${base}/idp/v1/products/products_link`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.INSTACART_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          title: `Fuelify shopping list${config.instacartRetailer ? ` for ${config.instacartRetailer}` : ''}`,
          link_type: 'shopping_list',
          line_items: items.slice(0, 200).map((i) => ({ name: i.name, quantity: Math.max(1, i.quantity), display_text: i.name })),
          landing_page_configuration: { partner_linkback_url: 'https://fuelify-murex.vercel.app/cart', enable_pantry_items: true },
        }),
      },
      'Instacart',
    );
    if (!data.products_link_url) throw new ProviderError('Instacart didn’t return a link.');
    return data.products_link_url;
  },
};
