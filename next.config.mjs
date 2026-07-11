/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next dev` and `next build` must never rewrite the same runtime tree.
  // Sharing `.next` can leave a live dev server loading production chunk paths.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
