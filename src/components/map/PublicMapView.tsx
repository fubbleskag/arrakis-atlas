
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import type { MapData, LocalGridState, FocusedCellCoordinates } from '@/types';
import { DeepDesertGrid } from './DeepDesertGrid';
import { DetailedCellEditorCanvas } from './DetailedCellEditorCanvas';
import { IconSourcePalette } from './IconSourcePalette';
import { MarkerEditorPanel } from './MarkerEditorPanel';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Home } from 'lucide-react'; // Added Home icon
import { Button } from '@/components/ui/button'; // Added Button


const PUBLIC_VIEW_TOP_BAR_HEIGHT = 50; // Approximate height for the new top bar
const PUBLIC_VIEW_PADDING_VERTICAL = 32; // e.g. p-4 top + p-4 bottom for content area
const PUBLIC_VIEW_PADDING_HORIZONTAL = 32; // e.g. p-4 left + p-4 right for content area

const SIDE_PANEL_WIDTH = 300;
const SIDE_PANEL_GAP = 24;


interface PublicMapViewProps {
  mapData: MapData | null; 
  localGrid: LocalGridState | null; 
  publicViewId: string;
}

function MinimalPublicHeader({ mapName, homeLink = "/" }: { mapName: string | undefined, homeLink?: string }) {
  return (
    <header 
        className="py-2 px-4 border-b border-border flex justify-between items-center fixed top-0 left-0 right-0 bg-background z-10"
        style={{ height: `${PUBLIC_VIEW_TOP_BAR_HEIGHT}px`}}
    >
      <h1 className="text-lg font-semibold text-primary truncate">
        {mapName || "Map"} (Public View)
      </h1>
      <Button variant="outline" size="sm" asChild>
        <Link href={homeLink}>
          <Home className="mr-2 h-4 w-4" />
          Arrakis Atlas Home
        </Link>
      </Button>
    </header>
  );
}

export function PublicMapView({ mapData: initialMapData, localGrid: initialLocalGrid, publicViewId }: PublicMapViewProps) {
  const [mapData, setMapData] = useState(initialMapData);
  const [localGrid, setLocalGrid] = useState(initialLocalGrid);
  
  const [focusedCellCoords, setFocusedCellCoords] = useState<FocusedCellCoordinates | null>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  useEffect(() => {
    setMapData(initialMapData);
    setLocalGrid(initialLocalGrid);
    setFocusedCellCoords(null); 
    setSelectedIconId(null);
  }, [initialMapData, initialLocalGrid]);


  if (!mapData || !localGrid) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MinimalPublicHeader mapName="Not Found" />
        <main 
            className="flex-grow flex flex-col items-center justify-center p-4"
            style={{ paddingTop: `${PUBLIC_VIEW_TOP_BAR_HEIGHT + 16}px`}} // 16px for extra spacing
        >
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive-foreground">Map Data Unavailable</h2>
          <p className="text-muted-foreground">The requested map could not be loaded.</p>
        </main>
      </div>
    );
  }
  
  const handleCellFocus = (rowIndex: number, colIndex: number) => {
    setFocusedCellCoords({ rowIndex, colIndex });
    setSelectedIconId(null); 
  };

  const handleIconSelect = (iconId: string | null) => {
    setSelectedIconId(iconId);
  };
  
  const handleCloseDetailedView = () => {
    setFocusedCellCoords(null);
    setSelectedIconId(null);
  }
  
  const currentFocusedCellData = focusedCellCoords ? localGrid[focusedCellCoords.rowIndex][focusedCellCoords.colIndex] : null;
  const currentSelectedIconData = currentFocusedCellData && selectedIconId 
    ? currentFocusedCellData.placedIcons.find(i => i.id === selectedIconId) 
    : null;

  // Calculate available dimensions within the main content area
  const dynamicContentHeight = `calc(100vh - ${PUBLIC_VIEW_TOP_BAR_HEIGHT}px - ${PUBLIC_VIEW_PADDING_VERTICAL}px)`;
  
  if (focusedCellCoords && currentFocusedCellData) {
    const dynamicCanvasWidth = `calc(100vw - ${PUBLIC_VIEW_PADDING_HORIZONTAL}px - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px)`;
    const canvasHolderDimension = `min(${dynamicContentHeight}, ${dynamicCanvasWidth})`;

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MinimalPublicHeader mapName={mapData.name} />
        <main 
            className="flex-grow flex flex-row w-full items-start justify-center gap-6 p-4"
            style={{ paddingTop: `${PUBLIC_VIEW_TOP_BAR_HEIGHT + 16}px`}}
        >
          <div className="flex-grow flex items-center justify-center h-full">
            <div style={{ width: canvasHolderDimension, height: canvasHolderDimension }} className="relative">
              <DetailedCellEditorCanvas
                rowIndex={focusedCellCoords.rowIndex}
                colIndex={focusedCellCoords.colIndex}
                isEditorOverride={false} 
                mapDataOverride={mapData}
                cellDataOverride={currentFocusedCellData}
                selectedIconIdOverride={selectedIconId}
                onIconSelectOverride={handleIconSelect}
                className="w-full h-full"
                onNavigate={setFocusedCellCoords}
              />
            </div>
          </div>
          <div 
            className="w-[300px] flex-shrink-0 flex flex-col gap-4 sticky"
            style={{ top: `${PUBLIC_VIEW_TOP_BAR_HEIGHT + 16}px` }} // 16px is p-4
          >
            <IconSourcePalette
              rowIndex={focusedCellCoords.rowIndex}
              colIndex={focusedCellCoords.colIndex}
              isReadOnlyOverride={true}
              mapDataOverride={mapData}
              cellDataOverride={currentFocusedCellData}
              onCloseOverride={handleCloseDetailedView}
            />
            {selectedIconId && currentSelectedIconData && (
              <MarkerEditorPanel
                rowIndex={focusedCellCoords.rowIndex}
                colIndex={focusedCellCoords.colIndex}
                isReadOnlyOverride={true}
                mapDataOverride={mapData}
                cellDataOverride={currentFocusedCellData} 
                selectedIconIdOverride={selectedIconId}
                onCloseOverride={() => setSelectedIconId(null)}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  // Full grid view
  const dynamicGridWidth = `calc(100vw - ${PUBLIC_VIEW_PADDING_HORIZONTAL}px)`;
  const gridHolderDimension = `min(${dynamicContentHeight}, ${dynamicGridWidth})`;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MinimalPublicHeader mapName={mapData.name} />
      <main 
        className="flex-grow flex flex-col items-center justify-start p-4"
        style={{ paddingTop: `${PUBLIC_VIEW_TOP_BAR_HEIGHT + 16}px`}}
      >
        <p className="text-sm text-muted-foreground mb-2">Public View-Only Mode. Click on a cell to view details.</p>
        <div style={{ width: gridHolderDimension, height: gridHolderDimension }}>
          <DeepDesertGrid
            initialGridState={localGrid}
            initialMapData={mapData}
            isReadOnly={true}
            onCellClick={handleCellFocus} 
          />
        </div>
      </main>
    </div>
  );
}
