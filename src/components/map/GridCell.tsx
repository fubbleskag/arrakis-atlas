
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
  onCellClick?: (rowIndex: number, colIndex: number) => void;
}

export function GridCell({ 
  rowIndex, 
  colIndex, 
  onMouseEnterCell, 
  onMouseLeaveCell, 
  isReadOnly = false,
  cellData: directCellData,
  mapData: directMapData,
  onCellClick
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
  
  const hasIcons = cellData.placedIcons.length > 0;
  const hasNotes = cellData.notes && cellData.notes.trim() !== '';
  const hasContent = hasIcons || hasNotes;
  
  const uniqueIconTypesInCell: IconType[] = [];
  if (hasIcons) {
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
  
  const isEmptyCellVisuals = finalDisplayItems.length === 0;


  let ariaLabelContent = `Grid cell ${cellCoordinate}. `;
  if (hasIcons) {
    const iconLabels = finalDisplayItems
      .map(item => item.label)
      .join(', ');
    ariaLabelContent += `Contains ${iconLabels}. `;
  }
  if (hasNotes) {
    ariaLabelContent += `Notes present. `;
  }
  if (isEmptyCellVisuals && !hasNotes) {
    ariaLabelContent += 'Empty. ';
  }
  
  ariaLabelContent += 'Click to view details.';


  const cellButton = (
    <button
      id={cellId}
      aria-label={ariaLabelContent}
      disabled={!isReadOnly && (!currentMapData || !context?.setFocusedCellCoordinates)}
      onClick={handleCellButtonClick}
      onMouseEnter={onMouseEnterCell}
      onMouseLeave={onMouseLeaveCell}
      className={cn(
        "aspect-square flex items-center justify-center p-0.5 relative group transition-all duration-150 ease-in-out focus:outline-none",
        hasContent ? 'bg-accent/15' : 'bg-card',
        (currentMapData || isReadOnly) && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        (currentMapData || isReadOnly) && (hasContent ? 'hover:bg-accent/25' : 'hover:bg-accent/20'),
        !isReadOnly && !canEditCell && currentMapData && !hasContent && "bg-muted/30", // Non-editable, no content
        !isReadOnly && !canEditCell && currentMapData && hasContent && "opacity-80", // Non-editable, has content (orange hue is base, just dim it slightly)
        !isReadOnly && (!currentMapData || !context?.setFocusedCellCoordinates) && "cursor-not-allowed opacity-50"
      )}
    >
      {!canEditCell && currentMapData && isEmptyCellVisuals && !hasNotes && !isReadOnly && (
         <Lock className="h-1/2 w-1/2 text-muted-foreground/50 absolute inset-0 m-auto" />
      )}
      
      {hasIcons && (
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
