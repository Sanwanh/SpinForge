/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['pixi.js'],
  // Better Auth (and its kysely/postgres deps) must run as Node externals, not be
  // bundled by webpack — bundling trips kysely's missing migrator-constant exports.
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
