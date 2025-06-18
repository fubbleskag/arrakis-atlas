
"use client";

import type React from 'react';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { IconPalette } from './IconPalette';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, X as XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FocusedCellViewProps {
  rowIndex: number;
  colIndex: number;
}

export function FocusedCellView({ rowIndex, colIndex }: FocusedCellViewProps) {
  const {
    currentLocalGrid,
    toggleIconInCell,
    clearIconsInCell,
    updateCellNotes,
    currentMapData,
    isLoadingMapData,
    setFocusedCellCoordinates, // For the close button
  } = useMap();
  const { isAuthenticated, user } = useAuth();

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

  if (isLoadingMapData || !currentMapData) {
    return (
        <div className="w-full h-full flex flex-col p-4 space-y-4">
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-6 w-1/2 mb-4" />
            <div className="space-y-3">
                {Array.from({length: 4}).map((_,i) => (
                    <div key={i} className="flex items-center space-x-2">
                        <Skeleton className="h-5 w-5 rounded-sm" />
                        <Skeleton className="h-5 w-2/3" />
                    </div>
                ))}
            </div>
            <Skeleton className="h-20 w-full mt-4" />
        </div>
    );
  }

  if (!cellData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold text-destructive-foreground">Error</h2>
        <p className="text-muted-foreground">
          Cell data unavailable.
        </p>
      </div>
    );
  }

  let canEdit = false;
  if (isAuthenticated && user && currentMapData) {
    canEdit = currentMapData.userId === user.uid;
  }

  return (
    <Card className="w-full h-full shadow-lg flex flex-col overflow-hidden border-border bg-card">
      <CardContent className="flex-grow overflow-y-auto p-3 md:p-4">
        <div className="flex justify-end mb-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setFocusedCellCoordinates(null)}
            aria-label="Close sidebar"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
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
