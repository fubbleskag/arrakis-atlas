
import { db } from '@/firebase/firebaseConfig';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { convertFirestoreToLocalGrid } from '@/lib/mapUtils';
import type { MapData } from '@/types';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PublicMapView } from '@/components/map/PublicMapView';

interface PublicMapPageProps {
  params: { publicViewId: string };
}

async function getMapByPublicViewId(publicViewId: string): Promise<MapData | null> {
  if (!publicViewId || typeof publicViewId !== 'string' || publicViewId.trim() === '') {
    console.warn("Invalid publicViewId provided:", publicViewId);
    return null;
  }
  const mapsRef = collection(db, "maps");
  const q = query(mapsRef, where("publicViewId", "==", publicViewId), where("isPublicViewable", "==", true));
  
  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log(`No public map found for publicViewId: ${publicViewId}`);
      return null;
    }
    const mapDoc = querySnapshot.docs[0];
    // Firestore data will have Timestamps for createdAt and updatedAt
    return { id: mapDoc.id, ...mapDoc.data() } as MapData; 
  } catch (error) {
    console.error("Error fetching map by publicViewId:", error);
    return null; 
  }
}

export default async function PublicMapPage({ params }: PublicMapPageProps) {
  const { publicViewId } = params;
  
  if (!publicViewId || typeof publicViewId !== 'string' || publicViewId.trim() === '') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 space-y-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold text-destructive-foreground">Invalid Link</h2>
        <p className="text-muted-foreground">
          The map link is malformed or incomplete.
        </p>
        <Button asChild variant="link">
            <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  const mapDataResult = await getMapByPublicViewId(publicViewId);

  if (!mapDataResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 space-y-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold text-destructive-foreground">Map Not Found</h2>
        <p className="text-muted-foreground">
          This map is either not public, does not exist, or the link is incorrect.
        </p>
        <Button asChild variant="link">
            <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  // Serialize Timestamps to strings before passing to Client Component
  const serializableMapData: MapData = {
    ...mapDataResult,
    createdAt: mapDataResult.createdAt instanceof Timestamp 
      ? mapDataResult.createdAt.toDate().toISOString() 
      : mapDataResult.createdAt, // Already a string if somehow pre-serialized
    updatedAt: mapDataResult.updatedAt instanceof Timestamp 
      ? mapDataResult.updatedAt.toDate().toISOString() 
      : mapDataResult.updatedAt, // Already a string
  };

  const localGrid = convertFirestoreToLocalGrid(mapDataResult.gridState); // Use original mapDataResult for grid conversion

  // Pass serializableMapData (with string dates) to the client component
  return <PublicMapView mapData={serializableMapData} localGrid={localGrid} publicViewId={publicViewId} />;
}

export async function generateMetadata({ params }: PublicMapPageProps) {
  const mapData = await getMapByPublicViewId(params.publicViewId); // Fetches with Timestamp
  if (!mapData) {
    return {
      title: 'Map Not Found - Arrakis Atlas',
    };
  }
  return {
    title: `${mapData.name} (Public View) - Arrakis Atlas`,
    description: `View the Arrakis Atlas map: ${mapData.name}.`,
  };
}
