/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',   // required by the Docker runner stage
  reactStrictMode: true,
  poweredByHeader: false,
};
export default nextConfig;
