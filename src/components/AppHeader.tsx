
"use client";

import { AuthButton } from '@/components/auth/AuthButton';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

const GRID_SIZE = 9; // Define or import GRID_SIZE if it's used elsewhere consistently

export function AppHeader() {
  const { currentMapData, selectMap, currentMapId, focusedCellCoordinates, setFocusedCellCoordinates } = useMap();

  const getCellCoordinateLabel = (rowIndex: number, colIndex: number): string => {
    const rowLabel = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex));
    const colLabel = colIndex + 1;
    return `${rowLabel}${colLabel}`;
  };

  let headerTitle = "Arrakis Atlas";
  if (currentMapData) {
    headerTitle = currentMapData.name;
    if (focusedCellCoordinates) {
      const cellLabel = getCellCoordinateLabel(focusedCellCoordinates.rowIndex, focusedCellCoordinates.colIndex);
      headerTitle += ` > ${cellLabel}`;
    }
  }

  const handleBackOrHomeClick = () => {
    selectMap(null); // Always go back to map list view
  };

  const showNavigationButton = currentMapId; 

  return (
    <header className="py-4 px-6 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {showNavigationButton && (
            <Button variant="outline" size="sm" onClick={handleBackOrHomeClick} title={"Back to Map List"}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {focusedCellCoordinates ? "Home" : "Maps"}
            </Button>
          )}
          <h1 className="text-xl md:text-2xl font-headline font-semibold text-primary truncate max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-lg xl:max-w-2xl">
            {headerTitle}
          </h1>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}
