
"use client";

import { useGrid } from '@/contexts/GridContext';
import { GridCell } from './GridCell';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertTriangle } from 'lucide-react';
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
  const { gridState, isLoading: isGridContextLoading, isGridDataLoading, resetGrid } = useGrid();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Overall loading state considers both auth and grid data loading
  const isLoading = isAuthLoading || isGridContextLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center space-y-4 w-full">
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'auto 1fr',
            gridTemplateRows: 'auto 1fr',
            gap: '0.25rem', 
            width: 'min(calc(100vh - 200px), calc(100vw - 32px))',
            maxWidth: '800px',
          }}
        >
          <div />
          <div className="grid grid-cols-9 gap-px justify-items-center">
            {Array.from({ length: GRID_SIZE }).map((_, i) => (
              <Skeleton key={`sk-col-${i}`} className="h-8 aspect-square rounded-sm" />
            ))}
          </div>
          <div className="grid grid-rows-9 gap-px items-center">
            {Array.from({ length: GRID_SIZE }).map((_, i) => (
              <Skeleton key={`sk-row-${i}`} className="w-8 aspect-square rounded-sm" />
            ))}
          </div>
          <div className="grid grid-cols-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl aspect-square">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
              <Skeleton key={`sk-cell-${i}`} className="aspect-square w-full h-full" />
            ))}
          </div>
        </div>
         <Skeleton className="h-10 w-32" /> 
      </div>
    );
  }
  
  if (!isAuthenticated && !isAuthLoading) {
     return (
      <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
        <AlertTriangle className="h-16 w-16 text-primary" />
        <h2 className="text-2xl font-semibold">Authentication Required</h2>
        <p className="text-muted-foreground">
          Please log in to view and interact with the Arrakis Atlas.
        </p>
        <p className="text-sm text-muted-foreground">
          Your map data will be saved to your account.
        </p>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'auto 1fr', 
          gridTemplateRows: 'auto 1fr',    
          gap: '0.25rem', 
          width: 'min(calc(100vh - 200px), calc(100vw - 32px))', 
          maxWidth: '800px', 
        }}
      >
        <div />
        <div className="grid grid-cols-9 gap-px justify-items-center">
          {Array.from({ length: GRID_SIZE }).map((_, colIndex) => (
            <div
              key={`col-label-${colIndex}`}
              className="flex items-center justify-center text-center h-8 text-sm font-medium text-muted-foreground aspect-square bg-card rounded-sm"
            >
              {colIndex + 1}
            </div>
          ))}
        </div>
        <div className="grid grid-rows-9 gap-px items-center">
          {Array.from({ length: GRID_SIZE }).map((_, rowIndex) => (
            <div
              key={`row-label-${rowIndex}`}
              className="flex items-center justify-center text-center w-8 text-sm font-medium text-muted-foreground aspect-square bg-card rounded-sm"
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
          {gridState.map((row, rIndex) => 
            row.map((cellData, cIndex) => ( 
              <GridCell
                key={cellData.id || `${rIndex}-${cIndex}`}
                rowIndex={rIndex}
                colIndex={cIndex}
              />
            ))
          )}
        </div>
      </div>

      {isAuthenticated && (
         <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isGridDataLoading}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Map
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently reset your map data
                in the cloud.
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

