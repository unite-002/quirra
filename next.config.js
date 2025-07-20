/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Enable if you're using the /app directory (App Router)
    // appDir: true,

    // Enable if you're testing Turbopack (experimental bundler)
    // turbopack: true,

    serverActions: true, // Enable Server Actions if used
  },
  // Optional: add custom headers, rewrites, or images domains
  // images: {
  //   domains: ['your-domain.com'],
  // },
};

module.exports = nextConfig;
