
import { db } from '@/firebase/firebaseConfig';
import { collection, query, where, getDocs, type DocumentData } from 'firebase/firestore';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { convertFirestoreToLocalGrid } from '@/lib/mapUtils'; // Updated import
import type { MapData, LocalGridState } from '@/types';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state

interface PublicMapPageProps {
  params: { publicViewId: string };
}

async function getMapByPublicViewId(publicViewId: string): Promise<MapData | null> {
  if (!publicViewId || typeof publicViewId !== 'string' || publicViewId.trim() === '') {
    console.warn("Invalid publicViewId provided:", publicViewId);
    return null;
  }
  const mapsRef = collection(db, "maps");
  // Ensure isPublicViewable is explicitly checked in the query
  const q = query(mapsRef, where("publicViewId", "==", publicViewId), where("isPublicViewable", "==", true));
  
  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log(`No public map found for publicViewId: ${publicViewId}`);
      return null;
    }
    // Assuming publicViewId is unique for public maps, there should be at most one document.
    const mapDoc = querySnapshot.docs[0];
    return { id: mapDoc.id, ...mapDoc.data() } as MapData;
  } catch (error) {
    console.error("Error fetching map by publicViewId:", error);
    return null; 
  }
}

// This component is now internal to the page, no need for a separate file for now.
function ReadOnlyMapDisplay({ mapData, localGrid }: { mapData: MapData, localGrid: LocalGridState }) {
  return (
    <div className="flex flex-col items-center space-y-2 w-full px-2 md:px-4">
        {/* Map name is already in the simplified header */}
        <p className="text-sm text-muted-foreground mb-2">Public View-Only Mode</p>
        <DeepDesertGrid
            initialGridState={localGrid}
            initialMapData={mapData}
            isReadOnly={true}
        />
    </div>
  );
}

export default async function PublicMapPage({ params }: PublicMapPageProps) {
  const { publicViewId } = params;
  
  // Basic validation for publicViewId before querying
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

  const mapData = await getMapByPublicViewId(publicViewId);

  if (!mapData) {
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

  const localGrid = convertFirestoreToLocalGrid(mapData.gridState);

  return (
     <div className="flex flex-col min-h-screen bg-background">
        <header className="py-4 px-6 border-b border-border">
            <div className="container mx-auto flex justify-between items-center">
                 <Link href="/" className="text-xl md:text-2xl font-semibold text-primary hover:text-primary/80 truncate">
                    {mapData.name} - Arrakis Atlas
                </Link>
            </div>
        </header>
        <main className="flex-grow container mx-auto px-0 sm:px-4 py-4 sm:py-8 flex flex-col">
            {/* Suspense can be added here if ReadOnlyMapDisplay had async parts, but it doesn't */}
            <ReadOnlyMapDisplay mapData={mapData} localGrid={localGrid} />
        </main>
        <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
            Arrakis Atlas - Public View
        </footer>
     </div>
  );
}

// Optional: Add a loading component if data fetching were client-side or took longer
// export function Loading() {
//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen">
//       <Skeleton className="h-12 w-1/2 mb-4" />
//       <Skeleton className="w-full max-w-2xl h-[600px]" />
//     </div>
//   );
// }

// Optional: Add metadata for the public page
export async function generateMetadata({ params }: PublicMapPageProps) {
  const mapData = await getMapByPublicViewId(params.publicViewId);
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

    
