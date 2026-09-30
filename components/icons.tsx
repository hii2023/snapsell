// Minimal Lucide-style line icons (24x24, currentColor). No emojis.
type P = { className?: string };
const base = "h-6 w-6";

export function CameraIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

export function ShirtIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.4 5.6 16 3l-1.5 1.5a3.5 3.5 0 0 1-5 0L8 3 3.6 5.6 6 10l2-1v11h8V9l2 1 2.4-4.4Z" />
    </svg>
  );
}

export function FoodIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3v7a2 2 0 0 0 4 0V3M6 11v10M11 3c-1 1-1.5 2.5-1.5 4.5S10 21 11 21V3Z" />
      <path d="M18 3c-2 0-3 2.5-3 5s1 4 3 4M18 12v9" />
    </svg>
  );
}

export function ElectronicsIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="2" width="12" height="20" rx="2.5" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function FurnitureIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
      <path d="M3 11a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5H1v-5a2 2 0 0 1 2-2Z" />
      <path d="M5 19v2M19 19v2" />
    </svg>
  );
}

export function CleaningIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3h3v3h-3zM11.5 6v2M8 8h7a1 1 0 0 1 1 1v3H7V9a1 1 0 0 1 1-1Z" />
      <rect x="7" y="12" width="9" height="9" rx="1.5" />
      <path d="M4 7l2-1M4 10l2-0.5" />
    </svg>
  );
}

export function JewelleryIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 3 3 4 3-4M7 3h10l3 4-8 9-8-9 3-4Z" />
      <path d="M4 7h16" />
    </svg>
  );
}

export function CosmeticsIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8.5" y="9" width="7" height="12" rx="1.5" />
      <path d="M10.5 9V5.5a1.5 1.5 0 0 1 3 0V9M12 3v2.5" />
    </svg>
  );
}

export function CheckIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ArrowLeftIcon({ className = "h-5 w-5" }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

export function BagIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export function BooksIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

export function HomeIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

export function HandbagIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h16l-1.2 12a1 1 0 0 1-1 .9H6.2a1 1 0 0 1-1-.9L4 8Z" />
      <path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2" />
    </svg>
  );
}

export function RecycleIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.5 12a8.5 8.5 0 0 1-8.5 8.5 8.5 8.5 0 0 1-7.1-3.8" />
      <path d="M3.5 12A8.5 8.5 0 0 1 12 3.5a8.5 8.5 0 0 1 7.1 3.8" />
      <path d="M19.4 3.4v4h-4" />
      <path d="M4.6 20.6v-4h4" />
    </svg>
  );
}

export function ShoeIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 17.5V9h3l2.5 2.5L13 13l6 1.5a3 3 0 0 1 2.4 2.9v.6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1.5Z" />
      <path d="M8 11.5 9.5 10M11 12.5 12.5 11" />
    </svg>
  );
}

export function ToyIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="9" height="9" rx="1.5" />
      <circle cx="17" cy="16.5" r="4.5" />
      <path d="m11 3 3.5 7h-7L11 3Z" />
    </svg>
  );
}

export function SportsIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3.4 9h17.2M3.4 15h17.2" />
    </svg>
  );
}

export function PencilIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5L16.5 3.5Z" />
      <path d="m14.5 5.5 3 3" />
    </svg>
  );
}

export function PlantIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5.5 13h13l-1 7a1 1 0 0 1-1 .9H7.5a1 1 0 0 1-1-.9l-1-7Z" />
      <path d="M12 13V8" />
      <path d="M12 9c-3 0-4.5-1.5-4.5-4.5C10.5 4.5 12 6 12 9ZM12 10c2.5 0 4-1.2 4-3.7-2.5 0-4 1.2-4 3.7Z" />
    </svg>
  );
}

export function PawIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="7" cy="9" rx="2" ry="2.6" />
      <ellipse cx="17" cy="9" rx="2" ry="2.6" />
      <ellipse cx="10.5" cy="5" rx="1.9" ry="2.4" />
      <ellipse cx="14.5" cy="5.4" rx="1.7" ry="2.2" />
      <path d="M12 12c2.6 0 4.6 1.9 4.6 4.2 0 2-1.5 3.3-3.4 3.3h-2.4c-1.9 0-3.4-1.3-3.4-3.3C7.4 13.9 9.4 12 12 12Z" />
    </svg>
  );
}

export function MoreIcon({ className = base }: P) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

// A custom category the owner adds in the C-Panel has no icon assigned to it, so
// one is inferred from its name. The id is the slugified label plus a random
// 4-char suffix ("bags-purses-vqfi"), so matching whole words in it is the same
// as matching words in the label — and matching WORDS rather than substrings is
// what keeps "carpet" out of pets and "category" out of cats.
const CUSTOM_ICONS: { words: string[]; Icon: (p: P) => React.ReactElement }[] = [
  { words: ["upcycl", "recycl", "revibe", "eco", "sustainab", "preloved"], Icon: RecycleIcon },
  { words: ["bag", "purse", "clutch", "wallet", "backpack", "luggage", "pouch"], Icon: HandbagIcon },
  { words: ["shoe", "footwear", "sandal", "sneaker", "heel", "slipper", "boot"], Icon: ShoeIcon },
  { words: ["toy", "game", "puzzle", "doll", "kid"], Icon: ToyIcon },
  { words: ["sport", "fitness", "gym", "bicycle", "cycling", "outdoor"], Icon: SportsIcon },
  { words: ["stationer", "craft", "paint", "sketch", "art", "hobby"], Icon: PencilIcon },
  { words: ["pet", "dog", "cat", "puppy", "kitten", "animal"], Icon: PawIcon },
  { words: ["plant", "garden", "planter", "decor", "flower"], Icon: PlantIcon },
  { words: ["home", "house", "kitchen", "utensil", "crockery", "cookware"], Icon: HomeIcon },
];

function customIcon(id: string): ((p: P) => React.ReactElement) | null {
  // Drop the random suffix so it can never match a keyword by accident.
  const words = id.split("-").slice(0, -1);
  if (!words.length) return null;
  for (const { words: keys, Icon } of CUSTOM_ICONS) {
    if (words.some((w) => keys.some((k) => w.startsWith(k)))) return Icon;
  }
  return null;
}

// `id` is a plain string because it can be a custom category the owner added in
// the C-Panel. Those are matched by name above, and anything still unrecognised
// falls through to the generic tiles icon.
export function CategoryIcon({ id, className = "h-8 w-8" }: { id: string; className?: string }) {
  if (id === "apparel") return <ShirtIcon className={className} />;
  if (id === "food") return <FoodIcon className={className} />;
  if (id === "electronics") return <ElectronicsIcon className={className} />;
  if (id === "cleaning") return <CleaningIcon className={className} />;
  if (id === "jewellery") return <JewelleryIcon className={className} />;
  if (id === "cosmetics") return <CosmeticsIcon className={className} />;
  if (id === "books") return <BooksIcon className={className} />;
  if (id === "furniture") return <FurnitureIcon className={className} />;
  if (id === "more") return <MoreIcon className={className} />;
  const Custom = customIcon(id);
  return Custom ? <Custom className={className} /> : <MoreIcon className={className} />;
}
