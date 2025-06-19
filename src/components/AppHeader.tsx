
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/auth/AuthButton';
import { ChevronRight } from 'lucide-react';
import type { FocusedCellCoordinates } from '@/types';

const GRID_SIZE = 9; // Define GRID_SIZE for getCellCoordinateLabel

export function AppHeader() {
  const { currentMapData, selectMap, focusedCellCoordinates, setFocusedCellCoordinates } = useMap();

  const getCellCoordinateLabel = (rowIndex: number, colIndex: number): string => {
    const rowLetter = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex));
    const colNumber = colIndex + 1;
    return `${colNumber}-${rowLetter}`;
  };

  const breadcrumbItems: Array<{
    key: string;
    label: string;
    onClick?: () => void;
    isCurrent: boolean;
  }> = [];

  // Home
  breadcrumbItems.push({
    key: 'home',
    label: 'Home',
    onClick: () => selectMap(null),
    isCurrent: !currentMapData,
  });

  // Map Name
  if (currentMapData) {
    breadcrumbItems.push({
      key: 'map',
      label: currentMapData.name,
      onClick: focusedCellCoordinates ? () => setFocusedCellCoordinates(null) : undefined,
      isCurrent: !!currentMapData && !focusedCellCoordinates,
    });
  }

  // Cell Coordinate
  if (currentMapData && focusedCellCoordinates) {
    breadcrumbItems.push({
      key: 'cell',
      label: getCellCoordinateLabel(focusedCellCoordinates.rowIndex, focusedCellCoordinates.colIndex),
      isCurrent: !!focusedCellCoordinates,
    });
  }

  return (
    <header className="py-4 px-6 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center space-x-1 text-xl md:text-2xl font-semibold">
            {breadcrumbItems.map((item, index) => (
              <li key={item.key} className="flex items-center space-x-1">
                {index > 0 && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                {item.onClick && !item.isCurrent ? (
                  <Button
                    variant="link"
                    onClick={item.onClick}
                    className="p-0 h-auto text-xl md:text-2xl font-semibold text-primary hover:text-primary/80"
                  >
                    {item.label}
                  </Button>
                ) : (
                  <span className={item.isCurrent ? "text-foreground" : "text-primary"}>
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <AuthButton />
      </div>
    </header>
  );
}
