
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/auth/AuthButton';
import { ChevronRight, ChevronsUpDown } from 'lucide-react';
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

  // "Maps" (formerly Home)
  breadcrumbItems.push({
    key: 'maps',
    label: 'Maps',
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
        <div className="flex items-center gap-2 md:gap-4">
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
                    <span className={cn("truncate max-w-[150px] sm:max-w-[200px] md:max-w-xs", item.isCurrent ? "text-foreground" : "text-primary")}>
                      {item.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {userMapList && userMapList.length > 0 && currentMapData && (
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
                  "w-auto md:w-[180px] h-9 text-sm focus:ring-ring",
                  breadcrumbItems.length > 1 ? "ml-1" : "" // Add margin if breadcrumbs are present
                )}
                aria-label="Switch map"
              >
                <SelectValue placeholder="Switch map..." />
              </SelectTrigger>
              <SelectContent>
                {userMapList.map((map) => (
                  <SelectItem key={map.id} value={map.id}>
                    {map.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <AuthButton />
      </div>
    </header>
  );
}
