// Static export so the site can be hosted on GitHub Pages now and Vercel later.
// On GitHub Pages the site lives under /<repo-name>, so the deploy workflow sets
// NEXT_PUBLIC_BASE_PATH=/startupNews. Leave it empty once a custom domain is attached.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
