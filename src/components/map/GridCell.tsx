
"use client";

import type React from 'react';
import type { IconType, MapData, GridCellData as GridCellDataType } from '@/types';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Lock, ZoomIn } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GRID_SIZE } from '@/lib/mapUtils';

interface GridCellProps {
  rowIndex: number;
  colIndex: number;
  onMouseEnterCell: () => void;
  onMouseLeaveCell: () => void;
  isReadOnly?: boolean;
  cellData?: GridCellDataType; 
  mapData?: MapData; 
  onCellClick?: (rowIndex: number, colIndex: number) => void; // New prop
}

export function GridCell({ 
  rowIndex, 
  colIndex, 
  onMouseEnterCell, 
  onMouseLeaveCell, 
  isReadOnly = false,
  cellData: directCellData,
  mapData: directMapData,
  onCellClick // Destructure new prop
}: GridCellProps) {
  
  const context = !isReadOnly ? useMap() : null;
  const { isAuthenticated, user } = !isReadOnly ? useAuth() : { isAuthenticated: false, user: null };

  const cellDataFromContext = context?.currentLocalGrid?.[rowIndex]?.[colIndex];
  const mapDataFromContext = context?.currentMapData;

  const cellData = isReadOnly ? directCellData : cellDataFromContext;
  const currentMapData = isReadOnly ? directMapData : mapDataFromContext;


  if (!cellData) { 
      return <div className="aspect-square bg-destructive/20 flex items-center justify-center text-xs text-destructive">Err</div>;
  }

  let canEditCell = false;
  if (!isReadOnly && isAuthenticated && user && currentMapData && context) {
    canEditCell = currentMapData.ownerId === user.uid;
  }
  
  const handleCellButtonClick = () => {
     if (isReadOnly && onCellClick) {
        onCellClick(rowIndex, colIndex);
     } else if (!isReadOnly && currentMapData && context?.setFocusedCellCoordinates) {
        context.setFocusedCellCoordinates({ rowIndex, colIndex });
     }
  };
  
  const cellId = `cell-${rowIndex}-${colIndex}`;
  const rowLetter = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex));
  const colNumber = colIndex + 1;
  const cellCoordinate = `${rowLetter}-${colNumber}`;
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

  const finalDisplayItems: { key: string; IconComponent: React.FC<any>; label: string }[] = uniqueIconTypesInCell
    .slice(0, 9) 
    .map(iconType => {
      const config = ICON_CONFIG_MAP[iconType];
      return config ? { key: iconType, IconComponent: config.IconComponent, label: config.label } : null;
    })
    .filter(item => item !== null) as { key: string; IconComponent: React.FC<any>; label: string }[];
  
  const hasPlacedContent = finalDisplayItems.length > 0;
  const isEmptyCellVisuals = !hasPlacedContent;


  let ariaLabelContent = `Grid cell ${cellCoordinate}. `;
  if (hasPlacedContent) {
    const iconLabels = finalDisplayItems
      .map(item => item.label)
      .join(', ');
    ariaLabelContent += `Contains ${iconLabels}. `;
  }
  if (hasNotes) {
    ariaLabelContent += `Notes: ${cellData.notes.substring(0, 100)}${cellData.notes.length > 100 ? '...' : ''}. `;
  }
  if (isEmptyCellVisuals && !hasNotes) {
    ariaLabelContent += 'Empty. ';
  }
  
  ariaLabelContent += 'Click to view details.'; // Always clickable now for public view focus


  const cellButton = (
    <button
      id={cellId}
      aria-label={ariaLabelContent}
      // Disable only if not read-only AND (no map data OR no context function to set focus)
      disabled={!isReadOnly && (!currentMapData || !context?.setFocusedCellCoordinates)}
      onClick={handleCellButtonClick}
      onMouseEnter={onMouseEnterCell}
      onMouseLeave={onMouseLeaveCell}
      className={cn(
        "aspect-square flex items-center justify-center p-0.5 relative group transition-all duration-150 ease-in-out focus:outline-none",
        "bg-card", 
        // Hover and focus styles apply if either in authenticated mode with context OR in read-only mode (for public focus)
        (currentMapData || isReadOnly) && "hover:bg-accent/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Special styling for non-editable cells in authenticated mode
        !isReadOnly && !canEditCell && currentMapData && "bg-muted/30",
        // Disabled state styling (should only apply if not readOnly and no way to set focus)
        !isReadOnly && (!currentMapData || !context?.setFocusedCellCoordinates) && "cursor-not-allowed opacity-50"
      )}
    >
      {!canEditCell && currentMapData && isEmptyCellVisuals && !isReadOnly && (
         <Lock className="h-1/2 w-1/2 text-muted-foreground/50 absolute inset-0 m-auto" />
      )}
      
      {hasPlacedContent && (
        <div className="grid grid-cols-3 grid-rows-3 gap-px h-[calc(100%-4px)] w-[calc(100%-4px)] p-px">
          {finalDisplayItems.map((item) => {
            const IconComponent = item.IconComponent;
            return (
              <div key={item.key} className="flex items-center justify-center overflow-hidden" title={item.label}>
                <IconComponent className={cn("w-[60%] h-[60%]", 'text-primary')} />
              </div>
            );
          })}
        </div>
      )}

      {/* ZoomIn icon only if interactive (either context-based or public-view click enabled) */}
      {(currentMapData || (isReadOnly && onCellClick)) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <ZoomIn className="h-2/5 w-2/5 text-foreground opacity-10 group-hover:opacity-30 transition-opacity duration-150" />
          </div>
      )}
       
    </button>
  );

  if (hasNotes) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{cellButton}</TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-xs p-2 whitespace-pre-wrap">
            <p className="text-sm">{cellData.notes}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cellButton;
}

    