import './globals.css';
import type { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import { PageEntrance } from '@/components/motion';

export const metadata: Metadata = {
  title: 'RevenueOS',
  description: 'The operating system for deliberate revenue',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><div className="shell"><Sidebar /><main className="main"><PageEntrance>{children}</PageEntrance></main></div></body></html>;
}
