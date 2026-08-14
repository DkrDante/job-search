/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',          // Enables Docker & Railway deploys
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: 'remotive.com' },
      { protocol: 'https', hostname: '**.adzuna.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['node-cron', 'cheerio'],
  },
};

module.exports = nextConfig;
