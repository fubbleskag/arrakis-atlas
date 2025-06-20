
"use client";

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AppHeader } from '@/components/AppHeader';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { MapManager } from '@/components/map/MapManager';
import { IconSourcePalette } from '@/components/map/IconSourcePalette';
import { DetailedCellEditorCanvas } from '@/components/map/DetailedCellEditorCanvas';
import { MarkerEditorPanel } from '@/components/map/MarkerEditorPanel'; 
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import type { FocusedCellCoordinates } from '@/types';
import { GRID_SIZE } from '@/lib/mapUtils';

function parseCellParam(cellParam: string | null): FocusedCellCoordinates | null {
  if (!cellParam) return null;
  const parts = cellParam.split('-');
  if (parts.length !== 2) return null;
  const r = parseInt(parts[0], 10);
  const c = parseInt(parts[1], 10);
  if (isNaN(r) || isNaN(c) || r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
    return null;
  }
  return { rowIndex: r, colIndex: c };
}

function stringifyCellCoords(coords: FocusedCellCoordinates | null): string | null {
  if (!coords) return null;
  return `${coords.rowIndex}-${coords.colIndex}`;
}

function areCellCoordsEqual(c1: FocusedCellCoordinates | null, c2: FocusedCellCoordinates | null): boolean {
  if (!c1 && !c2) return true; // Both null
  if (!c1 || !c2) return false; // One is null, other isn't
  return c1.rowIndex === c2.rowIndex && c1.colIndex === c2.colIndex;
}

