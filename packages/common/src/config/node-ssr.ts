export const NODE_SSR_BUILD_CONFIG = {
  ssr: {
    target: 'node' as const,
  },
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          external: ['fs', 'node:fs'],
        },
      },
    },
  },
}
