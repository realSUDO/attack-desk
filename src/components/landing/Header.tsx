import Link from "next/link";

import { MaterialIcon } from "./icons/MaterialIcon";

export function Header() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-background px-4 md:px-12">
      <Link href="/" className="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 309 267" className="h-8 w-8">
          <g fill="none" fillRule="evenodd">
            <path d="M186 38 H236 C268 38 290 58 290 92 V174 C290 208 268 229 236 229 H186 V204 H231 C247 204 261 193 261 174 V92 C261 73 247 62 231 62 H186 Z" fill="#F28A5C"/>
            <path d="M118 38 H137 L223 229 H194 L170 174 H113 L123 151 H160 L128 78 L74 229 H47 Z" fill="currentColor"/>
            <path d="M127 112 L145 151 H111 Z" fill="transparent"/>
            <rect x="108" y="145" width="63" height="12" fill="currentColor"/>
          </g>
        </svg>
      </Link>

      <nav className="flex items-center gap-6">
        <Link
          href="#methodology"
          className="hidden font-label-md text-label-md text-on-surface-variant transition-colors hover:text-primary md:inline-block"
        >
          Manifesto
        </Link>
        <Link
          href="/dashboard"
          className="border border-[#ff9166] bg-[#ff9166] px-4 py-2 font-label-md text-label-md text-[#0d0d0d] shadow-[2px_2px_0px_#0d0d0d] transition-all duration-200 hover:bg-transparent hover:text-[#ff9166] hover:shadow-none"
        >
          Open Workspace
        </Link>
      </nav>
    </header>
  );
}
