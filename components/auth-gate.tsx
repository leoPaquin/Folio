import { headers } from 'next/headers';
import { PublicHome } from './public-home';

export async function AuthGate({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const userId = requestHeaders.get('oai-authenticated-user-id');
  if (!userId && process.env.NODE_ENV === 'production') return <PublicHome />;
  return <>{children}</>;
}
