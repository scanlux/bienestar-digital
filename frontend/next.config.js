/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
    images: {
        unoptimized: !isProd,
    },
    compiler: {
        styledComponents: true,
    },
}

module.exports = nextConfig
