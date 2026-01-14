/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
    images: {
        unoptimized: !isProd,
    },
}

module.exports = nextConfig
