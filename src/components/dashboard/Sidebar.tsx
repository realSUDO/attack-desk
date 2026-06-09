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
  { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
  { href: "/board", label: "Missions", icon: "assignment" },
  { href: "/post-lab", label: "Content", icon: "edit_note" },
  { href: "/canvas", label: "Canvas", icon: "auto_fix_high" },
  { href: "/weekly-review", label: "Review", icon: "rate_review" },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="bg-surface-container border-outline-variant fixed top-0 left-0 z-50 flex h-screen w-20 flex-col border-r py-md">
      <div className="flex flex-col items-center gap-md">
        <div className="flex h-12 w-12 items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309 267" className="h-10 w-10">
            <g fill="none" fillRule="evenodd">
              <path d="M186 38 H236 C268 38 290 58 290 92 V174 C290 208 268 229 236 229 H186 V204 H231 C247 204 261 193 261 174 V92 C261 73 247 62 231 62 H186 Z" fill="#F28A5C"/>
              <path d="M118 38 H137 L223 229 H194 L170 174 H113 L123 151 H160 L128 78 L74 229 H47 Z" fill="currentColor" className="text-on-surface"/>
              <path d="M127 112 L145 151 H111 Z" fill="transparent"/>
              <rect x="108" y="145" width="63" height="12" fill="currentColor" className="text-on-surface"/>
            </g>
          </svg>
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
