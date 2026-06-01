/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@react-pdf/renderer", "docx"],
};

export default nextConfig;
