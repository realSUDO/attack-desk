import Link from "next/link";

import { MaterialIcon } from "./icons/MaterialIcon";

export function Header() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-background px-4 md:px-12">
      <Link href="/" className="flex items-center text-primary">
        <span className="font-headline-md text-headline-md font-bold">
          AttackDesk
        </span>
      </Link>

      <nav className="hidden items-center gap-6 md:flex">
        <Link
          href="#methodology"
          className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary"
        >
          Manifesto
        </Link>
        <Link
          href="#pricing"
          className="font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary"
        >
          Pricing
        </Link>
        <Link
          href="/dashboard"
          className="border border-[#ff9166] bg-[#ff9166] px-4 py-2 font-label-md text-label-md text-[#0d0d0d] shadow-[2px_2px_0px_#0d0d0d] transition-all duration-200 hover:bg-transparent hover:text-[#ff9166] hover:shadow-none"
        >
          Open Workspace
        </Link>
      </nav>

      <button
        type="button"
        aria-label="Open menu"
        className="cursor-pointer text-primary md:hidden"
      >
        <MaterialIcon name="menu" size={24} />
      </button>
    </header>
  );
}
