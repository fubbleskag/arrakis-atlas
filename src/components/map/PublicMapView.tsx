
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
import { AlertTriangle, MapPin } from 'lucide-react';


const HEADER_HEIGHT = 65; 
const FOOTER_HEIGHT = 33;
const MAIN_SM_PY_TOTAL = 64; 
const MAIN_SM_PX_TOTAL = 32; 
const PAGE_INTERNAL_PADDING_X = 48; 
const PAGE_INTERNAL_PADDING_Y = 48;

const PAGE_VERTICAL_OVERHEAD = HEADER_HEIGHT + FOOTER_HEIGHT + MAIN_SM_PY_TOTAL + PAGE_INTERNAL_PADDING_Y;
const PAGE_HORIZONTAL_TOTAL_PADDING = MAIN_SM_PX_TOTAL + PAGE_INTERNAL_PADDING_X;


const SIDE_PANEL_WIDTH = 300;
const SIDE_PANEL_GAP = 24;


interface PublicMapViewProps {
  mapData: MapData | null; 
  localGrid: LocalGridState | null; 
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

  useEffect(() => {
    setMapData(initialMapData);
    setLocalGrid(initialLocalGrid);
    setFocusedCellCoords(null); 
    setSelectedIconId(null);
  }, [initialMapData, initialLocalGrid]);


  if (!mapData || !localGrid) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <PublicHeader mapName="Not Found" />
        <main className="flex-grow px-0 sm:px-4 py-0 sm:py-8 flex flex-col items-center justify-center">
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


  if (focusedCellCoords && currentFocusedCellData) {
    const canvasAvailableHeight = `calc(100vh - ${PAGE_VERTICAL_OVERHEAD}px)`;
    const canvasAvailableWidth = `calc(100vw - ${PAGE_HORIZONTAL_TOTAL_PADDING}px - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px)`;
    const canvasHolderDimension = `min(${canvasAvailableHeight}, ${canvasAvailableWidth})`;

    return (
      <div className="flex flex-col min-h-screen bg-background">
        <PublicHeader mapName={mapData.name} />
        <main className="flex-grow px-0 sm:px-4 py-0 sm:py-8 flex flex-col items-center justify-start">
          <div className="flex flex-row w-full max-w-full items-start gap-6 p-4 md:p-6"> {/* max-w-full ensures it uses available space */}
            <div className="flex-grow flex items-center justify-center h-full">
                <div
                style={{
                    width: canvasHolderDimension,
                    height: canvasHolderDimension,
                }}
                className="relative"
                >
                <DetailedCellEditorCanvas
                    rowIndex={focusedCellCoords.rowIndex}
                    colIndex={focusedCellCoords.colIndex}
                    isEditorOverride={false} 
                    mapDataOverride={mapData}
                    cellDataOverride={currentFocusedCellData}
                    selectedIconIdOverride={selectedIconId}
                    onIconSelectOverride={handleIconSelect}
                    className="w-full h-full"
                />
                </div>
            </div>
            <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 sticky top-6">
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
          </div>
        </main>
        <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
          Arrakis Atlas - Public View
        </footer>
      </div>
    );
  }

  // Full grid view
  const gridAvailableHeight = `calc(100vh - ${PAGE_VERTICAL_OVERHEAD}px)`;
  const gridAvailableWidth = `calc(100vw - ${PAGE_HORIZONTAL_TOTAL_PADDING}px)`;
  const gridHolderDimension = `min(${gridAvailableHeight}, ${gridAvailableWidth})`;


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PublicHeader mapName={mapData.name} />
      <main className="flex-grow px-0 sm:px-4 py-0 sm:py-8 flex flex-col items-center justify-start">
        <div className="flex flex-col items-center justify-start w-full p-4 md:p-6"> {/* p-4/p-6 here */}
          <p className="text-sm text-muted-foreground mb-2">Public View-Only Mode. Click on a cell to view details.</p>
          <div style={{ width: gridHolderDimension, height: gridHolderDimension }}>
            <DeepDesertGrid
              initialGridState={localGrid}
              initialMapData={mapData}
              isReadOnly={true}
              onCellClick={handleCellFocus} 
            />
          </div>
        </div>
      </main>
      <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
        Arrakis Atlas - Public View
      </footer>
    </div>
  );
}

