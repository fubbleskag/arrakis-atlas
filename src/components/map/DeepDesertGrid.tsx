
"use client";

import { useState, useEffect } from 'react';
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


const GRID_SIZE = 9;

interface DeepDesertGridProps {
  initialGridState?: LocalGridState; // For public/read-only view
  initialMapData?: MapData;       // For public/read-only view
  isReadOnly?: boolean;             // For public/read-only view
}

export function DeepDesertGrid({ initialGridState, initialMapData, isReadOnly = false }: DeepDesertGridProps) {
  const context = !isReadOnly ? useMap() : null; // Only use context if not read-only
  const { user, isAuthenticated } = !isReadOnly ? useAuth() : { user: null, isAuthenticated: false };

  // State derived from props if read-only, otherwise from context
  const currentLocalGrid = isReadOnly ? initialGridState : context?.currentLocalGrid;
  const currentMapData = isReadOnly ? initialMapData : context?.currentMapData;
  const isLoadingMapData = !isReadOnly && (context?.isLoadingMapData ?? true);
  
  const resetCurrentMapGrid = context?.resetCurrentMapGrid;
  const focusedCellCoordinates = context?.focusedCellCoordinates;


  const [hoveredCell, setHoveredCell] = useState<{row: number | null, col: number | null}>({ row: null, col: null });


  if ((!isReadOnly && isLoadingMapData) || !currentLocalGrid || !currentMapData) {
    // Basic loading state, can be improved with skeletons similar to page.tsx
    return <div>Loading map grid...</div>;
  }

  const gridToRender: LocalGridState = currentLocalGrid;

  let canResetMap = false;
  if (!isReadOnly && isAuthenticated && user && currentMapData && context) {
    canResetMap = currentMapData.ownerId === user.uid;
  }

  const sidebarWidth = 300;
  const gapWidth = 24;
  const gridWidthStyle = focusedCellCoordinates && !isReadOnly // focusedCellCoordinates implies sidebar is open
    ? `min(calc(100vh - 250px - ${sidebarWidth}px - ${gapWidth}px), calc(100vw - 32px - ${sidebarWidth}px - ${gapWidth}px))`
    : `min(calc(100vh - 250px), calc(100vw - 32px))`;


  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'auto 1fr',
          gridTemplateRows: 'auto 1fr',
          gap: '0.25rem',
          width: gridWidthStyle,
          maxWidth: '800px',
        }}
      >
        <div />
        <div className="grid grid-cols-9 gap-px justify-items-center">
          {Array.from({ length: GRID_SIZE }).map((_, colIndex) => (
            <div
              key={`col-label-${colIndex}`}
              className={cn(
                "flex items-center justify-center text-center h-8 text-sm font-medium text-muted-foreground aspect-square bg-card rounded-sm transition-colors",
                hoveredCell.col === colIndex && !isReadOnly && "bg-accent text-accent-foreground"
              )}
            >
              {colIndex + 1}
            </div>
          ))}
        </div>
        <div className="grid grid-rows-9 gap-px items-center">
          {Array.from({ length: GRID_SIZE }).map((_, rowIndex) => (
            <div
              key={`row-label-${rowIndex}`}
              className={cn(
                "flex items-center justify-center text-center w-8 text-sm font-medium text-muted-foreground aspect-square bg-card rounded-sm transition-colors",
                hoveredCell.row === rowIndex && !isReadOnly && "bg-accent text-accent-foreground"
              )}
            >
              {String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex))}
            </div>
          ))}
        </div>
        <div
          className="grid grid-cols-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl aspect-square"
          role="grid"
          aria-label="Deep Desert Map"
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
                // Pass cell data directly if in read-only mode and not using context
                cellData={isReadOnly ? cellData : undefined} 
                mapData={isReadOnly ? currentMapData : undefined}
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
                (&quot;{currentMapData?.name || 'Unnamed Map'}&quot;), clearing all placed icons and notes.
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

    