/** @type {import('next').NextConfig} */
// Trigger deploy to production Micro-USA (UFW-Docker integration applied)
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
    images: {
        unoptimized: true,
    },
    compiler: {
        styledComponents: true,
    },
}

module.exports = nextConfig

