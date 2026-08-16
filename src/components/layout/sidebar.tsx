"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Gavel,
  LayoutList,
  Radar,
  Settings,
  Sparkles,
  Users,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/deals", label: "Pipeline", icon: LayoutList },
  { href: "/deals", label: "Deals", icon: CircleDollarSign },
  { href: "/buyers", label: "Buyers", icon: Users },
  { href: "/buyers/canadian", label: "Canadian", icon: Users },
  { href: "/tasks", label: "Tasks", icon: Gavel },
  { href: "/scraper", label: "Scraper", icon: Radar },
  { href: "/intelligence", label: "Intelligence", icon: Sparkles },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/markets", label: "Markets", icon: MapPinned },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-slate-900 text-stone-100">
      <div className="border-b border-slate-700 px-5 py-5">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-stone-300" />
          <div>
            <p className="font-[family-name:var(--font-display)] text-lg leading-none tracking-tight">
              Deal Desk
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
              Wholesale ops
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/today" &&
              item.href !== "/buyers" &&
              pathname.startsWith(item.href)) ||
            (item.href === "/buyers" && pathname === "/buyers");
          const Icon = item.icon;
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-700 p-4 text-[11px] leading-relaxed text-slate-400">
        DRAFT — not legal advice. Attorney/title review required.
      </div>
    </aside>
  );
}
