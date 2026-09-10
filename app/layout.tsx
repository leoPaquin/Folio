import type { Metadata } from 'next';
import './globals.css';
import './refinements.css';
import { PortfolioProvider } from '../components/portfolio-provider';
import { AppShell } from '../components/app-shell';
import { AuthGate } from '../components/auth-gate';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL('https://folio-investissements.leo-paqui.chatgpt.site'),
  title: 'Folio - Mes investissements',
  description: 'Votre portefeuille, vos comptes et vos placements dans un espace personnel.',
  openGraph: { title: 'Folio', description: 'Mon patrimoine, en perspective.', type: 'website', images: ['/og.png'] },
  twitter: { card: 'summary_large_image', title: 'Folio', description: 'Mon patrimoine, en perspective.', images: ['/og.png'] },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr-CA"><body><AuthGate><PortfolioProvider><AppShell>{children}</AppShell></PortfolioProvider></AuthGate></body></html>;
}
