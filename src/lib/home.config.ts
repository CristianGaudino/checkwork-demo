// What the home page shows, in one place. A clone changes these, not the page.
export const HOME = {
  featuredCount: 6, // cars in the featured grid
  shopByTypeMax: 6, // body-type tiles
  makeChipsMax: 12, // brand chips
  heroPhoto: "/brand/hero.webp", // the big hero tile (1920x819)
  heroPhotoSmall: "/brand/hero-sm.webp", // the same photo at 960 wide, for phones
} as const;
