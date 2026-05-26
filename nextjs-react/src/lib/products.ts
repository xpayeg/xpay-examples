export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in piasters (smallest unit)
  currency: string;
  category: string;
  image: string; // filename in /shop/
}

export const products: Product[] = [
  {
    id: "prod_top",
    name: "Essential Cotton Top",
    description:
      "Lightweight breathable cotton top with a relaxed fit. Perfect for layering or wearing on its own.",
    price: 95000,
    currency: "EGP",
    category: "Clothing",
    image: "top.png",
  },
  {
    id: "prod_shorts",
    name: "Performance Shorts",
    description:
      "Quick-dry athletic shorts with a secure zip pocket and elastic waistband for all-day comfort.",
    price: 120000,
    currency: "EGP",
    category: "Clothing",
    image: "shorts.png",
  },
  {
    id: "prod_shoes",
    name: "Running Shoes",
    description:
      "Engineered mesh upper with responsive cushioning. Built for speed and long-distance comfort.",
    price: 280000,
    currency: "EGP",
    category: "Clothing",
    image: "shoes.png",
  },
  {
    id: "prod_phone",
    name: "Smartphone Pro",
    description:
      "6.7-inch OLED display, 48MP triple camera system, and all-day battery life in a titanium frame.",
    price: 2200000,
    currency: "EGP",
    category: "Electronics",
    image: "phone.png",
  },
  {
    id: "prod_laptop",
    name: "Ultra Laptop",
    description:
      "14-inch Retina display, M-series chip, 16GB unified memory, and up to 18 hours of battery life.",
    price: 4200000,
    currency: "EGP",
    category: "Electronics",
    image: "laptop.png",
  },
  {
    id: "prod_tablet",
    name: "Tablet Air",
    description:
      "11-inch Liquid Retina display with Apple Pencil support. The perfect canvas for work and play.",
    price: 1600000,
    currency: "EGP",
    category: "Electronics",
    image: "tablet.png",
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function formatPrice(amount: number, currency: string): string {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}
