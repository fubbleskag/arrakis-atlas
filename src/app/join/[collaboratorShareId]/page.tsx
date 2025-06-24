
import { JoinPageClient } from '@/components/auth/JoinPageClient';

interface JoinPageProps {
  params: { collaboratorShareId: string };
}

// This page is now a simple wrapper that passes the share ID to the client component.
// All data fetching and logic will be handled on the client.
export default async function JoinPage({ params }: JoinPageProps) {
  return <JoinPageClient providedShareId={params.collaboratorShareId} />;
}

// Since data isn't fetched on the server anymore, we provide static metadata.
export async function generateMetadata() {
  return {
    title: 'Join Map - Arrakis Atlas',
    description: `You've been invited to collaborate on an Arrakis Atlas map.`,
  };
}
