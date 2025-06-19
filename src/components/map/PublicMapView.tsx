
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import type { MapData, LocalGridState, FocusedCellCoordinates, PlacedIcon, GridCellData as GridCellDataType } from '@/types';
import { DeepDesertGrid } from './DeepDesertGrid';
import { DetailedCellEditorCanvas } from './DetailedCellEditorCanvas';
import { IconSourcePalette } from './IconSourcePalette';
import { MarkerEditorPanel } from './MarkerEditorPanel';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { GRID_SIZE } from '@/lib/mapUtils';

interface PublicMapViewProps {
  mapData: MapData | null; // Allow null if map not found
  localGrid: LocalGridState | null; // Allow null
  publicViewId: string;
}

function PublicHeader({ mapName }: { mapName: string | undefined }) {
  return (
    <header className="py-4 px-6 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl md:text-2xl font-semibold text-primary hover:text-primary/80 truncate">
          {mapName || "Map"} - Arrakis Atlas (Public View)
        </Link>
      </div>
    </header>
  );
}

export function PublicMapView({ mapData: initialMapData, localGrid: initialLocalGrid, publicViewId }: PublicMapViewProps) {
  const [mapData, setMapData] = useState(initialMapData);
  const [localGrid, setLocalGrid] = useState(initialLocalGrid);
  
  const [focusedCellCoords, setFocusedCellCoords] = useState<FocusedCellCoordinates | null>(null);
  const [selectedIconId, setSelectedIconId] = useState<string | null>(null);

  // This effect is to handle potential hydration mismatches if initial props were different
  useEffect(() => {
    setMapData(initialMapData);
    setLocalGrid(initialLocalGrid);
  }, [initialMapData, initialLocalGrid]);


  if (!mapData || !localGrid) {
    // This case should ideally be handled by the parent page.tsx with a "Not Found" message
    // But as a fallback:
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <PublicHeader mapName="Not Found" />
        <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold text-destructive-foreground">Map Data Unavailable</h2>
          <p className="text-muted-foreground">The requested map could not be loaded.</p>
        </main>
        <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
          Arrakis Atlas - Public View
        </footer>
      </div>
    );
  }
  
  const handleCellFocus = (rowIndex: number, colIndex: number) => {
    setFocusedCellCoords({ rowIndex, colIndex });
    setSelectedIconId(null); // Clear icon selection when focusing a new cell
  };

  const handleIconSelect = (iconId: string | null) => {
    setSelectedIconId(iconId);
  };
  
  const handleCloseDetailedView = () => {
    setFocusedCellCoords(null);
    setSelectedIconId(null);
  }

  const baseGridDisplayWidth = `min(calc(100vh - 250px), calc(100vw - 32px))`;
  const maxGridDisplayWidth = '800px';
  
  const currentFocusedCellData = focusedCellCoords ? localGrid[focusedCellCoords.rowIndex][focusedCellCoords.colIndex] : null;
  const currentSelectedIconData = currentFocusedCellData && selectedIconId 
    ? currentFocusedCellData.placedIcons.find(i => i.id === selectedIconId) 
    : null;


  if (focusedCellCoords && currentFocusedCellData) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <PublicHeader mapName={mapData.name} />
        <main className="flex-grow container mx-auto px-0 sm:px-4 py-4 sm:py-8 flex flex-col">
          <div className="flex flex-row w-full flex-grow gap-6 p-4 md:p-6 items-start">
            <div
              className="flex flex-col items-center justify-start"
              style={{ width: baseGridDisplayWidth, maxWidth: maxGridDisplayWidth }}
            >
              <DetailedCellEditorCanvas
                rowIndex={focusedCellCoords.rowIndex}
                colIndex={focusedCellCoords.colIndex}
                className="w-full aspect-square bg-background rounded-lg shadow-xl border border-border"
                // Override props for public/read-only mode:
                isEditorOverride={false} 
                mapDataOverride={mapData}
                cellDataOverride={currentFocusedCellData}
                selectedIconIdOverride={selectedIconId}
                onIconSelectOverride={handleIconSelect}
              />
            </div>
            <div className="w-[300px] flex-shrink-0 flex flex-col gap-4">
              <IconSourcePalette
                rowIndex={focusedCellCoords.rowIndex}
                colIndex={focusedCellCoords.colIndex}
                // Override props for public/read-only mode:
                isReadOnlyOverride={true}
                mapDataOverride={mapData}
                cellDataOverride={currentFocusedCellData}
                onCloseOverride={handleCloseDetailedView}
              />
              {selectedIconId && currentSelectedIconData && (
                <MarkerEditorPanel
                  rowIndex={focusedCellCoords.rowIndex}
                  colIndex={focusedCellCoords.colIndex}
                  // Override props for public/read-only mode:
                  isReadOnlyOverride={true}
                  mapDataOverride={mapData}
                  cellDataOverride={currentFocusedCellData} 
                  selectedIconIdOverride={selectedIconId}
                  onCloseOverride={() => setSelectedIconId(null)}
                />
              )}
            </div>
          </div>
        </main>
        <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
          Arrakis Atlas - Public View
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PublicHeader mapName={mapData.name} />
      <main className="flex-grow container mx-auto px-0 sm:px-4 py-4 sm:py-8 flex flex-col">
        <div className="flex flex-col items-center space-y-2 w-full px-2 md:px-4">
          <p className="text-sm text-muted-foreground mb-2">Public View-Only Mode. Click on a cell to view details.</p>
          <DeepDesertGrid
            initialGridState={localGrid}
            initialMapData={mapData}
            isReadOnly={true}
            onCellClick={handleCellFocus} // Pass the handler
          />
        </div>
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        Arrakis Atlas - Public View
      </footer>
    </div>
  );
}

    