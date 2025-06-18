
"use client";

import type React from 'react';
import { useMap } from '@/contexts/MapContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { ICON_TYPES, type PlacedIcon, type IconType } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';


interface DetailedCellEditorCanvasProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
}

export function DetailedCellEditorCanvas({ rowIndex, colIndex, className }: DetailedCellEditorCanvasProps) {
  const { currentLocalGrid, isLoadingMapData, currentMapData, addPlacedIconToCell, updatePlacedIconPositionInCell, removePlacedIconFromCell } = useMap();
  const { user } = useAuth();
  const { toast } = useToast();

  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

  let canEdit = false;
  if (user && currentMapData && currentMapData.userId === user.uid) {
    canEdit = true;
  }

  if (isLoadingMapData || !currentMapData) {
    return (
      <div className={cn("relative w-full aspect-square bg-card rounded-lg shadow-xl flex items-center justify-center", className)}>
        <Skeleton className="w-full h-full" />
      </div>
    );
  }
  
  if (!cellData) {
    return (
      <div className={cn("relative w-full aspect-square bg-destructive/10 rounded-lg shadow-xl flex flex-col items-center justify-center p-4 text-center", className)}>
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
    if (!canEdit) {
      console.warn("Attempted to drop icon, but editing is not allowed.");
      return;
    }

    const action = e.dataTransfer.getData("action");
    const canvasRect = e.currentTarget.getBoundingClientRect();
    let x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    let y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    // Clamp coordinates to be within 0-100
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    if (action === "move") {
      const placedIconId = e.dataTransfer.getData("placedIconId");
      if (placedIconId) {
        console.log(`DetailedCellEditorCanvas: Moving icon ${placedIconId} to ${x.toFixed(1)}%, ${y.toFixed(1)}% for cell ${rowIndex},${colIndex}.`);
        updatePlacedIconPositionInCell(rowIndex, colIndex, placedIconId, x, y);
      } else {
        console.warn("DetailedCellEditorCanvas: Drop action was 'move' but no placedIconId found.");
      }
    } else { // Default to "add" (or if action is not set, assume it's a new icon from palette)
      const iconTypeString = e.dataTransfer.getData("iconType");
      if (ICON_TYPES.includes(iconTypeString as IconType)) {
        const iconType = iconTypeString as IconType;
        console.log(`DetailedCellEditorCanvas: Dropped new ${iconType} at ${x.toFixed(1)}%, ${y.toFixed(1)}% for cell ${rowIndex},${colIndex}. Calling addPlacedIconToCell.`);
        addPlacedIconToCell(rowIndex, colIndex, iconType, x, y);
      } else {
        console.warn("DetailedCellEditorCanvas: Invalid icon type dropped or no iconType data:", iconTypeString);
      }
    }
  };

  const handlePlacedIconDragStart = (e: React.DragEvent<HTMLDivElement>, placedIconId: string) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("placedIconId", placedIconId);
    e.dataTransfer.setData("action", "move"); // Important: Differentiate from adding a new icon
    e.dataTransfer.effectAllowed = "move";
    console.log(`DetailedCellEditorCanvas: Dragging placed icon ${placedIconId}`);
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, placedIconId: string) => {
    e.preventDefault();
    if (!canEdit) return;
    console.log(`DetailedCellEditorCanvas: Context menu for icon ${placedIconId}. Calling removePlacedIconFromCell.`);
    removePlacedIconFromCell(rowIndex, colIndex, placedIconId);
    toast({ title: "Icon Removed", description: "The icon has been removed from this cell." });
  };

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {cellData.placedIcons.map((icon: PlacedIcon) => {
        const Config = ICON_CONFIG_MAP[icon.type];
        if (!Config) return null;
        const IconComponent = Config.IconComponent;
        return (
          <div
            key={icon.id}
            draggable={canEdit}
            onDragStart={(e) => handlePlacedIconDragStart(e, icon.id)}
            onContextMenu={(e) => handleContextMenu(e, icon.id)}
            className={cn(
              "absolute w-8 h-8", // Fixed size for icons on canvas (tailwind w-8 h-8 is 32px)
              canEdit ? "cursor-move" : "cursor-default"
            )}
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              transform: 'translate(-50%, -50%)', // Center the icon on its x,y coordinates
            }}
            title={`${Config.label} (ID: ${icon.id.substring(0,4)}) at ${icon.x.toFixed(1)}%, ${icon.y.toFixed(1)}% ${canEdit ? '- Right-click to remove' : ''}`}
          >
            <IconComponent className="w-full h-full text-primary" />
          </div>
        );
      })}
      {cellData.placedIcons.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-lg">
            {canEdit ? "Drag resources here" : "No resources placed"}
          </p>
        </div>
      )}
    </div>
  );
}
