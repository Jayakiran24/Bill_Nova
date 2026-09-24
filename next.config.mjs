/** @type {import('next').NextConfig} */
const nextConfig = {
  // node:sqlite is a Node built-in; keep it out of the bundler's way.
  serverExternalPackages: [],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
