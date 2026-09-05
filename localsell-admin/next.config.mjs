import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const uploadRemotePattern = (serverUrl) => {
  try {
    const url = new URL(serverUrl);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    return {
      protocol: url.protocol.slice(0, -1),
      hostname: url.hostname,
      port: url.port,
      pathname: '/uploads/**',
    };
  } catch {
    return null;
  }
};

const uploadServerPatterns = [
  process.env.NEXT_PUBLIC_SERVER_URL,
  'http://localhost:4000',
  'https://aws-server-v2.enatega.com',
]
  .map(uploadRemotePattern)
  .filter(Boolean)
  .filter(
    (pattern, index, patterns) =>
      patterns.findIndex(
        (candidate) =>
          candidate.protocol === pattern.protocol &&
          candidate.hostname === pattern.hostname &&
          candidate.port === pattern.port
      ) === index
  );

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowSVG: false,
    remotePatterns: [
      ...uploadServerPatterns,
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
      {
        protocol: 'https',
        hostname: 'encrypted-tbn0.gstatic.com',
      },
      {
        protocol: 'https',
        hostname: 't4.ftcdn.net',
      },
      {
        protocol: 'https',
        hostname: 'static.vecteezy.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
      },
      {
        protocol: 'https',
        hostname: 'enatega-backend.s3.eu-north-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'assets.enatega.com',
      }
    ],
  },
};

export default withNextIntl(nextConfig);
