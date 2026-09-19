import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { LANDING_VIDEOS } from './videos'

const publicLandingDir = join(dirname(fileURLToPath(import.meta.url)), '../../../../public/landing')

test('LANDING_VIDEOS.promo points at the local HyperFrames owner promo', () => {
  expect(LANDING_VIDEOS).toHaveProperty('promo')
  expect(LANDING_VIDEOS.promo).toBe('/landing/owner-promo.mp4')
  expect(LANDING_VIDEOS.promo.startsWith('/landing/')).toBe(true)
  expect(existsSync(join(publicLandingDir, 'owner-promo.mp4'))).toBe(true)
})

test('LANDING_VIDEOS no longer exposes a hero background video key', () => {
  expect(LANDING_VIDEOS).not.toHaveProperty('hero')
})
