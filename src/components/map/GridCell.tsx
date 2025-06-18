
"use client";

import type React from 'react';
import type { IconType } from '@/types';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Lock, StickyNote, Eye } from 'lucide-react';

interface GridCellProps {
  rowIndex: number;
  colIndex: number;
  onMouseEnterCell: () => void;
  onMouseLeaveCell: () => void;
}

const GRID_CELL_INTERNAL_SIZE = 9; // For label calculation

export function GridCell({ rowIndex, colIndex, onMouseEnterCell, onMouseLeaveCell }: GridCellProps) {
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
     if (currentMapData) {
      setFocusedCellCoordinates({ rowIndex, colIndex });
    }
  };
  
  const cellId = `cell-${rowIndex}-${colIndex}`;
  const rowLabel = String.fromCharCode(65 + (GRID_CELL_INTERNAL_SIZE - 1 - rowIndex));
  const colLabel = colIndex + 1;
  const cellCoordinate = `${rowLabel}${colLabel}`;
  const hasNotes = cellData.notes && cellData.notes.trim() !== '';
  
  const uniqueIconTypesInCell: IconType[] = [];
  if (cellData.placedIcons.length > 0) {
    const seenTypes = new Set<IconType>();
    cellData.placedIcons.forEach(pi => {
      if (!seenTypes.has(pi.type)) {
        seenTypes.add(pi.type);
        uniqueIconTypesInCell.push(pi.type);
      }
    });
  }
  const hasPlacedIcons = uniqueIconTypesInCell.length > 0;
  const isEmptyCell = !hasPlacedIcons && !hasNotes;


  let ariaLabelContent = `Grid cell ${cellCoordinate}. `;
  if (hasPlacedIcons) {
    const iconLabels = uniqueIconTypesInCell
      .slice(0, 3) 
      .map(iconType => ICON_CONFIG_MAP[iconType]?.label || 'icon')
      .join(', ');
    ariaLabelContent += `Contains ${iconLabels}${uniqueIconTypesInCell.length > 3 ? ' and others' : ''}. `;
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
        disabled={!currentMapData} 
        onClick={handleCellClick}
        onMouseEnter={onMouseEnterCell}
        onMouseLeave={onMouseLeaveCell}
        className={cn(
          "aspect-square flex items-center justify-center p-0.5 relative group transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
        
        {hasPlacedIcons && (
          <div className="grid grid-cols-3 grid-rows-3 gap-px h-[calc(100%-4px)] w-[calc(100%-4px)] p-px">
            {uniqueIconTypesInCell.slice(0, 9).map((iconType, index) => {
              const { IconComponent, label } = ICON_CONFIG_MAP[iconType];
              return (
                <div key={`${iconType}-${index}`} className="flex items-center justify-center overflow-hidden" title={label}>
                  <IconComponent className="w-[60%] h-[60%] text-primary" />
                </div>
              );
            })}
          </div>
        )}

        {currentMapData && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Eye className="h-1/2 w-1/2 text-foreground opacity-10 group-hover:opacity-30 transition-opacity duration-150" />
            </div>
        )}
         
      </button>
  );
}
