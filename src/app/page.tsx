
"use client"; 

import { AppHeader } from '@/components/AppHeader';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { MapManager } from '@/components/map/MapManager';
import { AuthProvider } from '@/contexts/AuthContext';
import { MapProvider, useMap } from '@/contexts/MapContext'; // Changed from GridProvider
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

function HomePageContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { currentMapId, isLoadingMapList, isLoadingMapData, userMapList } = useMap();

  const overallLoading = isAuthLoading || isLoadingMapList;

  if (overallLoading) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-1/3 mb-8" />
        <Skeleton className="w-full max-w-md h-64" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 flex-grow">
        <AlertTriangle className="h-16 w-16 text-primary" />
        <h2 className="text-2xl font-semibold">Authentication Required</h2>
        <p className="text-muted-foreground">
          Please log in to create, view, and interact with Arrakis Atlas maps.
        </p>
      </div>
    );
  }

  if (!currentMapId) {
    return <MapManager />;
  }

  if (isLoadingMapData || !currentMapId) { // Show loading for selected map data
     return (
      <div className="flex flex-col items-center space-y-4 w-full p-8 flex-grow">
         <Skeleton className="h-10 w-full max-w-lg mb-4" />
         <div
          className="grid"
          style={{
            gridTemplateColumns: 'auto 1fr',
            gridTemplateRows: 'auto 1fr',
            gap: '0.25rem', 
            width: 'min(calc(100vh - 250px), calc(100vw - 32px))', // Adjusted height
            maxWidth: '800px',
          }}
        >
          <div />
          <div className="grid grid-cols-9 gap-px justify-items-center">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={`sk-col-${i}`} className="h-8 aspect-square rounded-sm" />
            ))}
          </div>
          <div className="grid grid-rows-9 gap-px items-center">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={`sk-row-${i}`} className="w-8 aspect-square rounded-sm" />
            ))}
          </div>
          <div className="grid grid-cols-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl aspect-square">
            {Array.from({ length: 81 }).map((_, i) => (
              <Skeleton key={`sk-cell-${i}`} className="aspect-square w-full h-full" />
            ))}
          </div>
        </div>
         <Skeleton className="h-10 w-32 mt-4" /> 
      </div>
    );
  }

  return <DeepDesertGrid />;
}

export default function Home() {
  return (
    <AuthProvider>
      <MapProvider> {/* Changed from GridProvider */}
        <div className="flex flex-col min-h-screen bg-background">
          <AppHeader />
          <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
            <HomePageContent />
          </main>
          <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
            Arrakis Atlas - Guild Mapping Tool
          </footer>
        </div>
      </MapProvider>
    </AuthProvider>
  );
}
