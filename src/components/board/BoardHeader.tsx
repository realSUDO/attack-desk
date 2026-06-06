import Link from "next/link";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

export function BoardHeader() {
  return (
    <header className="border-outline-variant bg-background fixed top-0 right-0 z-40 ml-20 flex h-16 w-[calc(100%-80px)] items-center justify-between border-b px-margin-mobile md:px-margin-desktop">
      <div className="flex items-center gap-lg">
        <h1 className="font-headline-md text-headline-md font-extrabold text-primary">
          Mission Board
        </h1>
        <div className="border-outline-variant bg-surface-container flex items-center px-md py-xs border">
          <MaterialIcon
            name="search"
            size={18}
            className="text-on-surface-variant"
          />
          <input
            type="text"
            placeholder="Search missions..."
            className="font-label-md text-on-surface w-64 border-none bg-transparent placeholder:text-outline focus:ring-0"
          />
        </div>
      </div>

      <div className="flex items-center gap-lg">
        <div className="flex items-center gap-md">
          <button
            type="button"
            aria-label="Notifications"
            className="text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
          >
            <MaterialIcon name="notifications" size={20} />
          </button>
          <button
            type="button"
            aria-label="More options"
            className="text-on-surface-variant hover:text-primary cursor-pointer transition-colors"
          >
            <MaterialIcon name="more_vert" size={20} />
          </button>
        </div>

        <Link
          href="/dashboard"
          className="bg-primary text-on-primary font-label-md hover:opacity-90 active:scale-95 px-lg py-xs uppercase tracking-wider transition-all"
        >
          Open Workspace
        </Link>

        <div className="border-outline-variant bg-surface-container-highest h-8 w-8 overflow-hidden border">
          {/* eslint-disable-next-line @next/next/no-img-element -- matches original HTML */}
          <img
            alt="User Profile"
            className="h-full w-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuApdv6npYt1WPvchC8KJGyy6mK-uOWL1u-Azj7Zgjm2ub25FXoDeiICIV8lx3SY6kuDbG-QICudD_7dHiVmYmx1xoSdPK2qFPFSCQVZA9Qppnq1QOXhIWvzACSyiPA7wLwPLSS2-n9N-rl63lZLJhXbBjxt7hF8NPtyaS684FEkJ5AAcpQ0FDak83LrN8fQ7QEdtonRDc1J9V5Og2d-licnxVPM0k3PFWJBTPKvzD6zuwV-0wx5tjtxopAdYtOUbpVb6vwTx2yQ_H4"
          />
        </div>
      </div>
    </header>
  );
}
