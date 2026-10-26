import './globals.css';
import type { Metadata } from 'next';
import { BrandHeader } from '@/components/BrandHeader';
export const metadata: Metadata = {
  title: 'IHospitality CRM',
  description: 'DirecTV install & service management  IHospitality',
  icons: { icon: '/logo.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body><BrandHeader /><main className="container">{children}</main></body></html>
  );
}
