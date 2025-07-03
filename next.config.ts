/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true, // Ensures the app is minified for better performance
  // Removed experimental.serverActions
};

module.exports = nextConfig;
