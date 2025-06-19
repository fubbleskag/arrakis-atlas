
"use client";

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'; 
import { Trash2, X as XIcon, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MarkerEditorPanelProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
}

export function MarkerEditorPanel({ rowIndex, colIndex, className }: MarkerEditorPanelProps) {
  const {
    selectedPlacedIconId,
    setSelectedPlacedIconId,
    currentLocalGrid,
    currentMapData,
    updatePlacedIconNote,
    updatePlacedIconPositionInCell,
    removePlacedIconFromCell,
    isLoadingMapData,
  } = useMap();
  const { user } = useAuth();
  const { toast } = useToast();

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];
  const selectedIcon = cellData?.placedIcons.find(icon => icon.id === selectedPlacedIconId);

  const [localNote, setLocalNote] = useState('');
  const [localX, setLocalX] = useState<number | string>('');
  const [localY, setLocalY] = useState<number | string>('');

  const resetLocalState = useCallback(() => {
    if (selectedIcon) {
      setLocalNote(selectedIcon.note || '');
      setLocalX(selectedIcon.x.toFixed(2));
      setLocalY(selectedIcon.y.toFixed(2));
    }
  }, [selectedIcon]);

  useEffect(() => {
    if (selectedIcon) {
      resetLocalState();
    } else if (selectedPlacedIconId) {
      // If an ID is selected but the icon isn't found (e.g., race condition, or deleted from another client)
      // deselect it to avoid a broken state.
      setSelectedPlacedIconId(null);
    }
  }, [selectedIcon, selectedPlacedIconId, setSelectedPlacedIconId, resetLocalState]);

  let canEdit = false;
  if (user && currentMapData && currentMapData.ownerId === user.uid) {
    canEdit = true;
  }

  if (isLoadingMapData && selectedPlacedIconId) {
     return (
      <Card className={cn("w-full shadow-lg border-border bg-card", className)}>
        <CardHeader className="p-3 md:p-4 flex flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-sm" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-7 rounded-sm" />
            <Skeleton className="h-7 w-7 rounded-sm" />
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4 space-y-3">
          <Skeleton className="h-5 w-1/4 mb-1" />
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Skeleton className="h-5 w-1/3 mb-1" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div>
              <Skeleton className="h-5 w-1/3 mb-1" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!selectedIcon || !currentMapData) {
    return null; 
  }

  const IconConfig = ICON_CONFIG_MAP[selectedIcon.type];
  const IconComponent = IconConfig?.IconComponent;

  const handleNoteChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (canEdit) setLocalNote(event.target.value);
  };

  const handleNoteSave = () => {
    if (canEdit && selectedIcon.note !== localNote) {
      updatePlacedIconNote(rowIndex, colIndex, selectedIcon.id, localNote);
      toast({ title: "Note Updated", description: `Note for ${IconConfig?.label || 'marker'} saved.` });
    }
  };

  const handleCoordinateChange = (value: string, setter: React.Dispatch<React.SetStateAction<number | string>>) => {
    if (canEdit) {
      if (value === '' || value === '-') {
        setter(value);
      } else {
        const num = parseFloat(value);
        if (!isNaN(num)) {
          setter(num);
        }
      }
    }
  };
  
  const handleCoordinateSave = (coordType: 'x' | 'y') => {
    if (!canEdit) return;

    let valueToSave: number;
    let currentValueInIcon: number;

    if (coordType === 'x') {
        valueToSave = typeof localX === 'string' ? parseFloat(localX) : localX;
        currentValueInIcon = selectedIcon.x;
    } else {
        valueToSave = typeof localY === 'string' ? parseFloat(localY) : localY;
        currentValueInIcon = selectedIcon.y;
    }
    
    if (isNaN(valueToSave)) {
        toast({ title: "Invalid Input", description: `Coordinate must be a number. Reverting.`, variant: "destructive" });
        resetLocalState();
        return;
    }

    const clampedValue = Math.max(0, Math.min(100, valueToSave));

    if (clampedValue !== currentValueInIcon) {
        const newX = coordType === 'x' ? clampedValue : selectedIcon.x;
        const newY = coordType === 'y' ? clampedValue : selectedIcon.y;
        updatePlacedIconPositionInCell(rowIndex, colIndex, selectedIcon.id, newX, newY);
        toast({ title: "Position Updated", description: `${coordType.toUpperCase()} coordinate for ${IconConfig?.label || 'marker'} saved.` });
    }
    // Ensure local state reflects the clamped and saved value, formatted
    if (coordType === 'x') setLocalX(clampedValue.toFixed(2));
    if (coordType === 'y') setLocalY(clampedValue.toFixed(2));
  };


  const handleDelete = () => {
    if (canEdit) {
      removePlacedIconFromCell(rowIndex, colIndex, selectedIcon.id);
      toast({ title: "Marker Deleted", description: `${IconConfig?.label || 'Marker'} removed.` });
      // setSelectedPlacedIconId(null) will be called by removePlacedIconFromCell if the selected one is deleted
    }
  };

  const handleClose = () => setSelectedPlacedIconId(null);

  return (
    <Card className={cn("w-full shadow-lg border-border bg-card", className)}>
      <CardHeader className="p-3 md:p-4 flex flex-row justify-between items-center">
        <div className="flex items-center gap-2">
          {IconComponent && <IconComponent className="w-5 h-5 text-primary" />}
          <span className="text-sm font-semibold text-foreground">{IconConfig?.label || 'Marker'}</span>
        </div>
        <div className="flex items-center gap-1">
          {canEdit && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete marker" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>Delete Marker</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close marker editor" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-4 space-y-3">
        <div>
          <Label htmlFor={`marker-note-${selectedIcon.id}`} className="text-xs font-medium text-foreground mb-1 block">Note</Label>
          <Textarea
            id={`marker-note-${selectedIcon.id}`}
            value={localNote}
            onChange={handleNoteChange}
            onBlur={handleNoteSave}
            placeholder={canEdit ? "Add a note for this marker..." : "No note or view only."}
            className="min-h-[60px] text-sm bg-input placeholder:text-muted-foreground"
            disabled={!canEdit}
            readOnly={!canEdit}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`marker-x-${selectedIcon.id}`} className="text-xs font-medium text-foreground mb-1 block">X %</Label>
            <Input
              id={`marker-x-${selectedIcon.id}`}
              type="number"
              value={localX}
              onChange={(e) => handleCoordinateChange(e.target.value, setLocalX)}
              onBlur={() => handleCoordinateSave('x')}
              placeholder="0-100"
              className="text-sm bg-input"
              min="0"
              max="100"
              step="0.01"
              disabled={!canEdit}
              readOnly={!canEdit}
            />
          </div>
          <div>
            <Label htmlFor={`marker-y-${selectedIcon.id}`} className="text-xs font-medium text-foreground mb-1 block">Y %</Label>
            <Input
              id={`marker-y-${selectedIcon.id}`}
              type="number"
              value={localY}
              onChange={(e) => handleCoordinateChange(e.target.value, setLocalY)}
              onBlur={() => handleCoordinateSave('y')}
              placeholder="0-100"
              className="text-sm bg-input"
              min="0"
              max="100"
              step="0.01"
              disabled={!canEdit}
              readOnly={!canEdit}
            />
          </div>
        </div>
        {!canEdit && (
             <CardDescription className="text-xs flex items-center gap-1 text-muted-foreground pt-1">
                <Info className="h-3 w-3" /> You do not have permission to edit this marker.
            </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
