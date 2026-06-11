import LogoLink from "./LogoLink";

export function StoreHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <LogoLink />
        {right && <div className="ml-auto">{right}</div>}
      </div>
    </header>
  );
}
