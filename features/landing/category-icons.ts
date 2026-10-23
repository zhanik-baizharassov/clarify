import {
  Armchair,
  Baby,
  BedDouble,
  BookOpen,
  Camera,
  Car,
  Coffee,
  Croissant,
  Dumbbell,
  Flower2,
  GraduationCap,
  Glasses,
  Landmark,
  Laptop,
  Leaf,
  Pill,
  PawPrint,
  Plane,
  Scale,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Shirt,
  Smartphone,
  Sparkles,
  Stethoscope,
  Tag,
  UtensilsCrossed,
  Waves,
  Monitor,
  type LucideIcon,
} from "lucide-react";

// First matching fragment wins; categories are admin-editable, so match loosely.
const ICON_RULES: Array<[string[], LucideIcon]> = [
  [["kafe", "kofej", "coffee", "cafe"], Coffee],
  [["restoran", "stolov", "fast-food", "food"], UtensilsCrossed],
  [["pekarn", "bakery", "konditer"], Croissant],
  [["produkt", "grocery"], ShoppingCart],
  [["odezhd", "obuv", "clothes", "himchist", "atele"], Shirt],
  [["elektron", "electronics"], Monitor],
  [["cvetoch", "flowers"], Flower2],
  [["apteki", "pharmacy"], Pill],
  [["laborat", "medicin", "stomat", "klinik"], Stethoscope],
  [["veterin", "pets"], PawPrint],
  [["kosmet", "cosmetic"], Sparkles],
  [["detsk", "kids"], Baby],
  [["telefon", "phone"], Smartphone],
  [["servis-centr", "pc-repair", "kompyut"], Laptop],
  [["salony", "parikmah", "barbershop", "beauty"], Scissors],
  [["spa"], Leaf],
  [["fitnes", "fitness", "sport"], Dumbbell],
  [["avto", "prokat"], Car],
  [["bank", "obmen", "lombard", "strah"], Landmark],
  [["otel", "hostel"], BedDouble],
  [["shkol", "obrazov", "yazyk", "kurs"], GraduationCap],
  [["optik"], Glasses],
  [["bassejn"], Waves],
  [["turagent"], Plane],
  [["knizh", "kancel"], BookOpen],
  [["mebel"], Armchair],
  [["foto"], Camera],
  [["notar"], Scale],
  [["magazin", "torgov"], ShoppingBag],
];

export function categoryIcon(slug: string): LucideIcon {
  const s = slug.toLowerCase();
  for (const [fragments, icon] of ICON_RULES) {
    if (fragments.some((f) => s.includes(f))) return icon;
  }
  return Tag;
}
