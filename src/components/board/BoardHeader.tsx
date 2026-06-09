"use client";

import Link from "next/link";

import { MaterialIcon } from "@/components/landing/icons/MaterialIcon";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
};

export function BoardHeader({ search, onSearchChange, onCreate }: Props) {
  return (
    <header className="border-outline-variant bg-background fixed top-0 right-0 z-40 ml-0 flex h-16 w-full items-center justify-between border-b px-margin-mobile md:ml-20 md:w-[calc(100%-80px)] md:px-margin-desktop">
      <div className="flex items-center gap-lg">
        <h1 className="hidden font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md md:block font-extrabold text-primary">
          Mission Board
        </h1>
        <div className="border-outline-variant bg-surface-container flex items-center px-sm py-xs border md:px-md">
          <MaterialIcon
            name="search"
            size={16}
            className="text-on-surface-variant md:size-[18]"
          />
          <input
            type="text"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search..."
            className="font-label-md text-on-surface w-28 border-none bg-transparent placeholder:text-outline focus:ring-0 md:w-64"
          />
        </div>
      </div>

      <div className="flex items-center gap-sm md:gap-lg">
        <button
          type="button"
          onClick={onCreate}
          className="border-primary text-primary font-label-md hover:bg-primary hover:text-on-primary border px-md py-[3px] text-[11px] uppercase tracking-wider transition-colors md:px-lg md:py-xs md:text-label-md"
        >
          New
        </button>

        <Link
          href="/dashboard"
          className="bg-primary text-on-primary font-label-md hover:opacity-90 active:scale-95 hidden px-lg py-xs uppercase tracking-wider transition-all md:inline-block"
        >
          Open Workspace
        </Link>

      </div>
    </header>
  );
}
