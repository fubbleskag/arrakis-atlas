
"use client";

import type React from 'react';
import type { IconType } from '@/types';
import { ICON_TYPES } from '@/types'; 
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
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
    currentMapData,
    setFocusedCellCoordinates,
  } = useMap();
  const { isAuthenticated, user } = useAuth();

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

  if (!cellData) { 
      return <div className="aspect-square bg-destructive/20 flex items-center justify-center text-xs text-destructive">Err</div>;
  }

  let canEdit = false;
  if (isAuthenticated && user && currentMapData) {
    canEdit = currentMapData.userId === user.uid;
  }
  
  const handleCellClick = () => {
    // Only allow focusing if the map exists and the user can edit it OR if the map exists for viewing
     if (currentMapData) {
      setFocusedCellCoordinates({ rowIndex, colIndex });
    }
  };
  
  const cellId = `cell-${rowIndex}-${colIndex}`;
  const rowLabel = String.fromCharCode(65 + (GRID_CELL_INTERNAL_SIZE - 1 - rowIndex));
  const colLabel = colIndex + 1;
  const cellCoordinate = `${rowLabel}${colLabel}`;
  const hasNotes = cellData.notes && cellData.notes.trim() !== '';
  const hasIcons = cellData.icons.length > 0;
  const isEmptyCell = !hasIcons && !hasNotes;

  let ariaLabelContent = `Grid cell ${cellCoordinate}. `;
  if (hasIcons) {
    ariaLabelContent += `Contains ${cellData.icons.map(icon => ICON_CONFIG_MAP[icon].label).join(', ')}. `;
  }
  if (hasNotes) {
    ariaLabelContent += `Contains notes. `;
  }
  if (isEmptyCell) {
    ariaLabelContent += 'Empty. ';
  }
  ariaLabelContent += canEdit ? 'Click to view or edit.' : 'Click to view.';


  return (
      <button
        id={cellId}
        aria-label={ariaLabelContent}
        disabled={!currentMapData} // Disabled if no map is loaded
        onClick={handleCellClick}
        className={cn(
          "aspect-square flex items-center justify-center p-1 relative group transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "bg-card", 
          currentMapData ? "hover:bg-accent/20 cursor-pointer" : "cursor-not-allowed",
          !canEdit && currentMapData && "bg-muted/30"
        )}
      >
        {!canEdit && currentMapData && isEmptyCell && (
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
         {isEmptyCell && currentMapData && (
           <span className="absolute text-xs text-muted-foreground group-hover:text-accent-foreground">
             {canEdit ? "Edit" : "View"}
           </span>
         )}
          {(hasIcons || hasNotes) && !isEmptyCell && currentMapData && (
             <span className="absolute bottom-1 right-1 text-[10px] text-muted-foreground/70 group-hover:text-accent-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              {canEdit ? "Edit" : "View"}
            </span>
          )}
      </button>
  );
}

    