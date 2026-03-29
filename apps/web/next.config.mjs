/** @type {import('next').NextConfig} */

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

const securityHeaders = [
  // Prevent browsers from MIME-sniffing the content-type
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Block the site from being embedded in iframes (clickjacking protection)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },

  // Force HTTPS for 2 years, including subdomains
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },

  // Control how much referrer info is sent
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Disable browser features you don't use
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },

  // Legacy XSS filter (still useful for older browsers)
  { key: "X-XSS-Protection", value: "1; mode=block" },

  // DNS prefetch control
  { key: "X-DNS-Prefetch-Control", value: "on" },

  // Content Security Policy — controls what resources can load
  // Prevents XSS: injected scripts won't execute unless they match these rules
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-inline needed for Tailwind/Next.js inline styles
      // unsafe-eval needed for Next.js dev HMR (remove in production if possible)
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Allow images from self, data URIs, and any HTTPS source (GitHub avatars etc.)
      "img-src 'self' data: https:",
      "font-src 'self'",
      // Allow connections to your own API + WebSocket server + GitHub API
      `connect-src 'self' ${allowedOrigins.join(" ")} ws://localhost:8080 wss: https://api.github.com`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  headers: async () => [
    {
      // Apply security headers to all routes
      source: "/(.*)",
      headers: securityHeaders,
    },
    {
      // CORS for your API routes — only allow your own origin
      source: "/api/(.*)",
      headers: [
        {
          key: "Access-Control-Allow-Origin",
          value: process.env.NEXTAUTH_URL || "http://localhost:3000",
        },
        {
          key: "Access-Control-Allow-Methods",
          value: "GET, POST, PUT, DELETE, OPTIONS",
        },
        {
          key: "Access-Control-Allow-Headers",
          value: "Content-Type, Authorization",
        },
        {
          key: "Access-Control-Allow-Credentials",
          value: "true",
        },
      ],
    },
  ],

  // Prevent source maps from leaking in production
  productionBrowserSourceMaps: false,
};

export default nextConfig;
