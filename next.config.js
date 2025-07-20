/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // No need for `experimental.serverActions` anymore
  experimental: {
    // Uncomment only if you're actually using the app directory or Turbopack
    // appDir: true,
    // turbopack: true,
  },

  // Optional example if you want to allow loading images from external domains
  // images: {
  //   domains: ['your-domain.com'],
  // },
};

module.exports = nextConfig;
