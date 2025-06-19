
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/auth/AuthButton';
import { ChevronRight } from 'lucide-react';
import type { FocusedCellCoordinates } from '@/types';
import { GRID_SIZE } from '@/lib/mapUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';

export function AppHeader() {
  const { 
    currentMapData, 
    selectMap, 
    focusedCellCoordinates, 
    setFocusedCellCoordinates,
    userMapList,
    currentMapId 
  } = useMap();

  const getCellCoordinateLabel = (rowIndex: number, colIndex: number): string => {
    const rowLetter = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex)); // A..I (bottom to top)
    const colNumber = colIndex + 1; // 1..9 (left to right)
    return `${rowLetter}-${colNumber}`; // Format: Letter-Number
  };

  const breadcrumbItems: Array<{
    key: string;
    label: string;
    onClick?: () => void;
    isCurrent: boolean;
  }> = [];

  breadcrumbItems.push({
    key: 'maps',
    label: 'Maps',
    onClick: () => selectMap(null), 
    isCurrent: !currentMapData,
  });

  if (currentMapData) {
    breadcrumbItems.push({
      key: 'map',
      label: currentMapData.name,
      onClick: focusedCellCoordinates ? () => setFocusedCellCoordinates(null) : undefined,
      isCurrent: !!currentMapData && !focusedCellCoordinates,
    });
  }

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
        <div className="flex items-center gap-2 md:gap-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1 text-xl md:text-2xl font-semibold">
              {breadcrumbItems.map((item, index) => (
                <li key={item.key} className="flex items-center space-x-1">
                  {index > 0 && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  
                  {/* Special handling for the Map Name as a Select component */}
                  {item.key === 'map' && item.isCurrent && userMapList && userMapList.length > 1 ? (
                    <Select
                      value={currentMapId || ""}
                      onValueChange={(value) => {
                        if (value && value !== currentMapId) {
                          selectMap(value);
                        }
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "p-0 h-auto text-xl md:text-2xl font-semibold focus:ring-0 border-none shadow-none bg-transparent",
                          "text-foreground hover:text-foreground/90", // Current item styling
                          "data-[placeholder]:text-foreground" // Ensure placeholder (current map name) uses foreground color
                        )}
                        aria-label="Switch map"
                      >
                        {/* SelectValue will display the name of the map matching currentMapId */}
                        <SelectValue /> 
                      </SelectTrigger>
                      <SelectContent>
                        {userMapList.map((map) => (
                          <SelectItem key={map.id} value={map.id}>
                            {map.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : item.onClick && !item.isCurrent ? ( // Standard clickable breadcrumb (not current)
                    <Button
                      variant="link"
                      onClick={item.onClick}
                      className="p-0 h-auto text-xl md:text-2xl font-semibold text-primary hover:text-primary/80"
                    >
                      {item.label}
                    </Button>
                  ) : ( // Standard non-clickable breadcrumb (current or no onClick, or map name with <=1 map)
                    <span className={cn("truncate max-w-[150px] sm:max-w-[200px] md:max-w-xs", item.isCurrent ? "text-foreground" : "text-primary")}>
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}
