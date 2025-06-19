
"use client";

import React from 'react'; // Added missing React import
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
    const rowLetter = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex)); 
    const colNumber = colIndex + 1; 
    return `${rowLetter}-${colNumber}`;
  };

  const allCellOptions = React.useMemo(() => {
    if (!currentMapData) return [];
    const options = [];
    // Sort to display A-1, A-2, ... I-9
    for (let visualRow = 0; visualRow < GRID_SIZE; visualRow++) { // A (0) to I (8)
        const rowIndex = GRID_SIZE - 1 - visualRow; // Maps visual A..I to data 8..0
        for (let visualCol = 0; visualCol < GRID_SIZE; visualCol++) { // 1 (0) to 9 (8)
            const colIndex = visualCol;
            options.push({
                value: `${rowIndex}_${colIndex}`, // Store actual data indices
                label: getCellCoordinateLabel(rowIndex, colIndex)
            });
        }
    }
    return options;
  }, [currentMapData]);


  const breadcrumbItems: Array<{
    key: string;
    label: string;
    onClick?: () => void;
    isCurrent: boolean;
    isSelector?: 'map' | 'cell';
  }> = [];

  breadcrumbItems.push({
    key: 'mapsRoot',
    label: 'Maps',
    onClick: () => selectMap(null), 
    isCurrent: !currentMapData,
  });

  if (currentMapData) {
    breadcrumbItems.push({
      key: 'map',
      label: currentMapData.name,
      isCurrent: !!currentMapData && !focusedCellCoordinates,
      isSelector: (userMapList && userMapList.length > 1) ? 'map' : undefined,
    });
  }

  if (currentMapData && focusedCellCoordinates) {
    breadcrumbItems.push({
      key: 'cell',
      label: getCellCoordinateLabel(focusedCellCoordinates.rowIndex, focusedCellCoordinates.colIndex),
      isCurrent: !!focusedCellCoordinates,
      isSelector: 'cell',
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
                  
                  {item.isSelector === 'map' && userMapList && userMapList.length > 1 ? (
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
                          "p-0 h-auto text-xl md:text-2xl font-semibold focus:ring-0 border-none shadow-none bg-transparent truncate max-w-[150px] sm:max-w-[200px] md:max-w-xs",
                          item.isCurrent ? "text-foreground hover:text-foreground/90" : "text-primary hover:text-primary/80",
                          "data-[placeholder]:text-foreground"
                        )}
                        aria-label="Switch map"
                      >
                        <SelectValue placeholder={item.label} /> 
                      </SelectTrigger>
                      <SelectContent>
                        {userMapList.map((map) => (
                          <SelectItem key={map.id} value={map.id}>
                            {map.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : item.isSelector === 'cell' && focusedCellCoordinates && currentMapData ? (
                    <Select
                      value={`${focusedCellCoordinates.rowIndex}_${focusedCellCoordinates.colIndex}`}
                      onValueChange={(value) => {
                        const [r, c] = value.split('_').map(Number);
                        if (r !== focusedCellCoordinates.rowIndex || c !== focusedCellCoordinates.colIndex) {
                          setFocusedCellCoordinates({ rowIndex: r, colIndex: c });
                        }
                      }}
                    >
                      <SelectTrigger
                        className={cn(
                          "p-0 h-auto text-xl md:text-2xl font-semibold focus:ring-0 border-none shadow-none bg-transparent",
                          "text-foreground hover:text-foreground/90",
                           "data-[placeholder]:text-foreground"
                        )}
                        aria-label="Switch cell"
                      >
                         <SelectValue placeholder={item.label} />
                      </SelectTrigger>
                      <SelectContent>
                        {allCellOptions.map((cellOpt) => (
                          <SelectItem key={cellOpt.value} value={cellOpt.value}>
                            {cellOpt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : item.onClick && !item.isCurrent ? ( 
                    <Button
                      variant="link"
                      onClick={item.onClick}
                      className="p-0 h-auto text-xl md:text-2xl font-semibold text-primary hover:text-primary/80 truncate max-w-[150px] sm:max-w-[200px] md:max-w-xs"
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
        </div>
        <AuthButton />
      </div>
    </header>
  );
}
