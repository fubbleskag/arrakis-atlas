
"use client";

import type React from 'react';
import { useState } from 'react';
import type { IconType } from '@/types';
import { ICON_TYPES } from '@/types'; 
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IconPalette } from './IconPalette';
import { cn } from '@/lib/utils';
import { Lock, StickyNote } from 'lucide-react';

interface GridCellProps {
  rowIndex: number;
  colIndex: number;
}

const GRID_CELL_INTERNAL_SIZE = 9; 

export function GridCell({ rowIndex, colIndex }: GridCellProps) {
  const { 
    currentLocalGrid, 
    toggleIconInCell, 
    clearIconsInCell, 
    updateCellNotes,
    currentMapData,
  } = useMap();
  const { isAuthenticated, user } = useAuth();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

  if (!cellData) { 
      return <div className="aspect-square bg-destructive/20 flex items-center justify-center text-xs text-destructive">Err</div>;
  }

  let canEdit = false;
  if (isAuthenticated && user && currentMapData) {
    // User can edit if their UID matches the map's userId
    canEdit = currentMapData.userId === user.uid;
  }
  
  const handleToggleIcon = (icon: IconType) => {
    if (canEdit) {
      toggleIconInCell(rowIndex, colIndex, icon);
    }
  };

  const handleClearAllIcons = () => {
    if (canEdit) {
      clearIconsInCell(rowIndex, colIndex);
    }
  };

  const handleNotesChange = (notes: string) => {
    if (canEdit) {
      updateCellNotes(rowIndex, colIndex, notes);
    }
  };
  
  const cellId = `cell-${rowIndex}-${colIndex}`;
  const rowLabel = String.fromCharCode(65 + (GRID_CELL_INTERNAL_SIZE - 1 - rowIndex));
  const colLabel = colIndex + 1;
  const cellCoordinate = `${rowLabel}${colLabel}`;
  const hasNotes = cellData.notes && cellData.notes.trim() !== '';

  let ariaLabelContent = `Grid cell ${cellCoordinate}. `;
  if (cellData.icons.length > 0) {
    ariaLabelContent += `Contains ${cellData.icons.map(icon => ICON_CONFIG_MAP[icon].label).join(', ')}. `;
  } else {
    ariaLabelContent += 'Empty. ';
  }
  if (hasNotes) {
    ariaLabelContent += 'Contains notes. ';
  }
  ariaLabelContent += canEdit ? 'Click to edit.' : 'View only.';


  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          id={cellId}
          aria-label={ariaLabelContent}
          disabled={!canEdit && !currentMapData}
          className={cn(
            "aspect-square flex items-center justify-center p-1 relative group transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "bg-card", // Default background for the cell
            canEdit && currentMapData ? "hover:bg-accent/20 cursor-pointer" : "cursor-not-allowed",
            !canEdit && currentMapData && "bg-muted/30", // Overrides bg-card if not editable
            popoverOpen && canEdit && currentMapData && "bg-accent/30 ring-2 ring-accent" // Overrides bg-card if popover open
          )}
        >
          {!canEdit && currentMapData && !cellData.icons.length && !hasNotes && (
             <Lock className="h-1/2 w-1/2 text-muted-foreground/50 absolute inset-0 m-auto" />
          )}
          {hasNotes && (
            <StickyNote className="absolute top-0.5 right-0.5 h-3 w-3 text-primary/70 group-hover:text-accent-foreground/70" />
          )}
          <div className="grid grid-cols-3 gap-0.5 h-full w-full">
            {ICON_TYPES.map((iconType) => {
              const isActive = cellData.icons.includes(iconType);
              const { IconComponent, label } = ICON_CONFIG_MAP[iconType];
              if (isActive) {
                return (
                  <div key={iconType} className="flex items-center justify-center" title={label}>
                    <IconComponent className="w-4 h-4 text-primary" />
                  </div>
                );
              }
              return <div key={iconType} className="opacity-0" />; 
            })}
          </div>
           {cellData.icons.length === 0 && !hasNotes && canEdit && currentMapData && (
             <span className="absolute text-xs text-muted-foreground group-hover:text-accent-foreground">Edit</span>
           )}
        </button>
      </PopoverTrigger>
      {canEdit && currentMapData && (
        <PopoverContent className="w-auto p-0" align="start" sideOffset={5}>
          <IconPalette
            currentIcons={cellData.icons}
            onIconChange={handleToggleIcon}
            onClearAll={handleClearAllIcons}
            currentNotes={cellData.notes}
            onNotesChange={handleNotesChange}
            canEdit={canEdit} 
          />
        </PopoverContent>
      )}
    </Popover>
  );
}
