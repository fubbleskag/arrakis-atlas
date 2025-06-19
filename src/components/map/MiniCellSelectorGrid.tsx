
"use client";

import type React from 'react';
import { cn } from '@/lib/utils';
import { GRID_SIZE } from '@/lib/mapUtils';
import type { FocusedCellCoordinates } from '@/types';

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
      {/* Iterate visually from top-left (A1) to bottom-right (I9) */}
      {Array.from({ length: GRID_SIZE }).map((_, visualRowIndex) => 
        Array.from({ length: GRID_SIZE }).map((_, visualColIndex) => {
          // Convert visual row/col to data row/col for logic and selection
          // Data rowIndex: 8 (A) to 0 (I)
          // Data colIndex: 0 (1) to 8 (9)
          const dataRowIndex = GRID_SIZE - 1 - visualRowIndex;
          const dataColIndex = visualColIndex;

          const isCurrentlySelected =
            currentFocusedCell?.rowIndex === dataRowIndex &&
            currentFocusedCell?.colIndex === dataColIndex;
          
          const cellLabel = getCellDisplayLabel(dataRowIndex, dataColIndex);

          return (
            <button
              key={`${dataRowIndex}-${dataColIndex}`}
              onClick={() => onCellSelect({ rowIndex: dataRowIndex, colIndex: dataColIndex })}
              className={cn(
                "w-7 h-7 flex items-center justify-center text-xs font-mono rounded-sm transition-colors",
                "border border-transparent",
                isCurrentlySelected
                  ? "bg-primary text-primary-foreground font-semibold ring-1 ring-primary-foreground ring-offset-1 ring-offset-primary"
                  : "bg-card hover:bg-accent hover:text-accent-foreground",
                !isCurrentlySelected && currentFocusedCell && "opacity-80"
              )}
              title={`Go to cell ${cellLabel}`}
              aria-label={`Select cell ${cellLabel}`}
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