function HomePageContent() {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const mapContext = useMap();
  const { 
    userMapList, 
    currentMapId: ctxMapId, 
    isLoadingMapList, 
    isLoadingMapData, 
    focusedCellCoordinates: ctxCellCoords, 
    selectedPlacedIconId, 
    currentLocalGrid,
    selectMap,
    setFocusedCellCoordinates
  } = mapContext;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Effect for initializing state from URL parameters
  useEffect(() => {
    if (isAuthLoading || isLoadingMapList) return; // Wait for auth and initial map list load

    const urlMapId = searchParams.get('mapId');
    const urlCellParam = searchParams.get('cell');
    const parsedUrlCellCoords = parseCellParam(urlCellParam);

    if (urlMapId) {
      if (userMapList.some(map => map.id === urlMapId) || !userMapList.length) { // Allow selection if list empty (still loading or no maps)
        if (ctxMapId !== urlMapId) {
          selectMap(urlMapId);
        }
        // Cell coordinates will be set by the next effect if map selection is successful and cell param exists
      } else if (userMapList.length > 0 && !userMapList.some(map => map.id === urlMapId)) {
        // Map in URL not found in user's list, clear URL params
        router.replace(pathname, { scroll: false });
      }
    } else {
      // No mapId in URL, ensure context reflects this unless a map is already selected (e.g. by user interaction)
      if (ctxMapId !== null && !isLoadingMapData) { // isLoadingMapData check prevents clearing if navigating to map
         // This case is tricky: if user navigates to map manager, URL clears.
         // If map gets deselected due to error, URL also needs to clear.
         // The URL update effect below should handle pushing new state to URL.
      }
    }
  }, [isAuthLoading, isLoadingMapList, userMapList, searchParams, selectMap, ctxMapId, router, pathname, isLoadingMapData]);


  // Effect for setting cell coordinates from URL after map is confirmed selected
   useEffect(() => {
    const urlMapId = searchParams.get('mapId');
    const urlCellParam = searchParams.get('cell');
    const parsedUrlCellCoords = parseCellParam(urlCellParam);

    if (ctxMapId && ctxMapId === urlMapId && parsedUrlCellCoords) {
      if (!areCellCoordsEqual(parsedUrlCellCoords, ctxCellCoords)) {
        setFocusedCellCoordinates(parsedUrlCellCoords);
      }
    } else if (ctxMapId && ctxMapId === urlMapId && !parsedUrlCellCoords && ctxCellCoords !== null) {
      // Map is selected, cell param is missing/invalid, but context has cell focus
      setFocusedCellCoordinates(null);
    }
  }, [ctxMapId, searchParams, ctxCellCoords, setFocusedCellCoordinates]);


  // Effect for updating URL when context state changes
  useEffect(() => {
    const currentQuery = new URLSearchParams(searchParams.toString());
    const newQuery = new URLSearchParams();

    if (ctxMapId) {
      newQuery.set('mapId', ctxMapId);
    }
    const stringifiedCellCoords = stringifyCellCoords(ctxCellCoords);
    if (stringifiedCellCoords && ctxMapId) { // cell only makes sense if mapId is also present
      newQuery.set('cell', stringifiedCellCoords);
    }

    // Only push if the query string has actually changed
    if (currentQuery.toString() !== newQuery.toString()) {
      const newUrl = newQuery.toString() ? `${pathname}?${newQuery.toString()}` : pathname;
      router.push(newUrl, { scroll: false });
    }
  }, [ctxMapId, ctxCellCoords, router, pathname, searchParams]);


  const userMapListIsEmpty = !userMapList || userMapList.length === 0;
  const overallLoading = isAuthLoading || (userMapListIsEmpty && isLoadingMapList && !searchParams.get('mapId'));


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

  if (!isAuthenticated && !isAuthLoading) {
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
  
  // If not loading auth, but user is null and we expect a map from URL, show loading state
  if (!isAuthLoading && !user && searchParams.get('mapId')) {
     return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-1/3 mb-8" />
        <Skeleton className="w-full max-w-md h-64" />
      </div>
    );
  }


  if (!ctxMapId && !isLoadingMapList && !isAuthLoading && isAuthenticated) {
    return <MapManager />;
  }
  

  if (ctxCellCoords && ctxMapId) {
    return (
      <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6 items-start">
        <div 
          className="flex flex-col items-center justify-start"
          style={{ 
            width: baseGridDisplayWidth,
            maxWidth: maxGridDisplayWidth,
           }} 
        >
           {(isLoadingMapData || !currentLocalGrid) && (
             <div
               className="w-full aspect-square bg-card rounded-lg shadow-xl flex items-center justify-center border border-border" 
             >
                <Skeleton className="w-full h-full"/>
             </div>
           )}
           {(!isLoadingMapData && currentLocalGrid) && (
             <DetailedCellEditorCanvas
                rowIndex={ctxCellCoords.rowIndex}
                colIndex={ctxCellCoords.colIndex}
             />
           )}
        </div>

        <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
          <IconSourcePalette
            rowIndex={ctxCellCoords.rowIndex}
            colIndex={ctxCellCoords.colIndex}
          />
          {selectedPlacedIconId && currentLocalGrid && ( 
            <MarkerEditorPanel
              rowIndex={ctxCellCoords.rowIndex}
              colIndex={ctxCellCoords.colIndex}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6">
      <div className="flex-grow flex flex-col items-center justify-start">
        {(isLoadingMapData && ctxMapId) && (
          <div className="flex flex-col items-center space-y-4 w-full p-4">
            <Skeleton className="h-10 w-full max-w-lg mb-4" />
            <div
              className="grid"
              style={{
                gridTemplateColumns: 'auto 1fr',
                gridTemplateRows: 'auto 1fr',
                gap: '0.25rem',
                width: baseGridDisplayWidth,
                maxWidth: maxGridDisplayWidth,
              }}
            >
              <div />
              <div className="grid grid-cols-9 gap-px justify-items-center">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={`sk-col-${i}`} className="h-8 aspect-square" />
                ))}
              </div>
              <div className="grid grid-rows-9 gap-px items-center">
                {Array.from({ length: 9 }).map((_, i) => (
                  <Skeleton key={`sk-row-${i}`} className="w-8 aspect-square" />
                ))}
              </div>
              <div className="grid grid-cols-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl aspect-square">
                {Array.from({ length: 81 }).map((_, i) => (
                  <Skeleton key={`sk-cell-${i}`} className="aspect-square w-full h-full" />
                ))}
              </div>
            </div>
            <Skeleton className="h-10 w-40 mt-4" />
          </div>
        )}
        {(!isLoadingMapData && ctxMapId && currentLocalGrid) && (
          <DeepDesertGrid />
        )}
         {(!isLoadingMapData && ctxMapId && !currentLocalGrid && isAuthenticated) && ( // Added isAuthenticated for safety
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 flex-grow">
                <AlertTriangle className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-semibold text-destructive-foreground">Error</h2>
                <p className="text-muted-foreground">
                Map data is unavailable. This map may not exist or you might not have access.
                </p>
            </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-0 sm:px-4 py-0 sm:py-8 flex flex-col">
        <HomePageContent />
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        Arrakis Atlas - Deep Desert Mapping Tool
      </footer>
    </div>
  );
}
