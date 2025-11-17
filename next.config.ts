import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactStrictMode: true,
    output: "standalone",
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.ipfs.w3s.link",
            },
            {
                protocol: "https",
                hostname: "ipfs.io",
            },
            {
                protocol: "https",
                hostname: "**.ipfs.io",
            },
            {
                protocol: "https",
                hostname: "gateway.pinata.cloud",
            },
            {
                protocol: "https",
                hostname: "**.mypinata.cloud",
            },
        ],
    },
    turbopack: {
        resolveAlias: {
            // Add any necessary aliases
        },
    },
    webpack: (config, { isServer }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                os: false,
                path: false,
                crypto: false,
            };
        }
        return config;
    },
};

export default nextConfig;
