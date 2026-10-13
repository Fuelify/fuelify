/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@fuelify/shared'],
  async headers() {
    // The service worker must always be re-checked so app updates reach installed apps
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }];
  },
};

module.exports = nextConfig;
