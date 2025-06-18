
"use client";

import type React from 'react';
import { useMap } from '@/contexts/MapContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { ICON_TYPES, type PlacedIcon, type IconType } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

interface DetailedCellEditorCanvasProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
}

export function DetailedCellEditorCanvas({ rowIndex, colIndex, className }: DetailedCellEditorCanvasProps) {
  const { currentLocalGrid, isLoadingMapData, currentMapData, addPlacedIconToCell, user } = useMap();
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
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "none";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canEdit) return;

    const iconTypeString = e.dataTransfer.getData("iconType");
    // Validate if iconTypeString is one of the allowed IconType values
    if (!ICON_TYPES.includes(iconTypeString as IconType)) {
        console.warn("Invalid icon type dropped:", iconTypeString);
        return; // Or handle error appropriately
    }
    const iconType = iconTypeString as IconType;


    const canvasRect = e.currentTarget.getBoundingClientRect();
    // Calculate position ensuring it's within 0-100 bounds and accounts for icon size (centering roughly)
    // Icon width/height assumed to be 32px for this calculation.
    const iconWidthPx = 32; 
    const iconHeightPx = 32;

    let x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    let y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    // Adjust to center the icon on the drop point
    // The icon's transform: translate(-50%, -50%) means its 'left' and 'top' CSS properties
    // refer to its center. So, the raw x and y are already the center.
    // We just need to clamp them to be within the canvas bounds (0-100).
    
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));


    addPlacedIconToCell(rowIndex, colIndex, iconType, x, y);
  };

  // TODO: Implement handleIconDragStart for moving existing icons
  // const handleIconDragStart = (e: React.DragEvent<HTMLDivElement>, placedIconId: string) => {
  //   if (!canEdit) {
  //     e.preventDefault();
  //     return;
  //   }
  //   e.dataTransfer.setData("placedIconId", placedIconId);
  //   e.dataTransfer.setData("sourceRowIndex", rowIndex.toString());
  //   e.dataTransfer.setData("sourceColIndex", colIndex.toString());
  //   e.dataTransfer.effectAllowed = "move";
  // };

  return (
    <div 
      className={cn("relative overflow-hidden", className)} // Canvas is made square by parent in page.tsx
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
            // draggable={canEdit} // Will be enabled later for moving existing icons
            // onDragStart={(e) => handleIconDragStart(e, icon.id)} // Will be implemented later
            className={cn("absolute", canEdit ? "cursor-move" : "cursor-default")}
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              transform: 'translate(-50%, -50%)', // Center the icon on its (x,y)
              width: '32px', 
              height: '32px',
            }}
            title={`${Config.label} (ID: ${icon.id.substring(0,4)}) at ${icon.x.toFixed(1)}%, ${icon.y.toFixed(1)}%`}
          >
            <IconComponent className="w-full h-full text-primary" />
          </div>
        );
      })}
      {cellData.placedIcons.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-lg">
            {canEdit ? "Drag and drop resources here" : "No resources placed"}
          </p>
        </div>
      )}
    </div>
  );
}
