/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // smart-account-kit ships an optional StellarWalletsKitAdapter that
    // imports from @creit-tech/stellar-wallets-kit. We don't use it,
    // so stub the missing module to avoid build failures.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@creit-tech/stellar-wallets-kit/modules/utils': false,
      '@creit-tech/stellar-wallets-kit': false,
    };
    return config;
  },
};

module.exports = nextConfig;
