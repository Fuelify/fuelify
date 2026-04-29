// Ported from: lib/models/food.dart

export interface Food {
  name: string;
  designation: string;
  userFavorites: number;
  age: number;
  imgUrl: string;
  location: string;
  bio: string;
  isLiked: boolean;
  isDisliked: boolean;
  isFavorited: boolean;
}

export function createDefaultFood(overrides: Partial<Food> & Pick<Food, 'name' | 'designation' | 'userFavorites' | 'age' | 'imgUrl' | 'location' | 'bio'>): Food {
  return {
    isLiked: false,
    isDisliked: false,
    isFavorited: false,
    ...overrides,
  };
}
