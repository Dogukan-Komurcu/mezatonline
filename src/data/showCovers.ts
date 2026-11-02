/** Bundled demo thumbnails keep shared previews independent of external image hosts. */
const COVERS: Record<string, number> = {
  tcg: require('../../assets/demo-covers/pokemon.jpg'),
  sports_cards: require('../../assets/demo-covers/sports_cards.jpg'),
  womens_fashion: require('../../assets/demo-covers/womens_fashion.jpg'),
  sneakers: require('../../assets/demo-covers/sneakers.jpg'),
  toys: require('../../assets/demo-covers/toys.jpg'),
  coins: require('../../assets/demo-covers/coins.jpg'),
  electronics: require('../../assets/demo-covers/electronics.jpg'),
  beauty: require('../../assets/demo-covers/beauty.jpg'),
  mens_fashion: require('../../assets/demo-covers/mens_fashion.jpg'),
  jewelry: require('../../assets/demo-covers/jewelry.jpg'),
  antiques: require('../../assets/demo-covers/antiques.jpg'),
  carpets: require('../../assets/demo-covers/carpets.jpg'),
  bags: require('../../assets/demo-covers/bags.jpg'),
  home_garden: require('../../assets/demo-covers/home_garden.jpg'),
  watches: require('../../assets/demo-covers/watches.jpg'),
  video_games: require('../../assets/demo-covers/video_games.jpg'),
  comics_manga: require('../../assets/demo-covers/comics_manga.jpg'),
  sports_memorabilia: require('../../assets/demo-covers/sports_memorabilia.jpg'),
  crystals: require('../../assets/demo-covers/crystals.jpg'),
  handmade: require('../../assets/demo-covers/handmade.jpg'),
  vintage: require('../../assets/demo-covers/vintage.jpg'),
  books: require('../../assets/demo-covers/books.jpg'),
  music: require('../../assets/demo-covers/vintage.jpg'),
  plants: require('../../assets/demo-covers/plants.jpg'),
  food: require('../../assets/demo-covers/food.jpg'),
  estate: require('../../assets/demo-covers/antiques.jpg'),
  deals: require('../../assets/demo-covers/electronics.jpg'),
};

export function demoShowCover(categoryId: string): number {
  return COVERS[categoryId] ?? COVERS.vintage;
}
