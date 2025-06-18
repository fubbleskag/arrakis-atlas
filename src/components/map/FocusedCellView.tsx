
"use client";

import type React from 'react';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { IconPalette } from './IconPalette';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

interface FocusedCellViewProps {
  rowIndex: number;
  colIndex: number;
}

const GRID_SIZE = 9;

export function FocusedCellView({ rowIndex, colIndex }: FocusedCellViewProps) {
  const { 
    currentLocalGrid, 
    toggleIconInCell, 
    clearIconsInCell, 
    updateCellNotes,
    currentMapData,
    isLoadingMapData,
  } = useMap();
  const { isAuthenticated, user } = useAuth();

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

  if (isLoadingMapData || !currentMapData) {
    return (
        <div className="w-full max-w-2xl mx-auto p-4 flex flex-col items-center">
            <Skeleton className="h-10 w-3/4 mb-6" />
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }
  
  if (!cellData) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 space-y-4 flex-grow">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold text-destructive-foreground">Error</h2>
        <p className="text-muted-foreground">
          Could not load data for the selected cell.
        </p>
      </div>
    );
  }

  let canEdit = false;
  if (isAuthenticated && user && currentMapData) {
    canEdit = currentMapData.userId === user.uid;
  }

  const rowLabel = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex));
  const colLabel = colIndex + 1;
  const cellCoordinate = `${rowLabel}${colLabel}`;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">
          Editing Cell: {cellCoordinate}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <IconPalette
          currentIcons={cellData.icons}
          onIconChange={(icon) => toggleIconInCell(rowIndex, colIndex, icon)}
          onClearAll={() => clearIconsInCell(rowIndex, colIndex)}
          currentNotes={cellData.notes}
          onNotesChange={(notes) => updateCellNotes(rowIndex, colIndex, notes)}
          canEdit={canEdit}
        />
      </CardContent>
    </Card>
  );
}

    