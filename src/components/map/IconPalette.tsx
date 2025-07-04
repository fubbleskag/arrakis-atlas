
"use client";

// This file was previously IconPalette.tsx, then repurposed from FocusedCellView.tsx
// Now it's being finalized as IconSourcePalette.tsx

import type React from 'react';
import { useState, useEffect } from 'react';
import { ICON_TYPES, type IconType } from '@/types';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Trash2, X as XIcon, GripVertical } from 'lucide-react';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


interface IconSourcePaletteProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
}

export function IconSourcePalette({ rowIndex, colIndex, className }: IconSourcePaletteProps) {
  const {
    currentLocalGrid,
    updateCellNotes,
    clearAllPlacedIconsInCell,
    setFocusedCellCoordinates,
    currentMapData,
    isLoadingMapData,
    addPlacedIconToCell, 
  } = useMap();
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];
  const [localNotes, setLocalNotes] = useState(cellData?.notes || '');

  useEffect(() => {
    if (cellData) {
      setLocalNotes(cellData.notes);
    }
  }, [cellData?.notes, rowIndex, colIndex]); // Depend on cellData.notes and coordinates

  if (isLoadingMapData || !currentMapData) {
    return (
      <Card className={cn("w-full h-full shadow-lg flex flex-col overflow-hidden border-border bg-card", className)}>
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
      <Card className={cn("w-full h-full shadow-lg flex flex-col items-center justify-center text-center p-8 space-y-4 border-border bg-card", className)}>
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
    }
  };
  
  const handleNotesBlur = () => {
    if (canEdit && cellData && localNotes !== cellData.notes) {
      updateCellNotes(rowIndex, colIndex, localNotes);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, iconType: IconType) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("iconType", iconType);
    e.dataTransfer.effectAllowed = "copy";
    // console.log(`Dragging ${iconType}`);
  };

  return (
    <Card className={cn("w-full h-full shadow-lg flex flex-col overflow-hidden border-border bg-card", className)}>
      <CardContent className="flex-grow flex flex-col p-3 md:p-4 overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-base font-semibold leading-none text-foreground">Edit Cell Resources</h4>
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
                onClick={() => {
                    clearAllPlacedIconsInCell(rowIndex, colIndex);
                    toast({ title: "Canvas Cleared", description: "All icons removed from the cell."});
                }}
                className="text-xs text-muted-foreground hover:text-destructive"
                disabled={!canEdit || cellData.placedIcons.length === 0}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear Canvas
              </Button>
            )}
        </div>
        <ScrollArea className="flex-shrink pr-1 max-h-[300px] min-h-[150px]"> {/* Adjust maxHeight as needed */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 p-1 border-t border-border">
            {ICON_TYPES.map((iconType) => {
              const config = ICON_CONFIG_MAP[iconType];
              const Icon = config.IconComponent;
              return (
                <div
                  key={iconType}
                  onDragStart={(e) => handleDragStart(e, iconType)}
                  draggable={canEdit}
                  title={canEdit ? `Drag to add ${config.label}` : config.label}
                  className={cn(
                    "text-sm font-normal flex items-center p-1.5 rounded-md border border-transparent transition-colors group", 
                    canEdit ? "cursor-grab active:cursor-grabbing hover:bg-accent/50 hover:border-accent" : "cursor-not-allowed opacity-70",
                    "text-muted-foreground bg-card hover:text-accent-foreground"
                  )}
                >
                  {canEdit && <GripVertical className="h-4 w-4 mr-1.5 text-muted-foreground/70 group-hover:text-accent-foreground" />}
                  <Icon className={cn("mr-1.5 h-5 w-5 text-primary", !canEdit && "opacity-70")} />
                  <span className="truncate">{config.label}</span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        <Separator className="my-3" />

        <div className="flex-grow flex flex-col mt-1">
          <Label htmlFor="cell-notes" className="text-sm font-medium text-foreground mb-1 block">
            Notes
          </Label>
          <Textarea
            id="cell-notes"
            value={localNotes}
            onChange={handleNotesInputChange}
            onBlur={handleNotesBlur} // Save notes on blur
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
