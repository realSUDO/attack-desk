import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-outline-variant bg-background py-10">
      <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-6 px-4 md:flex-row md:px-12">
        <div className="flex flex-col items-center gap-1 md:items-start">
          <span className="font-headline-md text-headline-md font-bold text-primary">
            AttackDesk
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            © 2026 PRECISION SYSTEMS INC.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-10 font-label-md text-label-md text-on-surface-variant">
          <Link href="https://discord.com/users/897138227570442240" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">
            Contact
          </Link>
          <Link href="https://x.com/sudo_core" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">
            X / Twitter
          </Link>
        </div>
      </div>
    </footer>
  );
}
