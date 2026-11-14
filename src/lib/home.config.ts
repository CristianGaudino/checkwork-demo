// What the home page shows, in one place. A clone changes these, not the page.
export const HOME = {
  featuredCount: 6, // cars in the featured grid
  shopByTypeMax: 6, // Browse by type tiles
  makeChipsMax: 20, // make chips: the makes in stock, then the popular ones
  heroTitle: "Find your next car",
  heroIntro: "A carefully selected range of quality used cars, backed by trusted service and straightforward finance.",
  heroPhoto: "/brand/hero.webp", // the big hero tile (1448x1086, 4:3: cropped by its box)
  heroPhotoSmall: "/brand/hero-sm.webp", // the same photo at 960 wide, for phones
} as const;
