/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@relatax/ui", "@relatax/types"],
  reactStrictMode: true,
  output: "standalone"
};

export default nextConfig;
