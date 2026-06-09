"use client";

import Link from "next/link";

import { MaterialIcon } from "../landing/icons/MaterialIcon";

type Props = { sessionDate: string };

export function CommandBar({ sessionDate }: Props) {
  return (
    <header className="border-outline-variant bg-background sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b px-margin-mobile md:px-margin-desktop">
      <div className="flex items-center gap-xl">
        <h1 className="font-headline-md text-headline-md font-bold text-primary">
          Command Dashboard
        </h1>
        <div className="hidden items-center text-on-surface-variant md:flex">
          <span className="font-metadata text-metadata mr-sm uppercase tracking-widest">
            Session:
          </span>
          <span className="font-metadata text-metadata text-on-surface">
            {sessionDate}
          </span>
        </div>
      </div>

      <Link
        href="/board"
        className="bg-primary text-on-primary font-label-md text-label-md active:scale-95 flex items-center gap-sm px-lg py-sm uppercase tracking-wider transition-transform"
      >
        <MaterialIcon name="add" size={14} />
        New Mission
      </Link>
    </header>
  );
}
