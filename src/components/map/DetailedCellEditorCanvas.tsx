
"use client";

import type React from 'react';
import { useMap } from '@/contexts/MapContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import type { PlacedIcon } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { AlertTriangle } from 'lucide-react'; // For error state

interface DetailedCellEditorCanvasProps {
  rowIndex: number;
  colIndex: number;
  className?: string;
}

export function DetailedCellEditorCanvas({ rowIndex, colIndex, className }: DetailedCellEditorCanvasProps) {
  const { currentLocalGrid, isLoadingMapData, currentMapData } = useMap();
  const cellData = currentLocalGrid?.[rowIndex]?.[colIndex];

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

  // TODO: Implement onDragOver and onDrop for adding new icons
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); 
    // console.log("Dragging over canvas");
  };

  // TODO: Implement onDrop for adding new icons
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const iconType = e.dataTransfer.getData("iconType") as any; // Cast needed if IconType not string literal
    const canvasRect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - canvasRect.left) / canvasRect.width) * 100;
    const y = ((e.clientY - canvasRect.top) / canvasRect.height) * 100;

    // console.log(`Dropped ${iconType} at ${x}%, ${y}%`);
    // addPlacedIconToCell(rowIndex, colIndex, iconType, x, y);
  };

  return (
    <div 
      className={cn("relative overflow-hidden", className)} // Ensure className from props is applied
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {cellData.placedIcons.map((icon: PlacedIcon) => {
        const Config = ICON_CONFIG_MAP[icon.type];
        if (!Config) return null;
        const IconComponent = Config.IconComponent;
        // TODO: Add draggable props and handlers for moving existing icons
        return (
          <div
            key={icon.id}
            // draggable // Will be enabled later
            // onDragStart={(e) => handleIconDragStart(e, icon.id)} // Will be implemented later
            className="absolute cursor-move" // Changed cursor to move
            style={{
              left: `${icon.x}%`,
              top: `${icon.y}%`,
              transform: 'translate(-50%, -50%)', // Center the icon on its x,y
              width: '32px', // Example size, adjust as needed
              height: '32px', // Example size, adjust as needed
            }}
            title={`${Config.label} (ID: ${icon.id.substring(0,4)})`} // Added ID for debugging
          >
            <IconComponent className="w-full h-full text-primary" />
          </div>
        );
      })}
      {/* Placeholder text if canvas is empty */}
      {cellData.placedIcons.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-muted-foreground text-lg">Drop resources here</p>
        </div>
      )}
    </div>
  );
}
