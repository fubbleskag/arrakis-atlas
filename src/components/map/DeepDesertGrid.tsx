
"use client";

import { useState } from 'react';
import { useMap } from '@/contexts/MapContext';
import { GridCell } from './GridCell';
import type { LocalGridState, MapData } from '@/types';
import { cn } from '@/lib/utils';
import { GRID_SIZE } from '@/lib/mapUtils';
import { Skeleton } from '@/components/ui/skeleton';

interface DeepDesertGridProps {
  initialGridState?: LocalGridState;
  initialMapData?: MapData;
  isReadOnly?: boolean;
  onCellClick?: (rowIndex: number, colIndex: number) => void;
}

export function DeepDesertGrid({
  initialGridState,
  initialMapData,
  isReadOnly = false,
  onCellClick
}: DeepDesertGridProps) {
  const context = !isReadOnly ? useMap() : null;

  const currentLocalGrid = isReadOnly ? initialGridState : context?.currentLocalGrid;
  const currentMapData = isReadOnly ? initialMapData : context?.currentMapData;
  const isLoadingMapData = !isReadOnly && (context?.isLoadingMapData ?? true);

  const [hoveredCell, setHoveredCell] = useState<{row: number | null, col: number | null}>({ row: null, col: null });

  if ((!isReadOnly && isLoadingMapData && !currentLocalGrid) || (!isReadOnly && !currentMapData)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-card rounded-lg shadow-xl border border-border">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  if (isReadOnly && (!initialGridState || !initialMapData)) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-card rounded-lg shadow-xl border border-border">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  const gridToRender: LocalGridState | null = isReadOnly ? initialGridState : currentLocalGrid;
  const mapDataForGrid: MapData | null = isReadOnly ? initialMapData : currentMapData;

  if (!gridToRender || !mapDataForGrid) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
        Loading map grid...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-2 w-full h-full">
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateColumns: 'minmax(2rem, auto) 1fr',
          gridTemplateRows: 'minmax(2rem, auto) 1fr',
          gap: '0.125rem',
        }}
        role="grid"
        aria-label={`Deep Desert Map ${mapDataForGrid.name}`}
      >
        <div /> {/* Top-left empty cell */}
        {/* Column Headers (1-9) */}
        <div className="grid grid-cols-9 gap-px">
          {Array.from({ length: GRID_SIZE }).map((_, colIndex) => (
            <div
              key={`col-label-${colIndex}`}
              className={cn(
                "flex items-center justify-center text-center text-sm md:text-base font-medium text-muted-foreground bg-card rounded-sm transition-colors p-1.5",
                hoveredCell.col === colIndex && "bg-accent text-accent-foreground"
              )}
            >
              {colIndex + 1}
            </div>
          ))}
        </div>
        {/* Row Headers (A-I) */}
        <div className="grid grid-rows-9 gap-px">
          {Array.from({ length: GRID_SIZE }).map((_, rowIndex) => (
            <div
              key={`row-label-${rowIndex}`}
              className={cn(
                "flex items-center justify-center text-center text-sm md:text-base font-medium text-muted-foreground bg-card rounded-sm transition-colors p-1.5",
                 hoveredCell.row === rowIndex && "bg-accent text-accent-foreground"
              )}
            >
              {String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex))}
            </div>
          ))}
        </div>
        {/* Grid Cells */}
        <div
          className="grid grid-cols-9 grid-rows-9 gap-px bg-border border border-border rounded-lg overflow-hidden shadow-xl"
        >
          {gridToRender.map((row, rIndex) =>
            row.map((cellData, cIndex) => (
              <GridCell
                key={cellData.id || `${rIndex}-${cIndex}`}
                rowIndex={rIndex}
                colIndex={cIndex}
                onMouseEnterCell={() => setHoveredCell({ row: rIndex, col: cIndex })}
                onMouseLeaveCell={() => setHoveredCell({ row: null, col: null })}
                isReadOnly={isReadOnly}
                cellData={isReadOnly ? cellData : undefined}
                mapData={isReadOnly ? mapDataForGrid : undefined}
                onCellClick={isReadOnly ? onCellClick : undefined}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
