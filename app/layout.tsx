import './globals.css';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { BrandHeader } from '@/components/BrandHeader';
import { Nav } from '@/components/Nav';

export const metadata: Metadata = {
  title: 'IHospitality CRM',
  description: 'DirecTV install & service management - IHospitality',
  icons: { icon: '/logo.svg' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  return (
    <html lang="en"><body>
      <BrandHeader />
      {session
        ? <><Nav /><main className="appmain">{children}</main></>
        : <main className="container">{children}</main>}
    </body></html>
  );
}
