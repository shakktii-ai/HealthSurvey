import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">
            {siteConfig.name}
          </span>
          <span>•</span>
          <span>{siteConfig.version}</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Next.js 16 App Router</span>
          <span>•</span>
          <span>Tailwind CSS</span>
          <span>•</span>
          <span>MongoDB Atlas Ready</span>
        </div>
      </div>
    </footer>
  );
}
