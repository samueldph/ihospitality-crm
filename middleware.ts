export { default } from 'next-auth/middleware';
export const config = {
  matcher: ['/((?!login|api/auth|api/health|api/ready|_next/static|_next/image|logo.svg|favicon.ico).*)'],
};
