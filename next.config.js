const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root. A stray package-lock.json higher up (e.g. in the
  // home directory) otherwise makes Turbopack treat that directory as the
  // project root: it then watches and indexes everything under it, the dev
  // server pegs the CPU, and client components fail with "Could not find the
  // module … in the React Client Manifest".
  turbopack: { root: __dirname },
}

module.exports = withNextIntl(nextConfig)
