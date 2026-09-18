import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import tsConfigPaths from 'vite-tsconfig-paths'
import { NODE_SSR_BUILD_CONFIG } from '../../packages/common/src/config/node-ssr'

const ADMIN_BUILD_ENV_KEY = 'VITE_API_URL'

const ADMIN_DEVELOPMENT_SERVER = {
  host: '0.0.0.0',
  hostname: 'admin.localhost',
  port: 3003,
  apiPath: '/api',
  apiTarget: 'http://localhost:3000',
} as const

function validateAdminBuildEnv(value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required admin build environment variable: ${ADMIN_BUILD_ENV_KEY}`)
  }

  try {
    new URL(value)
  } catch {
    throw new Error(`Invalid admin build environment variable: ${ADMIN_BUILD_ENV_KEY}`)
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  validateAdminBuildEnv(env[ADMIN_BUILD_ENV_KEY])

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
      host: ADMIN_DEVELOPMENT_SERVER.host,
      allowedHosts: [ADMIN_DEVELOPMENT_SERVER.hostname],
      port: ADMIN_DEVELOPMENT_SERVER.port,
      strictPort: true,
      proxy: {
        [ADMIN_DEVELOPMENT_SERVER.apiPath]: {
          target: ADMIN_DEVELOPMENT_SERVER.apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: ADMIN_DEVELOPMENT_SERVER.host,
      port: ADMIN_DEVELOPMENT_SERVER.port,
      strictPort: true,
    },
  }
})
