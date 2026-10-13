/** @type {import('next').NextConfig} */
const nextConfig = {
  // libSQL ships a native binding; keep it out of the bundler.
  serverExternalPackages: ["@libsql/client", "libsql"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
