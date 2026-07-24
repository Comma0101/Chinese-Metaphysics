"use client";

import Link from "next/link";
import { trackCTA } from "@/lib/track";

export function TrackedLink({
  href,
  className,
  children,
  label,
  location,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
  label: string;
  location: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackCTA(label, location)}
    >
      {children}
    </Link>
  );
}
