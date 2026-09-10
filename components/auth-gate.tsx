import { authenticatedClient } from '../lib/supabase/server';
import { supabaseConfigured } from '../lib/supabase/config';
import { PublicHome } from './public-home';

export async function AuthGate({ children }: { children: React.ReactNode }) {
  const { user } = await authenticatedClient();
  if (!user) return <PublicHome configured={supabaseConfigured()} />;
  return <>{children}</>;
}
