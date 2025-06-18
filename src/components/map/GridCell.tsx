
"use client";

import type React from 'react';
import { useState } from 'react';
import type { IconType } from '@/types';
import { ICON_TYPES } from '@/types'; 
import { useGrid } from '@/contexts/GridContext';
import { useAuth } from '@/contexts/AuthContext';
import { ICON_CONFIG_MAP } from '@/components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IconPalette } from './IconPalette';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';

interface GridCellProps {
  rowIndex: number;
  colIndex: number;
}

const GRID_CELL_INTERNAL_SIZE = 9; // Used for ARIA label calculation

export function GridCell({ rowIndex, colIndex }: GridCellProps) {
  const { gridState, toggleIconInCell } = useGrid();
  const { isAuthenticated } = useAuth();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const cellData = gridState[rowIndex]?.[colIndex];
  if (!cellData) return null; 

  const handleToggleIcon = (icon: IconType) => {
    if (isAuthenticated) {
      toggleIconInCell(rowIndex, colIndex, icon);
    }
  };
  
  const cellId = `cell-${rowIndex}-${colIndex}`;
  const rowLabel = String.fromCharCode(65 + (GRID_CELL_INTERNAL_SIZE - 1 - rowIndex));
  const colLabel = colIndex + 1;
  const cellCoordinate = `${rowLabel}${colLabel}`;

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <button
          id={cellId}
          aria-label={`Grid cell ${cellCoordinate}. ${cellData.icons.length > 0 ? 'Contains ' + cellData.icons.map(icon => ICON_CONFIG_MAP[icon].label).join(', ') : 'Empty.'} Click to edit.`}
          disabled={!isAuthenticated}
          className={cn(
            "aspect-square border border-border flex items-center justify-center p-1 relative group transition-all duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            isAuthenticated ? "hover:bg-accent/20 cursor-pointer" : "cursor-not-allowed bg-muted/30",
            popoverOpen && isAuthenticated && "bg-accent/30 ring-2 ring-accent"
          )}
        >
          {!isAuthenticated && !cellData.icons.length && (
             <Lock className="h-1/2 w-1/2 text-muted-foreground/50 absolute inset-0 m-auto" />
          )}
          <div className="grid grid-cols-3 gap-0.5 h-full w-full">
            {ICON_TYPES.map((iconType) => {
              const isActive = cellData.icons.includes(iconType);
              const { IconComponent, label } = ICON_CONFIG_MAP[iconType];
              if (isActive) {
                return (
                  <div key={iconType} className="flex items-center justify-center" title={label}>
                    <IconComponent className="w-4 h-4 text-primary" />
                  </div>
                );
              }
              return <div key={iconType} className="opacity-0" />; 
            })}
          </div>
           {cellData.icons.length === 0 && isAuthenticated && (
             <span className="absolute text-xs text-muted-foreground group-hover:text-accent-foreground">Edit</span>
           )}
        </button>
      </PopoverTrigger>
      {isAuthenticated && (
        <PopoverContent className="w-auto p-0" align="start" sideOffset={5}>
          <IconPalette
            currentIcons={cellData.icons}
            onToggleIcon={handleToggleIcon}
          />
        </PopoverContent>
      )}
    </Popover>
  );
}
