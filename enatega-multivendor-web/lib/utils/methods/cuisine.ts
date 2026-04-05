import { ICategory, IFood } from "@/lib/utils/interfaces";

export type CuisineGroupKey = "biryani" | "kolkata_chinese" | "snacks_and_drinks";

export interface CuisineSectionConfig {
  key: CuisineGroupKey;
  title: string;
  description: string;
  headerClassName: string;
  pillClassName: string;
}

export interface GroupedCuisineSection extends CuisineSectionConfig {
  categories: ICategory[];
}

const BIRYANI_KEYWORDS = [
  "biryani",
  "rezala",
  "chaap",
  "kebab",
  "korma",
  "kolkata special",
  "mutton",
  "chicken",
];

const KOLKATA_CHINESE_KEYWORDS = [
  "kolkata chinese",
  "hakka",
  "chowmein",
  "noodles",
  "fried rice",
  "manchurian",
  "schezwan",
  "chilli",
];

const SNACKS_AND_DRINKS_KEYWORDS = [
  "sandwich",
  "burger",
  "fries",
  "wrap",
  "momo",
  "momos",
  "drink",
  "beverage",
  "shake",
  "mocktail",
  "cold coffee",
  "roll",
];

const CUISINE_CONFIG: CuisineSectionConfig[] = [
  {
    key: "biryani",
    title: "Authentic Kolkata Biryani Lineup",
    description: "Royal Kolkata biryani selections curated for the main conversion path.",
    headerClassName: "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-100",
    pillClassName: "bg-amber-100 text-amber-800",
  },
  {
    key: "kolkata_chinese",
    title: "Authentic Kolkata Chinese",
    description: "Street-style Indo-Chinese favorites inspired by classic Kolkata taste.",
    headerClassName: "border-red-200 bg-gradient-to-r from-rose-50 to-red-100",
    pillClassName: "bg-red-100 text-red-700",
  },
  {
    key: "snacks_and_drinks",
    title: "Sandwiches, Burgers, Fries, Wraps, Momos & Drinks",
    description: "Fast-moving snack and beverage picks for quick add-ons and combos.",
    headerClassName: "border-sky-200 bg-gradient-to-r from-sky-50 to-cyan-100",
    pillClassName: "bg-sky-100 text-sky-700",
  },
];

function includesAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

function normalizeCategoryText(category: ICategory) {
  const categoryTitle = category.title?.toLowerCase() ?? "";
  const foodText = (category.foods || [])
    .map((food: IFood) => `${food.title || ""} ${food.description || ""} ${food.subCategory || ""}`)
    .join(" ")
    .toLowerCase();
  return `${categoryTitle} ${foodText}`;
}

function getCuisineGroupKey(category: ICategory): CuisineGroupKey {
  const normalized = normalizeCategoryText(category);
  if (includesAnyKeyword(normalized, BIRYANI_KEYWORDS)) return "biryani";
  if (includesAnyKeyword(normalized, KOLKATA_CHINESE_KEYWORDS)) return "kolkata_chinese";
  return "snacks_and_drinks";
}

export function groupCategoriesByCuisine(categories: ICategory[]): GroupedCuisineSection[] {
  const grouped: Record<CuisineGroupKey, ICategory[]> = {
    biryani: [],
    kolkata_chinese: [],
    snacks_and_drinks: [],
  };

  for (const category of categories) {
    const groupKey = getCuisineGroupKey(category);
    grouped[groupKey].push(category);
  }

  return CUISINE_CONFIG.map((config) => ({
    ...config,
    categories: grouped[config.key],
  })).filter((section) => section.categories.length > 0);
}
