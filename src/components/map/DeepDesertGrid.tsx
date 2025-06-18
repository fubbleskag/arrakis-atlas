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
      <div className="grid grid-cols-9 gap-0.5 p-4 bg-card rounded-md shadow-lg">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full h-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4 w-full">
      <div 
        className="grid grid-cols-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl"
        style={{ width: 'min(calc(100vh - 200px), calc(100vw - 32px))', maxWidth: '800px' }}
        role="grid"
        aria-label="Deep Desert Map"
      >
        {gridState.map((row, rowIndex) =>
          row.map((_, colIndex) => (
            <GridCell
              key={`${rowIndex}-${colIndex}`}
              rowIndex={rowIndex}
              colIndex={colIndex}
            />
          ))
        )}
      </div>
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
