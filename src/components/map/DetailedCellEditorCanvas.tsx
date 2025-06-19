
"use client";

import type React from 'react';
import { useRef } from 'react';
import { useMap } from '@/contexts/MapContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { ICON_TYPES, type PlacedIcon, type IconType } from '@/types';
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

  const iconElement = (
    <div
      {...divProps}
      onClick={onClick} // Always handle click to allow selection
      className={cn(
        "absolute w-8 h-8",
        canEdit ? "cursor-pointer" : "cursor-default", // Cursor reflects editability, but click always selects
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-md z-[2]", 
        !isSelected && "z-[1]" // Ensure non-selected icons don't visually overlap the ring of a selected one
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">{Config.label}</p>
            <p>{iconData.note}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return iconElement;
};


export function DetailedCellEditorCanvas({ rowIndex, colIndex, className }: DetailedCellEditorCanvasProps) {
  const {
    currentLocalGrid,
    isLoadingMapData,
    currentMapData,
    addPlacedIconToCell,
    updatePlacedIconPositionInCell,
    selectedPlacedIconId,
    setSelectedPlacedIconId,
  } = useMap();
  const { user } = useAuth();

  const canvasRef = useRef<HTMLDivElement>(null);
  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

  let canEdit = false;
  if (user && currentMapData && currentMapData.ownerId === user.uid) {
    canEdit = true;
  }

  if (isLoadingMapData || !currentMapData) {
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
    if (canEdit) {
      e.dataTransfer.dropEffect = e.dataTransfer.getData("action") === "move" ? "move" : "copy";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEdit || !canvasRef.current) return;

    const action = e.dataTransfer.getData("action");
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    let y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (action === "move") {
      const placedIconIdToMove = e.dataTransfer.getData("placedIconId");
      if (placedIconIdToMove) {
        updatePlacedIconPositionInCell(rowIndex, colIndex, placedIconIdToMove, x, y);
        setSelectedPlacedIconId(placedIconIdToMove); 
      }
    } else if (action === "add") {
      const iconTypeString = e.dataTransfer.getData("iconType");
      if (ICON_TYPES.includes(iconTypeString as IconType)) {
        const iconType = iconTypeString as IconType;
        addPlacedIconToCell(rowIndex, colIndex, iconType, x, y);
      }
    }
  };

  const handlePlacedIconDragStart = (e: React.DragEvent<HTMLDivElement>, placedIcon: PlacedIcon) => {
    if (!canEdit || selectedPlacedIconId === placedIcon.id) { 
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("placedIconId", placedIcon.id);
    e.dataTransfer.setData("action", "move");
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === canvasRef.current) {
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
          canEdit={canEdit}
          onClick={() => {
            // Allow selection even if not editable, but editing panel will be disabled
            setSelectedPlacedIconId(icon.id);
          }}
          draggable={canEdit && selectedPlacedIconId !== icon.id} 
          onDragStart={canEdit ? (e: React.DragEvent<HTMLDivElement>) => handlePlacedIconDragStart(e, icon) : undefined}
        />
      ))}
      {cellData.placedIcons.length === 0 && !cellData.backgroundImageUrl && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <p className="text-muted-foreground text-lg p-4 text-center bg-background/50 rounded-md">
            {canEdit ? "Drag markers or upload background" : <><ImageIcon className="inline-block h-5 w-5 mr-1" /> No markers or background</>}
          </p>
        </div>
      )}
    </div>
  );
}
