
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
import type { LocalGridState, MapData, FocusedCellCoordinates as FocusedCellCoordinatesType } from '@/types';
import { cn } from '@/lib/utils';
import { GRID_SIZE } from '@/lib/mapUtils'; 

interface DeepDesertGridProps {
  initialGridState?: LocalGridState;
  initialMapData?: MapData;
  isReadOnly?: boolean;
  onCellClick?: (rowIndex: number, colIndex: number) => void; // New prop for public view
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
  // Use focusedCellCoordinates from context if available (authenticated view), otherwise null (public view manages its own)
  const focusedCellCoordinatesFromContext = context?.focusedCellCoordinates;


  const [hoveredCell, setHoveredCell] = useState<{row: number | null, col: number | null}>({ row: null, col: null });

  if ((!isReadOnly && isLoadingMapData) || !currentLocalGrid || !currentMapData) {
    return <div>Loading map grid...</div>;
  }

  const gridToRender: LocalGridState = currentLocalGrid;

  let canResetMap = false;
  if (!isReadOnly && isAuthenticated && user && currentMapData && context) {
    canResetMap = currentMapData.ownerId === user.uid;
  }
  
  // Determine effective focused cell coordinates based on context or if it's read-only (public view)
  // For public view, the parent (`PublicMapView`) handles focus, so this component doesn't need to track it for layout.
  // For authenticated view, `focusedCellCoordinatesFromContext` is used.
  const sidebarVisible = !isReadOnly && !!focusedCellCoordinatesFromContext;

  const sidebarWidth = 300;
  const gapWidth = 24; // 1.5rem
  const gridWidthStyle = sidebarVisible
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
                hoveredCell.col === colIndex && "bg-accent text-accent-foreground" // Hover always active
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
                 hoveredCell.row === rowIndex && "bg-accent text-accent-foreground" // Hover always active
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
                cellData={isReadOnly ? cellData : undefined} 
                mapData={isReadOnly ? currentMapData : undefined}
                onCellClick={isReadOnly ? onCellClick : undefined} // Pass onCellClick for read-only mode
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

    