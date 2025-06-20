
"use client";

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

// Approximate heights/widths for layout calculations
const HEADER_HEIGHT = 65; // px, approx AppHeader height + border
const FOOTER_HEIGHT = 33; // px, approx footer height + border
const MAIN_SM_PY_TOTAL = 64; // px, from sm:py-8 on main in layout.tsx (32px top + 32px bottom)
const MAIN_SM_PX_TOTAL = 32; // px, from sm:px-4 on main in layout.tsx (16px left + 16px right)

// For screens smaller than 'sm', these layout paddings are 0. We'll use a simplified overhead.
// This value aims to be a general buffer for vertical space taken by header, footer, and main container's vertical padding.
const PAGE_VERTICAL_OVERHEAD = HEADER_HEIGHT + FOOTER_HEIGHT + (MAIN_SM_PY_TOTAL / 2); // Using half of sm padding as a general compromise
const PAGE_HORIZONTAL_PADDING = MAIN_SM_PX_TOTAL / 2; // Using half of sm padding

const SIDE_PANEL_WIDTH = 300; // px
const SIDE_PANEL_GAP = 24; // px
const CELL_VIEW_ROW_INTERNAL_PADDING_X = 32; // px, from p-4 on the flex-row div for cell view
const CELL_VIEW_ROW_INTERNAL_PADDING_Y = 32; // px, from p-4 on the flex-row div for cell view


function HomePageContent() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
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

  if (overallLoading && !focusedCellCoordinates && (!userMapList || userMapList.length === 0)) {
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

  if (focusedCellCoordinates && currentMapData) {
    // Calculate dimensions for DetailedCellEditorCanvas
    const canvasAvailableHeight = `calc(100vh - ${PAGE_VERTICAL_OVERHEAD}px - ${CELL_VIEW_ROW_INTERNAL_PADDING_Y}px)`;
    const canvasAvailableWidth = `calc(100vw - ${PAGE_HORIZONTAL_PADDING}px - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px - ${CELL_VIEW_ROW_INTERNAL_PADDING_X}px)`;
    const canvasHolderDimension = `min(${canvasAvailableHeight}, ${canvasAvailableWidth})`;

    return (
      <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6 items-start justify-center">
        <div
          className="flex flex-col items-center justify-start"
          style={{
            width: canvasHolderDimension,
            height: canvasHolderDimension, // Maintain square ratio for the holder
           }}
        >
           {(isLoadingMapData || !currentLocalGrid) && (
             <div
               className="w-full h-full bg-card rounded-lg shadow-xl flex items-center justify-center border border-border"
             >
                <Skeleton className="w-full h-full"/>
             </div>
           )}
           {(!isLoadingMapData && currentLocalGrid) && (
             <DetailedCellEditorCanvas
                rowIndex={focusedCellCoordinates.rowIndex}
                colIndex={focusedCellCoordinates.colIndex}
                className="w-full h-full" // Canvas fills its holder
             />
           )}
        </div>

        <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 sticky top-6"> {/* Made side panels sticky */}
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

  if (currentMapData) {
    // Calculate dimensions for DeepDesertGrid holder
    const gridHolderDimension = `min(calc(100vh - ${PAGE_VERTICAL_OVERHEAD}px), calc(100vw - ${PAGE_HORIZONTAL_PADDING}px))`;

    return (
      <div className="flex flex-col items-center justify-start flex-grow w-full py-4"> {/* Added py-4 for spacing */}
        {(isLoadingMapData && currentMapData) && ( 
          <div className="flex flex-col items-center space-y-4 w-full p-4">
            <Skeleton className="h-10 w-full max-w-lg mb-4" />
            <div style={{width: gridHolderDimension, height: gridHolderDimension}} className="flex items-center justify-center">
              <Skeleton className="w-full h-full" />
            </div>
            <Skeleton className="h-10 w-40 mt-4" />
          </div>
        )}
        {(!isLoadingMapData && currentMapData && currentLocalGrid) && ( 
          <div style={{ width: gridHolderDimension, height: gridHolderDimension }}>
            <DeepDesertGrid /> {/* DeepDesertGrid will be w-full h-full of this div */}
          </div>
        )}
         {(!isLoadingMapData && currentMapData && !currentLocalGrid && isAuthenticated) && ( 
            <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 flex-grow">
                <AlertTriangle className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-semibold text-destructive-foreground">Error</h2>
                <p className="text-muted-foreground">
                Map data is unavailable. This map may not exist or you might not have access.
                </p>
            </div>
        )}
      </div>
    );
  }

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
      {/* HomePageContent is now a direct child of main, no extra container div needed here */}
      <HomePageContent />
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        Arrakis Atlas - Deep Desert Mapping Tool
      </footer>
    </div>
  );
}
