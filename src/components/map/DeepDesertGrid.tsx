
"use client";

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
import type { LocalGridState, UserRole } from '@/types'; // Added UserRole


const GRID_SIZE = 9;

export function DeepDesertGrid() {
  const { 
    currentLocalGrid, 
    isLoadingMapData, 
    resetCurrentMapGrid,
    currentMapData
  } = useMap(); 
  const { user, isAuthenticated } = useAuth(); // Added user


  if (isLoadingMapData || !currentLocalGrid) {
    return <div>Loading map grid...</div>; 
  }
  
  const gridToRender: LocalGridState = currentLocalGrid;

  // Determine if the current user can reset the map (owner or co-owner)
  let canResetMap = false;
  if (isAuthenticated && user && currentMapData) {
    const userRole = currentMapData.collaborators[user.uid];
    canResetMap = userRole === 'owner' || userRole === 'co-owner';
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div
        className="grid"
        style={{
          gridTemplateColumns: 'auto 1fr', 
          gridTemplateRows: 'auto 1fr',    
          gap: '0.25rem', 
          width: 'min(calc(100vh - 250px), calc(100vw - 32px))',
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
          {gridToRender.map((row, rIndex) => 
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

      {canResetMap && ( // Use the new canResetMap variable
         <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={isLoadingMapData}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Map Grid
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently reset the grid for the current map
                (&quot;{currentMapData?.name || 'Unnamed Map'}&quot;).
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
