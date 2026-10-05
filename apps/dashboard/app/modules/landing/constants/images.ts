function localImage(path: string) {
  return {
    src: path,
    srcSet: path,
  }
}

export const LANDING_IMAGES = {
  hero: localImage('/landing/hero.webp'),
  audiences: localImage('/landing/audiences.jpg'),
  value: localImage('/landing/value.webp'),
  demoPoster: localImage('/landing/owner-promo-poster.jpg'),
} as const
