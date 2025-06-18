
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
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <Skeleton className="h-10 w-3/4 mb-6" />
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (!cellData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
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
    // Simplified permission: if the map belongs to the user, they can edit.
    canEdit = currentMapData.userId === user.uid;
  }

  const rowLabel = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex));
  const colLabel = colIndex + 1;
  const cellCoordinate = `${rowLabel}${colLabel}`;

  return (
    <Card className="w-full h-full shadow-2xl flex flex-col overflow-hidden border-border bg-card">
      <CardHeader className="py-3 px-4 md:px-5 flex-shrink-0">
        <CardTitle className="text-lg md:text-xl text-primary">
          Editing Cell: {cellCoordinate}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto p-3 md:p-4">
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
