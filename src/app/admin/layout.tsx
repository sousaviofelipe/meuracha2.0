"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, getSession } from "@/lib/services/auth.service";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  const links = [
    { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/admin/jogadores", label: "Jogadores", icon: "👤" },
    { href: "/admin/escalacao", label: "Escalação", icon: "🏟️" },
    { href: "/admin/partidas", label: "Partidas", icon: "⚽" },
    { href: "/admin/notificacoes", label: "Notificações", icon: "🔔" },
    { href: "/admin/enquetes", label: "Enquetes", icon: "📋" },
    { href: "/admin/configuracoes", label: "Configurações", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Topbar */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="md:hidden text-gray-400 hover:text-white text-xl"
          >
            ☰
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RachaApp" className="h-8 w-auto" />
            <span className="text-green-400 font-black text-lg">Meu Racha</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-red-400 transition-colors"
        >
          Sair
        </button>
      </header>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-56 bg-gray-900 border-r border-gray-800 min-h-[calc(100vh-57px)] p-4 gap-1 sticky top-[57px] self-start">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-green-500 text-black"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </aside>

        {/* Menu Mobile */}
        {menuAberto && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setMenuAberto(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-4 flex flex-col gap-1 pt-20">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuAberto(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-green-500 text-black"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </aside>
          </div>
        )}

        {/* Conteúdo */}
        <main className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
