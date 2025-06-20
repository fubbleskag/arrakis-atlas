
"use client";

import { AppHeader } from '@/components/AppHeader';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { MapManager } from '@/components/map/MapManager';
import { IconSourcePalette } from '@/components/map/IconSourcePalette';
import { DetailedCellEditorCanvas } from '@/components/map/DetailedCellEditorCanvas';
import { MarkerEditorPanel } from '@/components/map/MarkerEditorPanel';
import { MapDetailsPanel } from '@/components/map/MapDetailsPanel'; // Import new panel
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

// Constants for dynamic sizing calculations
const HEADER_HEIGHT = 65; // approx AppHeader height + border
const FOOTER_HEIGHT = 33; // approx footer height + border
const LAYOUT_MAIN_SM_PY = 64; // sm:py-8 on main in layout.tsx
const LAYOUT_MAIN_SM_PX = 32; // sm:px-4 on main in layout.tsx
const CONTENT_CONTAINER_MD_PY = 48; // from md:p-6 on content flex row (24px top + 24px bottom)
const CONTENT_CONTAINER_MD_PX = 48; // from md:p-6 on content flex row (24px left + 24px right)

// Total vertical space taken by elements outside the scrollable content area (using md/sm values for estimation)
const TOTAL_VERTICAL_PAGE_OVERHEAD = HEADER_HEIGHT + FOOTER_HEIGHT + LAYOUT_MAIN_SM_PY + CONTENT_CONTAINER_MD_PY;
// Total horizontal space taken by page paddings (using md/sm values)
const TOTAL_HORIZONTAL_PAGE_PADDING = LAYOUT_MAIN_SM_PX + CONTENT_CONTAINER_MD_PX;

const SIDE_PANEL_WIDTH = 300;
const SIDE_PANEL_GAP = 24;


function HomePageContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    currentMapData,
    currentLocalGrid,
    isLoadingMapData,
    focusedCellCoordinates,
    selectedPlacedIconId,
    userMapList,
    isLoadingMapList
  } = useMap();

  const overallLoading = isAuthLoading || isLoadingMapList || (currentMapData && isLoadingMapData);

  if (overallLoading && !currentMapData && (!userMapList || userMapList.length === 0)) {
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

  if (!currentMapData && !isLoadingMapList && isAuthenticated) {
    return <MapManager />;
  }

  // Focused Cell View
  if (focusedCellCoordinates && currentMapData) {
    const dynamicCanvasHeight = `calc(100vh - ${TOTAL_VERTICAL_PAGE_OVERHEAD}px)`;
    const dynamicCanvasWidth = `calc(100vw - ${TOTAL_HORIZONTAL_PAGE_PADDING}px - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px)`;
    const canvasHolderDimension = `min(${dynamicCanvasHeight}, ${dynamicCanvasWidth})`;

    return (
      <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6 items-start justify-center">
        <div className="flex-grow flex items-center justify-center h-full"> {/* Holder for centering canvas */}
          <div
            style={{
              width: canvasHolderDimension,
              height: canvasHolderDimension,
            }}
            className="relative" // For skeleton positioning
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
    );
  }

  // Grid View (Map selected, no cell focused)
  if (currentMapData) {
    const dynamicGridHeight = `calc(100vh - ${TOTAL_VERTICAL_PAGE_OVERHEAD}px)`;
    // For grid view, account for its own side panel
    const dynamicGridWidth = `calc(100vw - ${TOTAL_HORIZONTAL_PAGE_PADDING}px - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px)`;
    const gridHolderDimension = `min(${dynamicGridHeight}, ${dynamicGridWidth})`;

    return (
      <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6 items-start justify-center">
        <div className="flex-grow flex items-center justify-center h-full"> {/* Holder for centering grid */}
          <div
            style={{
              width: gridHolderDimension,
              height: gridHolderDimension,
            }}
            className="relative" // For skeleton positioning
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
        {/* Map Details Panel for Grid View */}
        {currentMapData && user && (
            <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 sticky top-6">
              <MapDetailsPanel mapData={currentMapData} currentUser={user} />
            </div>
        )}
      </div>
    );
  }

  // Default loading skeleton if no specific view matches
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
      <HomePageContent />
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        Arrakis Atlas - Deep Desert Mapping Tool
      </footer>
    </div>
  );
}
