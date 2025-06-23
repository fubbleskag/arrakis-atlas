
"use client";

import type React from 'react';
import { useRef } from 'react';
import { useMap } from '@/contexts/MapContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { ICON_TYPES, type PlacedIcon, type IconType, type MapData, type GridCellData } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ImageIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GRID_SIZE, getResizedImageUrl } from '@/lib/mapUtils';

interface DetailedCellEditorCanvasProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
  isEditorOverride?: boolean;
  mapDataOverride?: MapData;
  cellDataOverride?: GridCellData;
  selectedIconIdOverride?: string | null;
  onIconSelectOverride?: (iconId: string | null) => void;
}

interface PlacedIconVisualProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  iconData: PlacedIcon;
  isSelected: boolean;
  canEdit: boolean;
  onClick: () => void;
}

const PlacedIconVisual: React.FC<PlacedIconVisualProps> = ({
  iconData,
  isSelected,
  canEdit,
  onClick,
  ...divProps
}) => {
  const Config = ICON_CONFIG_MAP[iconData.type];
  if (!Config) return null;
  const IconComponent = Config.IconComponent;

  const iconElementBase = (
    <div
      {...divProps}
      onClick={onClick}
      className={cn(
        "absolute w-8 h-8",
        canEdit ? "cursor-pointer" : "cursor-default",
        isSelected && canEdit && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md z-[2]",
        !isSelected && "z-[1]"
      )}
      style={{
        left: `${iconData.x}%`,
        top: `${iconData.y}%`,
        transform: 'translate(-50%, -50%)',
        ...divProps.style,
      }}
    >
      <IconComponent className="w-full h-full text-primary" />
    </div>
  );

  if (iconData.note && iconData.note.trim() !== '') {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{iconElementBase}</TooltipTrigger>
          <TooltipContent side="top" align="center" className="max-w-xs p-2 whitespace-pre-wrap">
            <p className="text-sm font-semibold mb-0.5">{Config.label}</p>
            <p className="text-xs">{iconData.note}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  return iconElementBase;
};


export function DetailedCellEditorCanvas({
  rowIndex,
  colIndex,
  className,
  isEditorOverride,
  mapDataOverride,
  cellDataOverride,
  selectedIconIdOverride,
  onIconSelectOverride,
}: DetailedCellEditorCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const isContextMode = typeof isEditorOverride === 'undefined' || isEditorOverride === true;

  const context = isContextMode ? useMap() : null;
  const authData = isContextMode ? useAuth() : { user: null, isAuthenticated: false, isLoading: false };
  const { user } = authData;

  const mapData = isContextMode ? context?.currentMapData : mapDataOverride;
  const grid = isContextMode ? context?.currentLocalGrid : null;
  const cellData = isContextMode ? grid?.[rowIndex]?.[colIndex] : cellDataOverride;

  const isLoading = isContextMode ? context?.isLoadingMapData ?? false : false;

  const selectedPlacedIconId = isContextMode ? context?.selectedPlacedIconId : selectedIconIdOverride;

  const effectiveSetSelectedPlacedIconId = !isContextMode ? onIconSelectOverride : context?.setSelectedPlacedIconId;

  const addPlacedIconToCell = context?.addPlacedIconToCell;
  const updatePlacedIconPositionInCell = context?.updatePlacedIconPositionInCell;

  let canEditCanvas = false;
  if (isContextMode && context && user && mapData) {
      const isOwner = mapData.ownerId === user.uid;
      const isEditor = mapData.editors && mapData.editors.includes(user.uid);
      canEditCanvas = isOwner || isEditor;
  } else if (!isContextMode) {
      canEditCanvas = !(isEditorOverride === false);
  }


  const isRowA = rowIndex === GRID_SIZE - 1;
  const isA3 = isRowA && colIndex === 2;
  const isA4 = isRowA && colIndex === 3;
  const isA6 = isRowA && colIndex === 5;
  const isA7 = isRowA && colIndex === 6;

  const dynamicBorderClasses: string[] = ['border-[3px]'];

  if (isRowA) {
    dynamicBorderClasses.push('border-emerald-600/75');
    if (isA3) dynamicBorderClasses.push('!border-r-destructive');
    else if (isA4) dynamicBorderClasses.push('!border-l-destructive');
    else if (isA6) dynamicBorderClasses.push('!border-r-destructive');
    else if (isA7) dynamicBorderClasses.push('!border-l-destructive');
  } else {
    dynamicBorderClasses.push('border-border');
  }


  if (isLoading || !mapData) {
    return (
      <div className={cn(
        "relative w-full h-full bg-card shadow-xl flex items-center justify-center border border-border", // ensure h-full
        className
      )}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!cellData) {
    return (
      <div className={cn(
        "relative w-full h-full bg-destructive/10 shadow-xl flex flex-col items-center justify-center p-4 text-center border border-destructive", // ensure h-full
        className
      )}>
        <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
        <p className="text-sm text-destructive-foreground">Cell data not available.</p>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (canEditCanvas) {
      e.dataTransfer.dropEffect = e.dataTransfer.getData("action") === "move" ? "move" : "copy";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEditCanvas || !canvasRef.current || (!addPlacedIconToCell && !updatePlacedIconPositionInCell)) return;

    const action = e.dataTransfer.getData("action");
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    let y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (action === "move" && isContextMode) {
      const placedIconIdToMove = e.dataTransfer.getData("placedIconId");
      if (placedIconIdToMove && updatePlacedIconPositionInCell && effectiveSetSelectedPlacedIconId) {
        updatePlacedIconPositionInCell(rowIndex, colIndex, placedIconIdToMove, x, y);
        effectiveSetSelectedPlacedIconId(placedIconIdToMove);
      }
    } else if (action === "add" && isContextMode) {
      const iconTypeString = e.dataTransfer.getData("iconType");
      if (ICON_TYPES.includes(iconTypeString as IconType)) {
        const iconType = iconTypeString as IconType;
        if (addPlacedIconToCell) {
          addPlacedIconToCell(rowIndex, colIndex, iconType, x, y);
        }
      }
    }
  };

  const handlePlacedIconDragStart = (e: React.DragEvent<HTMLDivElement>, placedIcon: PlacedIcon) => {
    if (!canEditCanvas || !isContextMode || selectedPlacedIconId === placedIcon.id) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("placedIconId", placedIcon.id);
    e.dataTransfer.setData("action", "move");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === canvasRef.current && effectiveSetSelectedPlacedIconId) {
      effectiveSetSelectedPlacedIconId(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative overflow-hidden w-full h-full bg-background shadow-xl", // Removed aspect-square
        dynamicBorderClasses,
        className
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
    >
      {cellData.backgroundImageUrl && (
        <Image
          src={getResizedImageUrl(cellData.backgroundImageUrl, '1200x1200')}
          alt="Cell background"
          layout="fill"
          objectFit="contain"
          className="pointer-events-none"
          priority
          data-ai-hint="map texture"
        />
      )}
      {cellData.placedIcons.map((icon: PlacedIcon) => (
        <PlacedIconVisual
          key={icon.id}
          iconData={icon}
          isSelected={selectedPlacedIconId === icon.id}
          canEdit={canEditCanvas}
          onClick={() => {
            if (effectiveSetSelectedPlacedIconId) effectiveSetSelectedPlacedIconId(icon.id);
          }}
          draggable={canEditCanvas && isContextMode && selectedPlacedIconId !== icon.id}
          onDragStart={ (canEditCanvas && isContextMode) ? (e: React.DragEvent<HTMLDivElement>) => handlePlacedIconDragStart(e, icon) : undefined}
        />
      ))}
      {cellData.placedIcons.length === 0 && !cellData.backgroundImageUrl && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <p className="text-muted-foreground text-lg p-4 text-center bg-background/50">
            {(canEditCanvas && isContextMode) ? "Drag markers or upload background" : <><ImageIcon className="inline-block h-5 w-5 mr-1" /> No markers or background</>}
          </p>
        </div>
      )}
    </div>
  );
}
