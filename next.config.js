/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@solarisdk/browser", "playwright-core"]
  }
};

module.exports = nextConfig;
