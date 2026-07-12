import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // @metamask/sdk optionally imports React Native's async-storage for RN environments;
    // it's unused in the browser build and safe to stub out — silences a noisy dev-log warning.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
