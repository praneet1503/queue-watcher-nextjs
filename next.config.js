/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.2.2'],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
