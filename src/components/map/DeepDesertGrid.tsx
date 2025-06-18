
"use client";

import { useGrid } from '@/contexts/GridContext';
import { GridCell } from './GridCell';
import { Skeleton } from '@/components/ui/skeleton';
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
} from "@/components/ui/alert-dialog"


const GRID_SIZE = 9;

export function DeepDesertGrid() {
  const { gridState, isLoading, resetGrid } = useGrid();
  const { isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center space-y-4 w-full">
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'auto 1fr',
            gridTemplateRows: 'auto 1fr',
            gap: '0.25rem', // Tailwind gap-1
            width: 'min(calc(100vh - 200px), calc(100vw - 32px))',
            maxWidth: '800px',
          }}
        >
          {/* Top-left: Empty */}
          <div />

          {/* Column Labels Skeleton */}
          <div className="grid grid-cols-9 gap-px">
            {Array.from({ length: GRID_SIZE }).map((_, i) => (
              <Skeleton key={`sk-col-${i}`} className="h-8 aspect-square rounded-sm" />
            ))}
          </div>

          {/* Row Labels Skeleton */}
          <div className="grid grid-rows-9 gap-px">
            {Array.from({ length: GRID_SIZE }).map((_, i) => (
              <Skeleton key={`sk-row-${i}`} className="w-8 aspect-square rounded-sm" />
            ))}
          </div>

          {/* Actual Grid Skeleton */}
          <div className="grid grid-cols-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl aspect-square">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <Skeleton key={`sk-cell-${i}`} className="aspect-square w-full h-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'auto 1fr', // Column for row labels, column for main content (col labels + grid)
          gridTemplateRows: 'auto 1fr',    // Row for column labels, row for main content (row labels + grid)
          gap: '0.25rem', // Tailwind gap-1, for spacing between label sections and main grid
          width: 'min(calc(100vh - 200px), calc(100vw - 32px))', // Overall width for the component
          maxWidth: '800px', // Overall max-width
        }}
      >
        {/* Top-left: Empty for spacing */}
        <div />

        {/* Column Labels (1-9) */}
        <div className="grid grid-cols-9 gap-px">
          {Array.from({ length: GRID_SIZE }).map((_, colIndex) => (
            <div
              key={`col-label-${colIndex}`}
              className="flex items-center justify-center text-center h-8 text-sm font-medium text-muted-foreground aspect-square bg-card rounded-sm"
            >
              {colIndex + 1}
            </div>
          ))}
        </div>

        {/* Row Labels (I-A from top to bottom, representing A-I from bottom of grid to top) */}
        <div className="grid grid-rows-9 gap-px">
          {Array.from({ length: GRID_SIZE }).map((_, rowIndex) => (
            <div
              key={`row-label-${rowIndex}`}
              className="flex items-center justify-center text-center w-8 text-sm font-medium text-muted-foreground aspect-square bg-card rounded-sm"
            >
              {String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex))}
            </div>
          ))}
        </div>

        {/* Actual Interactive Grid */}
        <div
          className="grid grid-cols-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl aspect-square"
          // width and height are effectively 1fr from the parent CSS grid.
          // aspect-square here ensures the cell grid itself is square.
          role="grid"
          aria-label="Deep Desert Map"
        >
          {gridState.map((row, rIndex) => // Renamed to rIndex to avoid conflict
            row.map((_, cIndex) => ( // Renamed to cIndex to avoid conflict
              <GridCell
                key={`${rIndex}-${cIndex}`}
                rowIndex={rIndex}
                colIndex={cIndex}
              />
            ))
          )}
        </div>
      </div>

      {/* Reset Button */}
      {isAuthenticated && (
         <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Map
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently reset the map data
                stored in your browser.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetGrid}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
