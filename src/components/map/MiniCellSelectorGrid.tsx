
"use client";

import type React from 'react';
import { cn } from '@/lib/utils';
import { GRID_SIZE } from '@/lib/mapUtils';
import type { FocusedCellCoordinates, LocalGridState } from '@/types';
import { useMap } from '@/contexts/MapContext'; // Import useMap

interface MiniCellSelectorGridProps {
  currentFocusedCell: FocusedCellCoordinates | null;
  onCellSelect: (coordinates: FocusedCellCoordinates) => void;
  className?: string;
}

export function MiniCellSelectorGrid({
  currentFocusedCell,
  onCellSelect,
  className,
}: MiniCellSelectorGridProps) {
  const { currentLocalGrid } = useMap(); // Get grid data from context

  const getCellDisplayLabel = (dataRowIdx: number, dataColIdx: number): string => {
    const rowLetter = String.fromCharCode(65 + (GRID_SIZE - 1 - dataRowIdx));
    const colNumber = dataColIdx + 1;
    return `${rowLetter}${colNumber}`;
  };

  return (
    <div
      className={cn(
        "grid grid-cols-9 gap-px p-1 bg-popover rounded-md shadow-xl border border-border",
        className
      )}
    >
      {Array.from({ length: GRID_SIZE }).map((_, visualRowIndex) => 
        Array.from({ length: GRID_SIZE }).map((_, visualColIndex) => {
          const dataRowIndex = GRID_SIZE - 1 - visualRowIndex;
          const dataColIndex = visualColIndex;

          const isCurrentlySelected =
            currentFocusedCell?.rowIndex === dataRowIndex &&
            currentFocusedCell?.colIndex === dataColIndex;
          
          const cellLabel = getCellDisplayLabel(dataRowIndex, dataColIndex);

          let hasContent = false;
          if (currentLocalGrid) {
            const cellData = currentLocalGrid[dataRowIndex]?.[dataColIndex];
            if (cellData) {
              hasContent = cellData.placedIcons.length > 0 || (cellData.notes && cellData.notes.trim() !== '');
            }
          }

          return (
            <button
              key={`${dataRowIndex}-${dataColIndex}`}
              onClick={() => onCellSelect({ rowIndex: dataRowIndex, colIndex: dataColIndex })}
              className={cn(
                "w-7 h-7 flex items-center justify-center text-xs font-mono rounded-sm transition-colors",
                "border border-transparent",
                isCurrentlySelected
                  ? "bg-primary text-primary-foreground font-semibold ring-1 ring-primary-foreground ring-offset-1 ring-offset-primary"
                  : cn(
                      hasContent ? 'bg-accent/15' : 'bg-card',
                      'hover:bg-accent hover:text-accent-foreground'
                    ),
                !isCurrentlySelected && currentFocusedCell && !hasContent && "opacity-80", // Dim non-content cells if a cell is focused
                !isCurrentlySelected && currentFocusedCell && hasContent && "opacity-90" // Slightly less dim for content cells
              )}
              title={`Go to cell ${cellLabel}${hasContent ? ' (has content)' : ''}`}
              aria-label={`Select cell ${cellLabel}${hasContent ? ', has content' : ''}`}
              aria-pressed={isCurrentlySelected}
            >
              {cellLabel}
            </button>
          );
        })
      )}
    </div>
  );
}
