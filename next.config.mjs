/** @type {import('next').NextConfig} */

// EXPORT_MODE=1 produces a fully static build (GitHub Pages-friendly):
// no server, no API route — /api/copilot fetches fail and the app runs its
// built-in offline-AI template mode, exactly as designed.
const isExport = process.env.EXPORT_MODE === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const siteUrl = isExport
  ? `https://arya-jannawar.github.io${basePath ?? ""}/`
  : "http://localhost:3000";

const nextConfig = {
  reactStrictMode: true,
  ...(isExport
    ? {
        output: "export",
        trailingSlash: true,
        basePath,
        images: { unoptimized: true },
        env: { NEXT_PUBLIC_SITE_URL: siteUrl },
      }
    : {}),
};

export default nextConfig;
