import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === "/login") {
    if (user) {
      const role = user.user_metadata?.role as string | undefined;
      const url = request.nextUrl.clone();
      url.pathname = role === "admin" ? "/admin/dashboard" : "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Auth API callbacks (public)
  if (pathname.startsWith("/api/auth")) {
    return supabaseResponse;
  }

  // All other routes require authentication
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const role = user.user_metadata?.role as string | undefined;

  // Admin-only page routes
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Admin-only API routes
  if (pathname.startsWith("/api/admin")) {
    if (role !== "admin") {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
