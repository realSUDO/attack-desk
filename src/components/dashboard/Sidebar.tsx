"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { signOut, useSession } from "next-auth/react";

import { MaterialIcon } from "../landing/icons/MaterialIcon";

type NavItem = { href: string; label: string; icon: string };

const navItems: ReadonlyArray<NavItem> = [
  { href: "/dashboard", label: "Dashboard", icon: "grid_view" },
  { href: "/board",     label: "Missions",  icon: "assignment" },
  { href: "/post-lab",  label: "Content",   icon: "edit_note" },
  { href: "/canvas",    label: "Canvas",    icon: "auto_fix_high" },
  { href: "/weekly-review", label: "Review", icon: "rate_review" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function subscribeToDark(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

export function Sidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const dark = useSyncExternalStore(subscribeToDark, () => document.documentElement.classList.contains("dark"), () => true);
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    for (const item of navItems) {
      router.prefetch(item.href);
    }
  }, [router]);

  return (
    <>
      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`bg-surface-container border-outline-variant fixed top-0 left-0 z-50 flex h-screen w-20 flex-col items-center border-r py-md transition-transform duration-200 dark:border-primary ${
          open ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        {/* Logo */}
        <Link href="/" aria-label="Home" className="mb-md flex h-12 w-12 items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309 267" className="h-10 w-10">
            <g fill="none" fillRule="evenodd">
              <path d="M186 38 H236 C268 38 290 58 290 92 V174 C290 208 268 229 236 229 H186 V204 H231 C247 204 261 193 261 174 V92 C261 73 247 62 231 62 H186 Z" fill="#F28A5C"/>
              <path d="M118 38 H137 L223 229 H194 L170 174 H113 L123 151 H160 L128 78 L74 229 H47 Z" fill="currentColor"/>
              <path d="M127 112 L145 151 H111 Z" fill="transparent"/>
              <rect x="108" y="145" width="63" height="12" fill="currentColor"/>
            </g>
          </svg>
        </Link>

        {/* Nav */}
        <nav className="flex w-full flex-col gap-sm">
          {navItems.map(({ href, label, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={label}
                href={href}
                onMouseEnter={() => router.prefetch(href)}
                className={`flex h-16 w-full flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                  active
                    ? "border-l-2 border-primary bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                }`}
              >
                <MaterialIcon name={icon} size={20} />
                <span className="text-[10px] leading-none">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Middle empty space — toggle centered here */}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label="Toggle dark mode"
            onClick={() => document.documentElement.classList.toggle("dark")}
            className="group relative flex h-14 w-7 flex-col items-center justify-between border border-outline bg-surface-container-highest py-1 transition-colors hover:border-primary"
          >
            <MaterialIcon name="light_mode" size={13} className="z-10 text-on-surface" />
            <MaterialIcon name="dark_mode"  size={13} className="z-10 text-on-surface" />
            <span
              className="absolute left-[2px] right-[2px] h-[22px] bg-primary transition-[top] duration-300 ease-in-out"
              style={{ top: dark ? "calc(100% - 26px)" : "3px" }}
            />
          </button>
        </div>

        {/* Auth */}
        {status === "authenticated" && session?.user ? (
          <div className="flex flex-col items-center gap-2 pb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
              {(session.user.name ?? session.user.email ?? "U").charAt(0).toUpperCase()}
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-on-surface-variant hover:text-on-surface text-[9px] transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : status === "loading" ? (
          <div className="pb-3">
            <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-surface-container-highest" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pb-3">
            <Link
              href="/login"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-outline text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              <MaterialIcon name="person" size={18} />
            </Link>
            <Link href="/login" className="text-on-surface-variant hover:text-on-surface text-[9px] transition-colors">
              Sign in
            </Link>
          </div>
        )}

        {/* Sidebar toggle tab — mobile only, slides with the sidebar */}
        <button
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen((v) => !v)}
          className="absolute left-full top-1/2 -translate-y-1/2 z-10 flex h-28 w-[34px] items-center justify-center border border-l-0 border-outline-variant bg-surface-container shadow-sm transition-colors hover:bg-surface-container-higher dark:border-primary md:hidden"
          style={{ clipPath: "polygon(0% 0%, 100% 15%, 100% 85%, 0% 100%)" }}
        >
          <MaterialIcon name={open ? "chevron_left" : "chevron_right"} size={16} />
        </button>
      </aside>
    </>
  );
}
