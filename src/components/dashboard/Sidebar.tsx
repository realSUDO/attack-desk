"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MaterialIcon } from "../landing/icons/MaterialIcon";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navItems: ReadonlyArray<NavItem> = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
  { href: "/board", label: "Missions", icon: "assignment" },
  { href: "/post-lab", label: "Content", icon: "edit_note" },
  { href: "/canvas", label: "Canvas", icon: "auto_fix_high" },
  { href: "/weekly-review", label: "Review", icon: "rate_review" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="bg-surface-container border-outline-variant fixed top-0 left-0 z-50 flex h-screen w-20 flex-col border-r py-lg">
      <div className="flex flex-col items-center gap-xl">
        <div className="font-headline-md text-headline-md font-bold text-primary">
          AD
        </div>
        <nav className="flex w-full flex-col gap-sm">
          {navItems.map(({ href, label, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={label}
                href={href}
                className={`group flex h-16 w-full flex-col items-center justify-center transition-colors duration-200 ${
                  active
                    ? "border-primary text-primary bg-surface-container-high scale-95 border-l-2 transition-transform"
                    : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                }`}
              >
                <MaterialIcon name={icon} size={20} />
                <span className="font-label-sm mt-1 text-[10px]">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto flex flex-col items-center gap-sm">
        <Link
          href="/showcase"
          aria-label="Showcase"
          className="text-on-surface-variant hover:text-on-surface flex h-12 w-full flex-col items-center justify-center transition-colors duration-200"
        >
          <MaterialIcon name="analytics" size={20} />
        </Link>
      </div>
    </aside>
  );
}
