
import { db } from '@/firebase/firebaseConfig';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { MapData } from '@/types';
import { JoinPageClient } from '@/components/auth/JoinPageClient';

interface JoinPageProps {
  params: { collaboratorShareId: string };
}

async function getMapByCollaboratorShareId(collaboratorShareId: string): Promise<MapData | null> {
  if (!collaboratorShareId || typeof collaboratorShareId !== 'string' || collaboratorShareId.trim() === '') {
    console.warn("Invalid collaboratorShareId provided:", collaboratorShareId);
    return null;
  }
  const mapsRef = collection(db, "maps");
  // Query for maps with the matching collaboratorShareId. In a well-managed system, this ID should be unique.
  const q = query(mapsRef, where("collaboratorShareId", "==", collaboratorShareId));
  
  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log(`No map found for collaboratorShareId: ${collaboratorShareId}`);
      return null;
    }
    // Assuming collaboratorShareId is unique, take the first match.
    // If it's not guaranteed unique, you might need more logic here.
    const mapDoc = querySnapshot.docs[0];
    const mapData = { id: mapDoc.id, ...mapDoc.data() } as MapData;

    // Serialize Timestamps before passing to Client Component
    const serializableMapData: MapData = {
      ...mapData,
      createdAt: mapData.createdAt instanceof Timestamp 
        ? mapData.createdAt.toDate().toISOString() 
        : mapData.createdAt,
      updatedAt: mapData.updatedAt instanceof Timestamp 
        ? mapData.updatedAt.toDate().toISOString() 
        : mapData.updatedAt,
    };
    return serializableMapData;

  } catch (error) {
    console.error("Error fetching map by collaboratorShareId:", error);
    return null; 
  }
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { collaboratorShareId } = params;
  const mapData = await getMapByCollaboratorShareId(collaboratorShareId);

  return <JoinPageClient mapData={mapData} providedShareId={collaboratorShareId} />;
}

export async function generateMetadata({ params }: JoinPageProps) {
  const mapData = await getMapByCollaboratorShareId(params.collaboratorShareId);
  if (!mapData) {
    return {
      title: 'Invalid Invite - Arrakis Atlas',
    };
  }
  return {
    title: `Join Map: ${mapData.name} - Arrakis Atlas`,
    description: `You've been invited to collaborate on the Arrakis Atlas map: ${mapData.name}.`,
  };
}

