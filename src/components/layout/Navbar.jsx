"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MenuIcon, BellIcon, SearchIcon, LogOutIcon } from "@/components/common/Icons";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

export default function Navbar({ onMenuToggle }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data) => {
        if (!isMounted) return;
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAuth(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }

  const roleRedirects = {
    superadmin: "/admin/dashboard",
    field_worker: "/field/dashboard",
    donor: "/donor/dashboard",
  };

  const dashboardHref = currentUser ? (roleRedirects[currentUser.role] || "/") : "/";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-xs sm:px-6 lg:px-8">
      {/* Left side: Mobile menu button & breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open sidebar"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <MenuIcon className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <Link
            href={dashboardHref}
            className="hidden sm:inline-block text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
          >
            System
          </Link>
          <span className="hidden sm:inline-block text-slate-300">/</span>
          <h1 className="text-sm sm:text-base font-semibold text-slate-800">
            {currentUser ? (
              <span className="capitalize">{currentUser.role} Portal</span>
            ) : (
              "Health Impact Survey System"
            )}
          </h1>
        </div>
      </div>

      {/* Right side: Search, Status, Notification, Profile / Auth actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Search bar placeholder */}
        <div className="relative hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <SearchIcon className="w-4 h-4" />
          </div>
          <input
            type="search"
            placeholder="Search platform..."
            disabled
            className="w-56 rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-700 placeholder-slate-400 cursor-not-allowed focus:outline-none"
          />
        </div>


        {/* Notification placeholder */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500" />
        </button>

        {/* Auth status block */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          {isLoadingAuth ? (
            <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse" />
          ) : currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white font-semibold text-xs shadow-xs uppercase">
                {currentUser.name ? currentUser.name.slice(0, 2) : "U"}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold capitalize">
                  {currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="ml-1 rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                aria-label="Sign Out"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="primary" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
