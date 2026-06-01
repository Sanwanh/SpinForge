/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['pixi.js'],
  // better-auth (server) is externalized so webpack never bundles its kysely
  // adapter (kysely 0.29 dropped migrator-constant exports). The CLIENT does NOT
  // import better-auth/react at all (auth-client.ts is a plain fetch wrapper over
  // the /api/auth/* REST endpoints), so nothing externalized is evaluated during
  // SSR — avoiding the "undefined element" layout-wide 500.
  experimental: {
    serverComponentsExternalPackages: ['better-auth', 'kysely', 'postgres'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    return config;
  },
};

module.exports = nextConfig;
