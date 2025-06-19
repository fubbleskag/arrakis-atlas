
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

interface DetailedCellEditorCanvasProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
  // Override props for use outside MapContext (e.g., public view)
  isEditorOverride?: boolean;
  mapDataOverride?: MapData;
  cellDataOverride?: GridCellData;
  selectedIconIdOverride?: string | null;
  onIconSelectOverride?: (iconId: string | null) => void;
}

interface PlacedIconVisualProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  iconData: PlacedIcon;
  isSelected: boolean;
  canEdit: boolean; // True if this specific icon can be interacted with (dragged, selected for editing)
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
        canEdit ? "cursor-pointer" : "cursor-default", // Pointer if it can be selected/moved
        isSelected && canEdit && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md z-[2]", // Ring only if selected AND editable
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

  // Tooltip for notes should always be active if note exists
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
  const context = useMap(); // Still use context for fallbacks or if overrides not provided
  const { user } = useAuth(); // Still use auth context for ownership checks

  const canvasRef = useRef<HTMLDivElement>(null);

  // Determine data source: overrides or context
  const isEditorMode = isEditorOverride !== undefined ? isEditorOverride : true; // Default to editor mode if not specified
  
  const mapData = isEditorMode ? context.currentMapData : mapDataOverride;
  const grid = isEditorMode ? context.currentLocalGrid : null; // gridCellDataOverride is used directly for public
  const cellData = isEditorMode ? grid?.[rowIndex]?.[colIndex] : cellDataOverride;
  
  const isLoading = isEditorMode ? context.isLoadingMapData : false; // No loading state for override mode

  const selectedPlacedIconId = isEditorMode ? context.selectedPlacedIconId : selectedIconIdOverride;
  const setSelectedPlacedIconId = isEditorMode ? context.setSelectedPlacedIconId : onIconSelectOverride;
  
  const addPlacedIconToCell = context.addPlacedIconToCell; // Context functions assumed for editor mode
  const updatePlacedIconPositionInCell = context.updatePlacedIconPositionInCell;

  // Determine if the current user can edit (applies to context mode, override mode is explicit via isEditorOverride)
  let canEditCanvas = false;
  if (isEditorMode) { // Context mode
    if (user && mapData) {
      canEditCanvas = mapData.ownerId === user.uid;
    }
  } else { // Override mode (public view)
    canEditCanvas = isEditorOverride ?? false;
  }


  if (isLoading || !mapData) {
    return (
      <div className={cn("relative w-full aspect-square bg-card rounded-lg shadow-xl flex items-center justify-center border border-border", className)}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (!cellData) {
    return (
      <div className={cn("relative w-full aspect-square bg-destructive/10 rounded-lg shadow-xl flex flex-col items-center justify-center p-4 text-center border border-border", className)}>
        <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
        <p className="text-sm text-destructive-foreground">Cell data not available.</p>
      </div>
    );
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (canEditCanvas) { // Only allow drop if canvas is editable
      e.dataTransfer.dropEffect = e.dataTransfer.getData("action") === "move" ? "move" : "copy";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEditCanvas || !canvasRef.current || !isEditorMode) return; // Drop only works in editor mode

    const action = e.dataTransfer.getData("action");
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    let y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (action === "move") {
      const placedIconIdToMove = e.dataTransfer.getData("placedIconId");
      if (placedIconIdToMove && updatePlacedIconPositionInCell && setSelectedPlacedIconId) {
        updatePlacedIconPositionInCell(rowIndex, colIndex, placedIconIdToMove, x, y);
        setSelectedPlacedIconId(placedIconIdToMove);
      }
    } else if (action === "add") {
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
    // Dragging existing icons is only allowed if canvas is editable AND it's editor mode
    if (!canEditCanvas || !isEditorMode || selectedPlacedIconId === placedIcon.id) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("placedIconId", placedIcon.id);
    e.dataTransfer.setData("action", "move");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === canvasRef.current && setSelectedPlacedIconId) {
      setSelectedPlacedIconId(null);
    }
  };

  return (
    <div
      ref={canvasRef}
      className={cn("relative overflow-hidden", className)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
    >
      {cellData.backgroundImageUrl && (
        <Image
          src={cellData.backgroundImageUrl}
          alt="Cell background"
          layout="fill"
          objectFit="contain" // Use contain to ensure entire image is visible
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
          canEdit={canEditCanvas} // Icon interaction depends on overall canvas editability
          onClick={() => {
            if (setSelectedPlacedIconId) setSelectedPlacedIconId(icon.id);
          }}
          draggable={canEditCanvas && isEditorMode && selectedPlacedIconId !== icon.id} // Draggable only if editable & in editor mode
          onDragStart={canEditCanvas && isEditorMode ? (e: React.DragEvent<HTMLDivElement>) => handlePlacedIconDragStart(e, icon) : undefined}
        />
      ))}
      {cellData.placedIcons.length === 0 && !cellData.backgroundImageUrl && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <p className="text-muted-foreground text-lg p-4 text-center bg-background/50 rounded-md">
            {canEditCanvas && isEditorMode ? "Drag markers or upload background" : <><ImageIcon className="inline-block h-5 w-5 mr-1" /> No markers or background</>}
          </p>
        </div>
      )}
    </div>
  );
}

    