import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const loaderSource = readFileSync(join(here, 'loader.tsx'), 'utf8')
const globalsSource = readFileSync(join(here, '../../globals.css'), 'utf8')

function styleVarAssignment(source: string, name: 'on' | 'off'): string {
  const match = source.match(new RegExp(`['"]--${name}['"]:\\s*['"]([^'"]+)['"]`))
  expect(match, `expected Loader style --${name} assignment`).not.toBeNull()
  return match![1]
}

function cssVarHex(css: string, varName: string): string | null {
  const block = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1]
  if (!block) return null
  const match = block.match(new RegExp(`${escapeRegExp(varName)}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  return match?.[1] ?? null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  const r = srgbChannelToLinear((value >> 16) & 255)
  const g = srgbChannelToLinear((value >> 8) & 255)
  const b = srgbChannelToLinear(value & 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

test('loader fill uses shared dark theme tokens', () => {
  expect(styleVarAssignment(loaderSource, 'on')).toBe('var(--color-loader-on)')
  expect(styleVarAssignment(loaderSource, 'off')).toBe('var(--color-loader-off)')
})

test('globals define a bright loader accent for the dark surface', () => {
  const darkLoaderOn = cssVarHex(globalsSource, '--color-loader-on')

  expect(darkLoaderOn, 'expected --color-loader-on hex in @theme').toBeTruthy()
  expect(relativeLuminance(darkLoaderOn!)).toBeGreaterThan(0.4)
})

test('globals do not include light-theme overrides', () => {
  expect(globalsSource).not.toMatch(/\[data-theme\s*=\s*['"]light['"]\]/)
})
