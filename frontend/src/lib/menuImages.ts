import type { MenuItemDto } from "@/types";

const CATEGORY_PHOTOS: Record<string, string> = {
  Starters: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
  "Main Course": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  Roti: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=900&q=80",
  Rice: "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=900&q=80",
  Drinks: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80",
  Dessert: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80",
  Maharashtrian: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  "South Indian": "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80",
};

const NON_VEG_PHOTO = "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80";

const DISH_PHOTOS: Record<string, string> = {
  "Paneer Tikka": "https://images.pexels.com/photos/20395267/pexels-photo-20395267.jpeg",
  "Chicken Tikka": "https://images.pexels.com/photos/30749024/pexels-photo-30749024.jpeg",
  "Veg Manchurian": "https://images.pexels.com/photos/28674530/pexels-photo-28674530.jpeg",
  "Paneer Butter Masala": "https://images.pexels.com/photos/9609838/pexels-photo-9609838.jpeg",
  "Dal Fry": "https://images.pexels.com/photos/30203314/pexels-photo-30203314.jpeg",
  "Butter Chicken": "https://images.pexels.com/photos/12737809/pexels-photo-12737809.jpeg",
  "Butter Naan": "https://images.pexels.com/photos/12737664/pexels-photo-12737664.jpeg",
  "Tandoori Roti": "https://images.pexels.com/photos/12737800/pexels-photo-12737800.jpeg",
  "Jeera Rice": "https://images.pexels.com/photos/35267286/pexels-photo-35267286.jpeg",
  "Veg Biryani": "https://images.pexels.com/photos/7593230/pexels-photo-7593230.jpeg",
  "Masala Chai": "https://images.pexels.com/photos/36326292/pexels-photo-36326292.jpeg",
  "Fresh Lime Soda": "https://images.pexels.com/photos/31621373/pexels-photo-31621373.jpeg",
  "Gulab Jamun": "https://images.pexels.com/photos/7406887/pexels-photo-7406887.jpeg",
  "Ice Cream": "https://images.pexels.com/photos/7491892/pexels-photo-7491892.jpeg",
  "Misal Pav": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
  "Vada Pav": "https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80",
  "Puran Poli": "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=900&q=80",
  "Bharli Vangi": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  "Zunka Bhakri": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  "Kolhapuri Chicken": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80",
  "Idli Sambar": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=900&q=80",
  "Masala Dosa": "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80",
  "Medu Vada": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=900&q=80",
  "Vegetable Uttapam": "https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=80",
  "Lemon Rice": "https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=900&q=80",
  "Chicken Chettinad": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80",
  "Egg Bhurji": "https://plus.unsplash.com/premium_photo-1725522716793-d6c18798ccfb?auto=format&fit=crop&w=900&q=80",
  "Masala Omelette": "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=900&q=80",
  "Egg Curry": "https://images.unsplash.com/photo-1764315197254-94385571df22?auto=format&fit=crop&w=900&q=80",
  "Egg Fried Rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
};

export function getDishPhoto(item: MenuItemDto): string {
  if (DISH_PHOTOS[item.name]) return DISH_PHOTOS[item.name];
  if (item.imageUrl) return item.imageUrl;
  if (item.vegType === "Egg") return "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=80";
  if (item.vegType === "NonVeg") return NON_VEG_PHOTO;
  return CATEGORY_PHOTOS[item.categoryName] ?? CATEGORY_PHOTOS["Main Course"];
}
