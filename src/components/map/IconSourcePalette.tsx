
"use client";

import type React from 'react';
import { useState, useEffect } from 'react';
import { ICON_TYPES, type IconType } from '@/types';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Trash2, X as XIcon } from 'lucide-react';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';


interface IconSourcePaletteProps {
  rowIndex: number;
  colIndex: number;
}

export function IconSourcePalette({ rowIndex, colIndex }: IconSourcePaletteProps) {
  const {
    currentLocalGrid,
    updateCellNotes,
    clearAllPlacedIconsInCell, // Using the new function
    setFocusedCellCoordinates,
    currentMapData,
    isLoadingMapData,
    // Stubs for future DnD functionality - not used in this step
    // addPlacedIconToCell, 
  } = useMap();
  const { isAuthenticated, user } = useAuth();

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];
  const [localNotes, setLocalNotes] = useState(cellData?.notes || '');

  useEffect(() => {
    if (cellData) {
      setLocalNotes(cellData.notes);
    }
  }, [cellData]);

  if (isLoadingMapData || !currentMapData) {
    return (
      <Card className="w-full h-full shadow-lg flex flex-col overflow-hidden border-border bg-card">
        <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-7 w-7 rounded-sm" />
            </div>
            <Skeleton className="h-24 w-full" />
            <Separator />
            <Skeleton className="h-5 w-1/3 mb-1" />
            <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!cellData) {
    return (
      <Card className="w-full h-full shadow-lg flex flex-col items-center justify-center text-center p-8 space-y-4 border-border bg-card">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive-foreground">Cell Error</h2>
        <p className="text-muted-foreground text-sm">
          Detailed cell data is unavailable.
        </p>
         <Button variant="outline" size="sm" onClick={() => setFocusedCellCoordinates(null)}>
            Close
        </Button>
      </Card>
    );
  }
  
  let canEdit = false;
  if (isAuthenticated && user && currentMapData) {
    canEdit = currentMapData.userId === user.uid;
  }

  const handleNotesInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (canEdit) {
      setLocalNotes(event.target.value);
      // Debounce or onBlur might be better for performance
      updateCellNotes(rowIndex, colIndex, event.target.value);
    }
  };

  const handleIconClick = (iconType: IconType) => {
    if (!canEdit) return;
    // In the future, this will initiate a drag or directly add the icon.
    // For now, it's a placeholder for future DnD.
    // Example: addPlacedIconToCell(rowIndex, colIndex, iconType, 50, 50); // Add to center
    console.log(`Icon ${iconType} clicked/dragged - future DnD add`);
    // toast({ title: "Drag & Drop", description: `Drag ${ICON_CONFIG_MAP[iconType].label} to the canvas.`});
  };


  return (
    <Card className="w-full h-full shadow-lg flex flex-col overflow-hidden border-border bg-card">
      <CardContent className="flex-grow flex flex-col p-3 md:p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-base font-semibold leading-none text-foreground">Resources & Notes</h4>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setFocusedCellCoordinates(null)}
            aria-label="Close editor"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex justify-between items-center mb-1 mt-2">
            <h5 className="text-sm font-medium text-foreground">Available Resources</h5>
            {canEdit && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => clearAllPlacedIconsInCell(rowIndex, colIndex)} 
                className="text-xs text-muted-foreground hover:text-destructive"
                disabled={!canEdit || cellData.placedIcons.length === 0}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear Canvas
              </Button>
            )}
        </div>
        <ScrollArea className="flex-shrink overflow-y-auto pr-1" style={{ maxHeight: 'calc(100% - 200px)'}}> {/* Adjust maxHeight as needed */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-1 border-t border-border">
            {ICON_TYPES.map((iconType) => {
              const config = ICON_CONFIG_MAP[iconType];
              const Icon = config.IconComponent;
              // TODO: Add draggable props here in the future
              return (
                <div
                  key={iconType}
                  onClick={() => handleIconClick(iconType)} // Placeholder for DnD
                  // onDragStart={(e) => handleDragStart(e, iconType)} // Future DnD
                  // draggable={canEdit} // Future DnD
                  title={canEdit ? `Drag to add ${config.label}` : config.label}
                  className={cn(
                    "text-sm font-normal flex items-center p-2 rounded-md border border-transparent transition-colors", 
                    canEdit ? "cursor-grab hover:bg-accent/50 hover:border-accent" : "cursor-not-allowed opacity-70",
                    "text-muted-foreground"
                  )}
                >
                  <Icon className={cn("mr-2 h-5 w-5 text-primary", !canEdit && "opacity-70")} />
                  {config.label}
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <Separator className="my-3" />

        <div className="flex-grow flex flex-col">
          <Label htmlFor="cell-notes" className="text-sm font-medium text-foreground mb-1 block">
            Notes
          </Label>
          <Textarea
            id="cell-notes"
            value={localNotes}
            onChange={handleNotesInputChange}
            placeholder={canEdit ? "Add notes for this cell..." : "No notes or view only."}
            className="min-h-[80px] w-full text-sm bg-input placeholder:text-muted-foreground flex-grow"
            aria-label="Cell notes"
            disabled={!canEdit}
            readOnly={!canEdit}
          />
        </div>
      </CardContent>
    </Card>
  );
}
