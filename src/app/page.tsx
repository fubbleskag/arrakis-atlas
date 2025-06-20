
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

  // Effect #1: Sync URL 'mapId' to context (selectMap)
  useEffect(() => {
    // Guard: Wait for auth. For map list, if URL has no mapId, wait for list. If URL *has* mapId, proceed.
    if (isAuthLoading || (isLoadingMapList && !searchParams.get('mapId')) ) return; 

    const urlMapId = searchParams.get('mapId');

    if (urlMapId) { // URL has a mapId
      if (ctxMapId !== urlMapId) { // Context needs to sync to URL
        // Allow selecting map if it's in the list, 
        // OR if list is empty (initial load scenario for direct link, will be validated by context later),
        // OR if map list is still loading (optimistic selection for direct links)
        if (userMapList.some(map => map.id === urlMapId) || userMapList.length === 0 || isLoadingMapList) {
          selectMap(urlMapId);
        } else { // Map list loaded, urlMapId not in it (and not empty list case which means it's truly invalid)
          selectMap(null); // Context will become null, Effect #3 will push "/"
                           // No direct router.replace here to avoid fighting Effect #3
        }
      }
    } else { // URL does not have mapId
      if (ctxMapId !== null) { // Context has a map, but URL doesn't, sync context
        selectMap(null);
      }
    }
  }, [isAuthLoading, isLoadingMapList, userMapList, searchParams, ctxMapId, selectMap]);


  // Effect #2: Sync URL 'cell' to context (setFocusedCellCoordinates)
  useEffect(() => {
    const urlMapId = searchParams.get('mapId');
    const urlCellParam = searchParams.get('cell');
    const parsedUrlCellCoords = parseCellParam(urlCellParam);

    if (ctxMapId && ctxMapId === urlMapId) {
      // Map context matches the mapId in the URL: Normal cell sync
      if (!areCellCoordsEqual(parsedUrlCellCoords, ctxCellCoords)) {
        setFocusedCellCoordinates(parsedUrlCellCoords);
      }
    } else if (!urlMapId && !ctxMapId) {
      // Both URL and context agree: no map selected (map manager view)
      if (ctxCellCoords !== null) { // If there was a lingering cell focus, clear it
        setFocusedCellCoordinates(null);
      }
    } else if (urlMapId && ctxMapId !== urlMapId) {
      // URL specifies a map, but context has a different one (or none).
      // This implies Effect #1 is (or was just) reconciling mapId.
      // If context has a cell focus, it's for the wrong map (or an outdated one), so clear it.
      if (ctxCellCoords !== null) {
        setFocusedCellCoordinates(null);
      }
    } else if (!urlMapId && ctxMapId) {
      // URL has no map, but context does (e.g., navigating from map view to map manager via breadcrumb).
      // Effect #1 would have called selectMap(null). Context cell should be cleared.
      if (ctxCellCoords !== null) {
        setFocusedCellCoordinates(null);
      }
    }
    // If ctxMapId is null and urlMapId has a value, Effect #1 is expected to handle setting ctxMapId.
    // Once ctxMapId is set, this effect will re-run and potentially set the cell.
  }, [ctxMapId, searchParams, ctxCellCoords, setFocusedCellCoordinates]);


  // Effect #3: Sync context state (mapId, cellCoords) to URL
  useEffect(() => {
    const currentQuery = new URLSearchParams(searchParams.toString());
    const newQuery = new URLSearchParams();

    if (ctxMapId) {
      newQuery.set('mapId', ctxMapId);
      const stringifiedCellCoords = stringifyCellCoords(ctxCellCoords);
      if (stringifiedCellCoords) { // Cell param only makes sense if mapId is also present
        newQuery.set('cell', stringifiedCellCoords);
      }
    }
    // If newQuery is empty after this, it means no map is selected in context.

    if (currentQuery.toString() !== newQuery.toString()) {
      const newUrl = newQuery.toString() ? `${pathname}?${newQuery.toString()}` : pathname;
      router.push(newUrl, { scroll: false });
    }
  }, [ctxMapId, ctxCellCoords, router, pathname, searchParams]);


  const userMapListIsEmpty = !userMapList || userMapList.length === 0;
  // Adjust overallLoading: if a mapId is in URL, we might not be "overallLoading" in the sense of showing map manager skeleton
  const overallLoading = isAuthLoading || (isLoadingMapList && !searchParams.get('mapId') && userMapListIsEmpty);


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
  // This might be hit if auth is slow and a direct link is used.
  if (!isAuthLoading && !user && searchParams.get('mapId')) {
     return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-1/3 mb-8" />
        <Skeleton className="w-full max-w-md h-64" />
      </div>
    );
  }


  // If context has no map ID, and we're not in an initial loading phase for map list (unless URL specifies a map)
  // This condition means: show MapManager if authenticated, not loading lists (or list is loaded but empty), AND no map is specified by URL or context.
  if (!ctxMapId && !isLoadingMapList && isAuthenticated) {
      // If URL *does* have a mapId, Effect #1 should be trying to load it.
      // We only show MapManager if URL *also* has no mapId.
      if (!searchParams.get('mapId')) {
        return <MapManager />;
      }
      // If URL has mapId but ctxMapId is null, it means it's loading or failed. Show loading/error below.
  }
  

  if (ctxCellCoords && ctxMapId) { // A cell is focused for a loaded map
    return (
      <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6 items-start">
        <div 
          className="flex flex-col items-center justify-start"
          style={{ 
            width: baseGridDisplayWidth,
            maxWidth: maxGridDisplayWidth,
           }} 
        >
           {(isLoadingMapData || !currentLocalGrid) && ( // Show skeleton if map data or grid is loading
             <div
               className="w-full aspect-square bg-card rounded-lg shadow-xl flex items-center justify-center border border-border" 
             >
                <Skeleton className="w-full h-full"/>
             </div>
           )}
           {(!isLoadingMapData && currentLocalGrid) && ( // Show canvas if data and grid are ready
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

  // If a map is selected (ctxMapId exists), but no cell is focused (ctxCellCoords is null) -> Show DeepDesertGrid
  // Or, if map is still loading (isLoadingMapData)
  if (ctxMapId) {
    return (
      <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6">
        <div className="flex-grow flex flex-col items-center justify-start">
          {(isLoadingMapData && ctxMapId) && ( // Skeleton for grid while map data loads
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
          {(!isLoadingMapData && ctxMapId && currentLocalGrid) && ( // Actual grid when data is ready
            <DeepDesertGrid />
          )}
           {(!isLoadingMapData && ctxMapId && !currentLocalGrid && isAuthenticated) && ( // Error case: Map selected, but no grid data
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

  // Fallback: if no ctxMapId, and not overallLoading, and not caught by MapManager condition
  // This could be if URL has an invalid mapId and list is loaded.
  // The effects should ideally drive ctxMapId to null, leading to MapManager or error above.
  // If we reach here, it's likely an intermediate state or an unhandled loading/error condition.
  return (
     <div className="flex flex-col items-center justify-center flex-grow p-8">
        <Skeleton className="h-12 w-1/2 mb-4" />
        <Skeleton className="h-8 w-1/3 mb-8" />
        <Skeleton className="w-full max-w-md h-64" />
        <p className="text-muted-foreground mt-4">Loading map information...</p>
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

    