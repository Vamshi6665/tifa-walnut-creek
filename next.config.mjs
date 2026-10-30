/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three/examples ships untranspiled ESM; let Next handle it consistently.
  transpilePackages: ['three'],
  images: {
    // Next 16 only allows quality 75 by default; the WebGL textures request 82.
    qualities: [75, 82, 90],
    formats: ['image/avif', 'image/webp'],
    // Google review author avatars
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
