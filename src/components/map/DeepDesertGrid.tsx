
"use client";

import { useState } from 'react';
import { useMap } from '@/contexts/MapContext';
import { GridCell } from './GridCell';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { LocalGridState, MapData } from '@/types';
import { cn } from '@/lib/utils';
import { GRID_SIZE } from '@/lib/mapUtils'; 
import { Skeleton } from '@/components/ui/skeleton';

interface DeepDesertGridProps {
  initialGridState?: LocalGridState;
  initialMapData?: MapData;
  isReadOnly?: boolean;
  onCellClick?: (rowIndex: number, colIndex: number) => void;
  // gridWidthStyle prop is effectively replaced by parent sizing
}

export function DeepDesertGrid({ 
  initialGridState, 
  initialMapData, 
  isReadOnly = false,
  onCellClick 
}: DeepDesertGridProps) {
  const context = !isReadOnly ? useMap() : null;
  const { user, isAuthenticated } = !isReadOnly ? useAuth() : { user: null, isAuthenticated: false };

  const currentLocalGrid = isReadOnly ? initialGridState : context?.currentLocalGrid;
  const currentMapData = isReadOnly ? initialMapData : context?.currentMapData;
  const isLoadingMapData = !isReadOnly && (context?.isLoadingMapData ?? true);
  
  const resetCurrentMapGrid = context?.resetCurrentMapGrid;

  const [hoveredCell, setHoveredCell] = useState<{row: number | null, col: number | null}>({ row: null, col: null });

  if ((!isReadOnly && isLoadingMapData && !currentLocalGrid) || (!isReadOnly && !currentMapData)) {
    // Show a full-size skeleton if context data is loading and grid isn't ready
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-card rounded-lg shadow-xl border border-border">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }
  
  if (isReadOnly && (!initialGridState || !initialMapData)) {
     // Show a full-size skeleton if initial data for read-only mode is not provided
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-card rounded-lg shadow-xl border border-border">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  const gridToRender: LocalGridState | null = isReadOnly ? initialGridState : currentLocalGrid;
  const mapDataForGrid: MapData | null = isReadOnly ? initialMapData : currentMapData;

  if (!gridToRender || !mapDataForGrid) {
     // Fallback if data is still unexpectedly null
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
        Loading map grid...
      </div>
    );
  }


  let canResetMap = false;
  if (!isReadOnly && isAuthenticated && user && mapDataForGrid && context) {
    canResetMap = mapDataForGrid.ownerId === user.uid;
  }
  
  return (
    // This root div should fill its parent which is sized by page.tsx or PublicMapView.tsx
    <div className="flex flex-col items-center space-y-2 w-full h-full">
      <div
        className="grid w-full h-full" // Grid structure takes full width/height of its direct parent
        style={{
          gridTemplateColumns: 'auto 1fr', // col for row labels, col for cells
          gridTemplateRows: 'auto 1fr',    // row for col labels, row for cells
          gap: '0.25rem', // Small gap between labels and grid
        }}
        role="grid"
        aria-label={`Deep Desert Map ${mapDataForGrid.name}`}
      >
        <div /> {/* Top-left empty cell */}
        {/* Column Headers (1-9) */}
        <div className="grid grid-cols-9 gap-px justify-items-stretch"> {/* Use justify-items-stretch */}
          {Array.from({ length: GRID_SIZE }).map((_, colIndex) => (
            <div
              key={`col-label-${colIndex}`}
              className={cn(
                "flex items-center justify-center text-center text-xs sm:text-sm font-medium text-muted-foreground aspect-square bg-card rounded-sm transition-colors p-1",
                hoveredCell.col === colIndex && "bg-accent text-accent-foreground" 
              )}
            >
              {colIndex + 1}
            </div>
          ))}
        </div>
        {/* Row Headers (A-I) */}
        <div className="grid grid-rows-9 gap-px items-stretch"> {/* Use items-stretch */}
          {Array.from({ length: GRID_SIZE }).map((_, rowIndex) => (
            <div
              key={`row-label-${rowIndex}`}
              className={cn(
                "flex items-center justify-center text-center text-xs sm:text-sm font-medium text-muted-foreground aspect-square bg-card rounded-sm transition-colors p-1",
                 hoveredCell.row === rowIndex && "bg-accent text-accent-foreground"
              )}
            >
              {String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex))}
            </div>
          ))}
        </div>
        {/* Grid Cells */}
        <div
          className="grid grid-cols-9 grid-rows-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl"
        >
          {gridToRender.map((row, rIndex) =>
            row.map((cellData, cIndex) => (
              <GridCell
                key={cellData.id || `${rIndex}-${cIndex}`}
                rowIndex={rIndex}
                colIndex={cIndex}
                onMouseEnterCell={() => setHoveredCell({ row: rIndex, col: cIndex })}
                onMouseLeaveCell={() => setHoveredCell({ row: null, col: null })}
                isReadOnly={isReadOnly}
                cellData={isReadOnly ? cellData : undefined} 
                mapData={isReadOnly ? mapDataForGrid : undefined}
                onCellClick={isReadOnly ? onCellClick : undefined} 
              />
            ))
          )}
        </div>
      </div>

      {!isReadOnly && canResetMap && resetCurrentMapGrid && (
         <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isLoadingMapData}>
              <RotateCcw className="mr-2 h-4 w-4" /> Coriolis Storm
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Invoke a Coriolis Storm?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently reset the grid for the current map
                (&quot;{mapDataForGrid?.name || 'Unnamed Map'}&quot;), clearing all placed icons and notes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetCurrentMapGrid}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
