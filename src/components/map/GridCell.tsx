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
import Image from 'next/image'; // Import next/image

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
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    canEditCell = isOwner || isEditor;
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
  const hasBackgroundImage = !!cellData.backgroundImageUrl;

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

  const isEmptyCellVisuals = finalDisplayItems.length === 0 && !hasBackgroundImage;

  let ariaLabelContent = `Grid cell ${cellCoordinate}. `;
  if (hasBackgroundImage) {
    ariaLabelContent += `Has custom background. `;
  }
  if (hasIcons) {
    const iconLabels = finalDisplayItems
      .map(item => item.label)
      .join(', ');
    ariaLabelContent += `Contains ${iconLabels}. `;
  }
  if (hasNotes) {
    ariaLabelContent += `Notes present. `;
  }
  if (isEmptyCellVisuals && !hasNotes && !hasBackgroundImage) {
    ariaLabelContent += 'Empty. ';
  }

  ariaLabelContent += 'Click to view details.';

  const isRowA = rowIndex === GRID_SIZE - 1;
  const isA3 = isRowA && colIndex === 2;
  const isA4 = isRowA && colIndex === 3;
  const isA6 = isRowA && colIndex === 5;
  const isA7 = isRowA && colIndex === 6;

  let buttonBgClass = 'bg-card';
  if (!hasBackgroundImage && hasContent) {
    buttonBgClass = 'bg-accent/15';
  }

  let hoverBgClass = '';
  if (!hasBackgroundImage) {
    hoverBgClass = hasContent ? 'hover:bg-accent/25' : 'hover:bg-accent/20';
  }


  const cellButton = (
    <button
      id={cellId}
      aria-label={ariaLabelContent}
      disabled={!isReadOnly && (!currentMapData || !context?.setFocusedCellCoordinates)}
      onClick={handleCellButtonClick}
      onMouseEnter={onMouseEnterCell}
      onMouseLeave={onMouseLeaveCell}
      className={cn(
        "aspect-square flex items-center justify-center p-0.5 relative group transition-all duration-150 ease-in-out focus:outline-none overflow-hidden",
        buttonBgClass,
        hoverBgClass,
        (currentMapData || isReadOnly) && "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        !isReadOnly && !canEditCell && currentMapData && !hasContent && !hasBackgroundImage && "bg-muted/30",
        !isReadOnly && !canEditCell && currentMapData && (hasContent || hasBackgroundImage) && "opacity-80",
        !isReadOnly && (!currentMapData || !context?.setFocusedCellCoordinates) && "cursor-not-allowed opacity-50",
        "border", 
        isRowA ? 'border-emerald-600/75' : 'border-border',
        isA3 && "!border-r-destructive",
        isA4 && "!border-l-destructive",
        isA6 && "!border-r-destructive",
        isA7 && "!border-l-destructive"
      )}
    >
      {hasBackgroundImage && cellData.backgroundImageUrl && (
        <Image
          src={cellData.backgroundImageUrl}
          alt={`${cellCoordinate} background`}
          layout="fill"
          objectFit="cover"
          className="absolute inset-0 z-0 pointer-events-none"
          data-ai-hint="map texture"
        />
      )}

      {!canEditCell && currentMapData && isEmptyCellVisuals && !hasNotes && !hasBackgroundImage && !isReadOnly && (
         <Lock className="h-1/2 w-1/2 text-muted-foreground/50 absolute inset-0 m-auto z-10" />
      )}

      {hasIcons && (
        <div className="grid grid-cols-3 grid-rows-3 gap-px h-[calc(100%-4px)] w-[calc(100%-4px)] p-px relative z-10"> {/* Ensure icons are above background */}
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"> {/* Ensure zoom icon is on top */}
              <ZoomIn className="h-2/5 w-2/5 text-foreground opacity-10 group-hover:opacity-30 transition-opacity duration-150" />
          </div>
      )}

    </button>
  );

  if (hasNotes && !hasBackgroundImage) { // Only show tooltip if no background image, or adjust tooltip to be more prominent
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

