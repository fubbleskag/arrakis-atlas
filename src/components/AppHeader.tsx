
"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/auth/AuthButton';
import { ChevronDown, ChevronRight } from 'lucide-react'; // Added ChevronDown
import type { FocusedCellCoordinates } from '@/types';
import { GRID_SIZE } from '@/lib/mapUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // Added Popover
import { MiniCellSelectorGrid } from './map/MiniCellSelectorGrid'; // Added MiniCellSelectorGrid
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

  const [cellSelectorOpen, setCellSelectorOpen] = React.useState(false);

  const getCellCoordinateLabel = (rowIndex: number, colIndex: number): string => {
    const rowLetter = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex)); 
    const colNumber = colIndex + 1; 
    return `${rowLetter}-${colNumber}`;
  };

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
                    <Popover open={cellSelectorOpen} onOpenChange={setCellSelectorOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="link"
                          className={cn(
                            "p-0 h-auto text-xl md:text-2xl font-semibold focus:ring-0 border-none shadow-none bg-transparent",
                            "text-foreground hover:text-foreground/90",
                            "data-[placeholder]:text-foreground flex items-center"
                          )}
                          aria-label="Switch cell"
                        >
                          {item.label} <ChevronDown className="ml-1 h-4 w-4 opacity-70 shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 border-none shadow-xl mt-1" align="start" sideOffset={5}>
                        <MiniCellSelectorGrid
                          currentFocusedCell={focusedCellCoordinates}
                          onCellSelect={(coords) => {
                            if (coords.rowIndex !== focusedCellCoordinates.rowIndex || coords.colIndex !== focusedCellCoordinates.colIndex) {
                              setFocusedCellCoordinates(coords);
                            }
                            setCellSelectorOpen(false); // Close popover on selection
                          }}
                        />
                      </PopoverContent>
                    </Popover>
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
