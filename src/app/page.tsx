
"use client";

import { AppHeader } from '@/components/AppHeader';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { MapManager } from '@/components/map/MapManager';
import { IconSourcePalette } from '@/components/map/IconSourcePalette';
import { DetailedCellEditorCanvas } from '@/components/map/DetailedCellEditorCanvas';
import { MarkerEditorPanel } from '@/components/map/MarkerEditorPanel';
import { MapDetailsPanel } from '@/components/map/MapDetailsPanel';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MapPin } from 'lucide-react'; 
import { Button } from '@/components/ui/button';

const HEADER_HEIGHT = 65; 
const FOOTER_HEIGHT = 33; 
const LAYOUT_MAIN_SM_PY = 64; 
const LAYOUT_MAIN_SM_PX = 32; 
const CONTENT_CONTAINER_MD_PY = 48; 
const CONTENT_CONTAINER_MD_PX = 48; 

const TOTAL_VERTICAL_PAGE_OVERHEAD = HEADER_HEIGHT + FOOTER_HEIGHT + LAYOUT_MAIN_SM_PY + CONTENT_CONTAINER_MD_PY;
const TOTAL_HORIZONTAL_PAGE_PADDING = LAYOUT_MAIN_SM_PX + CONTENT_CONTAINER_MD_PX;

const SIDE_PANEL_WIDTH = 300;
const SIDE_PANEL_GAP = 24;


function HomePageContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    currentMapId,
    currentMapData,
    currentLocalGrid,
    isLoadingMapData,
    focusedCellCoordinates,
    selectMap,
    selectedPlacedIconId,
    userMapList,
    isLoadingMapList
  } = useMap();

  const overallLoading = isAuthLoading || isLoadingMapList || (currentMapId && isLoadingMapData && !currentMapData);
  const showMapManager = !currentMapId && !isLoadingMapList && isAuthenticated && !isAuthLoading;


  if (overallLoading && !currentMapData && (!userMapList || userMapList.length === 0) && !showMapManager) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <Skeleton className="h-12 w-1/2 mb-4" /> <Skeleton className="h-8 w-1/3 mb-8" /> <Skeleton className="w-full max-w-md h-64" />
      </div>
    );
  }
  
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 flex-grow">
        <AlertTriangle className="h-16 w-16 text-primary" />
        <h2 className="text-2xl font-semibold">Authentication Required</h2>
        <p className="text-muted-foreground"> Please log in to create, view, and interact with Arrakis Atlas maps. </p>
      </div>
    );
  }

  if (showMapManager) {
    return <MapManager />;
  }


  // Focused Cell View
  if (focusedCellCoordinates && currentMapData) {
    const dynamicCanvasHeight = `calc(100vh - ${TOTAL_VERTICAL_PAGE_OVERHEAD}px)`;
    const dynamicCanvasWidth = `calc(100vw - ${TOTAL_HORIZONTAL_PAGE_PADDING}px - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px)`;
    const canvasHolderDimension = `min(${dynamicCanvasHeight}, ${dynamicCanvasWidth})`;

    return (
      <div className="flex flex-col items-center justify-start flex-grow w-full p-4 md:p-6">
        <div className="flex flex-row w-full items-start justify-center gap-6">
            <div className="flex-shrink-0 flex items-center justify-center h-full">
            <div
                style={{
                width: canvasHolderDimension,
                height: canvasHolderDimension,
                }}
                className="relative" 
            >
                {(isLoadingMapData || !currentLocalGrid) && (
                <Skeleton className="absolute inset-0 w-full h-full bg-card rounded-lg shadow-xl border border-border"/>
                )}
                {(!isLoadingMapData && currentLocalGrid) && (
                <DetailedCellEditorCanvas
                    rowIndex={focusedCellCoordinates.rowIndex}
                    colIndex={focusedCellCoordinates.colIndex}
                    className="w-full h-full"
                />
                )}
            </div>
            </div>

            <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 sticky top-6">
            <IconSourcePalette
                rowIndex={focusedCellCoordinates.rowIndex}
                colIndex={focusedCellCoordinates.colIndex}
            />
            {selectedPlacedIconId && currentLocalGrid && (
                <MarkerEditorPanel
                rowIndex={focusedCellCoordinates.rowIndex}
                colIndex={focusedCellCoordinates.colIndex}
                />
            )}
            </div>
        </div>
      </div>
    );
  }

  // Grid View (Map selected, no cell focused)
  if (currentMapData) {
    const dynamicGridHeight = `calc(100vh - ${TOTAL_VERTICAL_PAGE_OVERHEAD}px)`;
    const dynamicGridWidth = `calc(100vw - ${TOTAL_HORIZONTAL_PAGE_PADDING}px - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px)`;
    const gridHolderDimension = `min(${dynamicGridHeight}, ${dynamicGridWidth})`;

    return (
      <div className="flex flex-col items-center justify-start flex-grow w-full p-4 md:p-6">
        <div className="flex flex-row w-full items-start justify-center gap-6">
            <div className="flex-shrink-0 flex items-center justify-center h-full">
            <div
                style={{
                width: gridHolderDimension,
                height: gridHolderDimension,
                }}
                className="relative"
            >
                {(isLoadingMapData || (currentMapData && !currentLocalGrid)) && (
                <Skeleton className="absolute inset-0 w-full h-full bg-card rounded-lg shadow-xl border border-border" />
                )}
                {(!isLoadingMapData && currentMapData && currentLocalGrid) && (
                <DeepDesertGrid />
                )}
                {(!isLoadingMapData && currentMapData && !currentLocalGrid && isAuthenticated) && (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 space-y-4 bg-card rounded-lg shadow-xl border border-destructive">
                    <AlertTriangle className="h-16 w-16 text-destructive" />
                    <h2 className="text-2xl font-semibold text-destructive-foreground">Map Data Error</h2>
                    <p className="text-muted-foreground">
                    Map data is unavailable or corrupted. This map may not exist or you might not have access.
                    </p>
                </div>
                )}
            </div>
            </div>
            {currentMapData && user && (
                <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 sticky top-6">
                <MapDetailsPanel mapData={currentMapData} currentUser={user} />
                </div>
            )}
        </div>
      </div>
    );
  }
  
  // Fallback loading skeleton or message if authenticated but no map and not in map manager
  if (isAuthenticated && !isAuthLoading && !isLoadingMapList && !currentMapId) {
     return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <MapPin className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold">No Map Selected</h2>
        <p className="text-muted-foreground">Please select a map or create a new one from the Map Manager.</p>
         <Button onClick={() => selectMap(null)} variant="link" className="mt-2">Go to Map Manager</Button>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-center flex-grow p-8">
      <Skeleton className="h-12 w-1/2 mb-4" /> <Skeleton className="h-8 w-1/3 mb-8" /> <Skeleton className="w-full max-w-md h-64" />
      <p className="text-muted-foreground mt-4">Loading map information...</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <HomePageContent />
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        Arrakis Atlas - Deep Desert Mapping Tool
      </footer>
    </div>
  );
}

