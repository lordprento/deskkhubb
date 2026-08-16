"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Gavel,
  LayoutList,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Settings,
  Sparkles,
  Users,
  MapPinned,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = !collapsed || hovered;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "sticky top-0 flex h-screen shrink-0 flex-col border-r border-white/10 bg-slate-900/80 text-slate-100 backdrop-blur transition-all duration-300",
        expanded ? "w-60" : "w-[4.25rem]",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-4">
        <div className="flex min-w-0 items-center gap-2.5 overflow-hidden px-1">
          <Building2 className="h-5 w-5 shrink-0 text-sky-300 transition-transform duration-300 group-hover:scale-110" />
          <div
            className={cn(
              "min-w-0 transition-all duration-300",
              expanded ? "opacity-100" : "pointer-events-none w-0 opacity-0",
            )}
          >
            <p className="font-inter text-lg leading-none tracking-tight">
              Deal Desk
            </p>
            <p className="mt-1 truncate text-[11px] uppercase tracking-[0.14em] text-slate-400">
              Wholesale ops
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-slate-300 hover:text-white"
          onClick={() => {
            setCollapsed((prev) => {
              const next = !prev;
              // When collapsing while the pointer is still over the rail,
              // clear hover so icon mode shows until the mouse leaves/re-enters.
              if (next) setHovered(false);
              return next;
            });
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={expanded}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
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
              title={item.label}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all",
                active
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
                !expanded && "justify-center px-0",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 opacity-80 transition-transform duration-200 group-hover:scale-110",
                  active && "opacity-100 text-sky-300",
                )}
              />
              <span
                className={cn(
                  "truncate transition-all duration-300",
                  expanded
                    ? "max-w-[10rem] opacity-100"
                    : "max-w-0 overflow-hidden opacity-0",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div
        className={cn(
          "border-t border-white/10 p-3 text-[11px] leading-relaxed text-slate-400 transition-all duration-300",
          expanded ? "opacity-100" : "opacity-0",
        )}
      >
        DRAFT — not legal advice. Attorney/title review required.
      </div>
    </aside>
  );
}
