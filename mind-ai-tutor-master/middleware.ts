import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // 創建初始的響應對象
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // 這將設置 cookie 於當前的響應
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            maxAge: 0,
            path: '/',
          });
        },
      },
    }
  );

  // 重要：不要在 createServerClient 和 supabase.auth.getUser() 之間放置代碼
  // 這可能會導致用戶被隨機登出，很難調試

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 跳過 auth 路徑的處理，以避免循環重定向
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return response;
  }

  // 🌟 修改 1：保護的路徑從 /dashboard 改成 /students
  // 如果還沒登入就想偷跑去 /students，強制踢回登入頁
  if (!user && request.nextUrl.pathname.startsWith('/students')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 🌟 修改 2：已經登入的用戶，如果跑到 /login 或 /signup，直接導向 /students
  if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/students';
    return NextResponse.redirect(redirectUrl);
  }

  // 重要：必須按原樣返回 response 對象
  return response;
}

export const config = {
  matcher: [
    // 🌟 修改 3：讓 middleware 去監聽 /students 以及註冊登入頁
    '/students/:path*',
    '/login',
    '/signup',
    '/auth/callback',
  ],
};