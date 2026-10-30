/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // three/examples ships untranspiled ESM; let Next handle it consistently.
  transpilePackages: ['three'],
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
