import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
import { z } from 'zod'
import { NODE_SSR_BUILD_CONFIG } from '../../packages/common/src/config/node-ssr'

const WEB_BUILD_ENV_KEYS = {
  apiUrl: 'VITE_API_URL',
  dashboardUrl: 'VITE_DASHBOARD_URL',
  supportEmail: 'VITE_SUPPORT_EMAIL',
} as const

const WEB_DEVELOPMENT_SERVER = {
  host: '0.0.0.0',
  hostname: 'web.localhost',
  port: 3001,
  apiPath: '/api',
  apiTarget: 'http://localhost:3000',
} as const

function validateBuildUrl(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required web build environment variable: ${name}`)
  }

  try {
    new URL(value)
  } catch {
    throw new Error(`Invalid web build environment variable: ${name}`)
  }
}

function validateBuildEmail(name: string, value: string | undefined) {
  // Validate with zod directly — do not import app env.schema (pulls @repo/validators .ts).
  const result = z.email().safeParse(value)

  if (!result.success) {
    throw new Error(
      value
        ? `Invalid web build environment variable: ${name}`
        : `Missing required web build environment variable: ${name}`
    )
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  validateBuildUrl(WEB_BUILD_ENV_KEYS.apiUrl, env[WEB_BUILD_ENV_KEYS.apiUrl])
  validateBuildUrl(WEB_BUILD_ENV_KEYS.dashboardUrl, env[WEB_BUILD_ENV_KEYS.dashboardUrl])
  validateBuildEmail(WEB_BUILD_ENV_KEYS.supportEmail, env[WEB_BUILD_ENV_KEYS.supportEmail])

  return {
    ...NODE_SSR_BUILD_CONFIG,
    plugins: [
      tailwindcss(),
      tsConfigPaths(),
      tanstackStart({
        srcDirectory: 'app',
      }),
      react(),
    ],
    server: {
      host: WEB_DEVELOPMENT_SERVER.host,
      allowedHosts: [WEB_DEVELOPMENT_SERVER.hostname],
      port: WEB_DEVELOPMENT_SERVER.port,
      strictPort: true,
      proxy: {
        [WEB_DEVELOPMENT_SERVER.apiPath]: {
          target: WEB_DEVELOPMENT_SERVER.apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: WEB_DEVELOPMENT_SERVER.host,
      port: WEB_DEVELOPMENT_SERVER.port,
      strictPort: true,
    },
  }
})
