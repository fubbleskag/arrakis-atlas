
"use client";

import { AppHeader } from '@/components/AppHeader';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { MapManager } from '@/components/map/MapManager';
import { IconSourcePalette } from '@/components/map/IconSourcePalette';
import { DetailedCellEditorCanvas } from '@/components/map/DetailedCellEditorCanvas';
import { AuthProvider } from '@/contexts/AuthContext';
import { MapProvider, useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

function HomePageContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { userMapList, currentMapId, isLoadingMapList, isLoadingMapData, focusedCellCoordinates, currentLocalGrid } = useMap();

  const userMapListIsEmpty = !userMapList || userMapList.length === 0;
  const overallLoading = isAuthLoading || (userMapListIsEmpty && isLoadingMapList);

  // This width is used by DeepDesertGrid for its main container (grid + labels)
  // We'll use it for the DetailedCellEditorCanvas's container as well.
  const baseGridDisplayWidth = `min(calc(100vh - 250px), calc(100vw - 32px))`; 
  const maxGridDisplayWidth = '800px';


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

  if (!currentMapId && !isLoadingMapList) {
    return <MapManager />;
  }

  // If a cell is focused, show the detailed editor view (canvas + sidebar)
  if (focusedCellCoordinates && currentMapId) { // No need to check currentLocalGrid here, canvas/palette handle their own loading/empty states
    return (
      <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6 items-start">
        {/* Detailed Cell Editor Canvas Area */}
        <div 
          className="flex flex-col items-center justify-start" // Removed flex-grow to use explicit width
          style={{ 
            width: baseGridDisplayWidth, // Explicitly set the width to match DeepDesertGrid's container
            maxWidth: maxGridDisplayWidth, // Match DeepDesertGrid's maxWidth
           }} 
        >
           {(isLoadingMapData || !currentLocalGrid) && ( // Show skeleton if map data or grid is loading
             <div // This div will use baseGridDisplayWidth and become square due to aspect-square skeleton
               className="w-full aspect-square bg-card rounded-lg shadow-xl flex items-center justify-center border border-border"
             >
                <Skeleton className="w-full h-full"/>
             </div>
           )}
           {(!isLoadingMapData && currentLocalGrid) && (
             <DetailedCellEditorCanvas
                rowIndex={focusedCellCoordinates.rowIndex}
                colIndex={focusedCellCoordinates.colIndex}
                // w-full makes it take the width from parent, aspect-square makes it square
                className="w-full aspect-square bg-background rounded-lg shadow-xl border border-border" 
             />
           )}
        </div>

        {/* Icon Source Palette (sidebar) */}
        <div className="w-[300px] flex-shrink-0">
          <IconSourcePalette
            rowIndex={focusedCellCoordinates.rowIndex}
            colIndex={focusedCellCoordinates.colIndex}
          />
        </div>
      </div>
    );
  }

  // Default view: Deep Desert Grid
  return (
    <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6">
      {/* This outer div for DeepDesertGrid now also needs to allow for shrinking if sidebar is present */}
      {/* However, the sidebar is only shown when focusedCellCoordinates is true, handled above */}
      <div className="flex-grow flex flex-col items-center justify-start">
        {(isLoadingMapData && currentMapId) && (
          <div className="flex flex-col items-center space-y-4 w-full p-4">
            <Skeleton className="h-10 w-full max-w-lg mb-4" />
            <div // This is the container for the grid skeleton's labels and cells
              className="grid"
              style={{
                gridTemplateColumns: 'auto 1fr',
                gridTemplateRows: 'auto 1fr',
                gap: '0.25rem',
                width: baseGridDisplayWidth, // Use the same width var
                maxWidth: maxGridDisplayWidth, // Use the same maxWidth var
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
            <Skeleton className="h-10 w-40 mt-4" /> {/* Adjusted width for "Coriolis Storm" button */}
          </div>
        )}
        {(!isLoadingMapData && currentMapId && currentLocalGrid) && (
          <DeepDesertGrid />
        )}
         {(!isLoadingMapData && currentMapId && !currentLocalGrid) && (
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 flex-grow">
                <AlertTriangle className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-semibold text-destructive-foreground">Error</h2>
                <p className="text-muted-foreground">
                Map data is unavailable. Please try selecting the map again.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MapProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <AppHeader />
          <main className="flex-grow container mx-auto px-0 sm:px-4 py-0 sm:py-8 flex flex-col">
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
