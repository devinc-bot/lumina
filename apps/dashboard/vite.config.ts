import { defineConfig, loadEnv } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { z } from 'zod'
import { NODE_SSR_BUILD_CONFIG } from '../../packages/common/src/config/node-ssr.ts'

const DASHBOARD_BUILD_ENV_KEYS = {
  apiUrl: 'VITE_API_URL',
  supportEmail: 'VITE_SUPPORT_EMAIL',
} as const

const DASHBOARD_DEVELOPMENT_SERVER = {
  host: '0.0.0.0',
  hostname: 'dashboard.localhost',
  port: 3002,
  apiPath: '/api',
  apiTarget: 'http://localhost:3000',
} as const

function validateBuildUrl(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required dashboard build environment variable: ${name}`)
  }

  try {
    new URL(value)
  } catch {
    throw new Error(`Invalid dashboard build environment variable: ${name}`)
  }
}

function validateBuildEmail(name: string, value: string | undefined) {
  // Validate with zod directly — do not import app env.schema (pulls @repo/validators .ts).
  const result = z.email().safeParse(value)

  if (!result.success) {
    throw new Error(
      value
        ? `Invalid dashboard build environment variable: ${name}`
        : `Missing required dashboard build environment variable: ${name}`
    )
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  validateBuildUrl(DASHBOARD_BUILD_ENV_KEYS.apiUrl, env[DASHBOARD_BUILD_ENV_KEYS.apiUrl])
  validateBuildEmail(
    DASHBOARD_BUILD_ENV_KEYS.supportEmail,
    env[DASHBOARD_BUILD_ENV_KEYS.supportEmail]
  )

  return {
    ...NODE_SSR_BUILD_CONFIG,
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tailwindcss(),
      tanstackStart({
        srcDirectory: 'app',
      }),
      react(),
    ],
    resolve: {
      tsconfigPaths: true,
    },
    optimizeDeps: {
      exclude: ['maplibre-gl'],
    },
    server: {
      host: DASHBOARD_DEVELOPMENT_SERVER.host,
      allowedHosts: [DASHBOARD_DEVELOPMENT_SERVER.hostname],
      port: DASHBOARD_DEVELOPMENT_SERVER.port,
      strictPort: true,
      proxy: {
        [DASHBOARD_DEVELOPMENT_SERVER.apiPath]: {
          target: DASHBOARD_DEVELOPMENT_SERVER.apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: DASHBOARD_DEVELOPMENT_SERVER.host,
      port: DASHBOARD_DEVELOPMENT_SERVER.port,
      strictPort: true,
    },
  }
})
