import { redirect } from "next/navigation";
import Link from "next/link";
import { isLoggedIn } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

const nav = [
  { href: "/", label: "Queue" },
  { href: "/outbox", label: "Outbox" },
  { href: "/targets", label: "Watchlist" },
  { href: "/style", label: "Stilprofil" },
  { href: "/setup", label: "Setup" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await isLoggedIn())) redirect("/login");
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-edge bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-5 py-3">
          <span className="mr-4 text-sm font-semibold tracking-tight">LinkedIn Engine</span>
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-panel hover:text-slate-200">
              {n.label}
            </Link>
          ))}
          <div className="flex-1" />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
