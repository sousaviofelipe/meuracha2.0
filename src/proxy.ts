import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isJogadorRoute =
    request.nextUrl.pathname.startsWith("/jogador/perfil") ||
    request.nextUrl.pathname.startsWith("/jogador/nova-senha");
  const isLoginPage = request.nextUrl.pathname === "/login";

  // Rotas admin — exige usuário logado
  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rotas protegidas do jogador — exige usuário logado
  if (isJogadorRoute && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Login — redireciona se já logado apenas se for admin
  if (isLoginPage && user) {
    // Verifica se é admin
    const { data: rachaAdmin } = await supabase
      .from("rachas")
      .select("id")
      .eq("admin_id", user.id)
      .maybeSingle();

    if (rachaAdmin) {
      // É admin — vai para o dashboard admin
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else {
      // É jogador — vai para o perfil do jogador
      return NextResponse.redirect(new URL("/jogador/perfil", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
    "/jogador/perfil/:path*",
    "/jogador/nova-senha",
  ],
};
