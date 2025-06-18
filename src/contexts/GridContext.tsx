
"use client";

// This file is deprecated and will be replaced by MapContext.tsx.
// Keeping it to avoid breaking existing imports if any, but its functionality is moved.

import type React from 'react';
import { createContext } from 'react';
import type { LocalGridState, IconType } from '@/types';

const GRID_SIZE = 9;

interface GridContextType {
  gridState: LocalGridState;
  isLoading: boolean; 
  isGridDataLoading: boolean; 
  toggleIconInCell: (rowIndex: number, colIndex: number, icon: IconType) => void;
  clearIconsInCell: (rowIndex: number, colIndex: number) => void;
  updateCellNotes: (rowIndex: number, colIndex: number, notes: string) => void;
  resetGrid: () => void;
}

const initialGridState = (): LocalGridState => {
  return Array(GRID_SIZE)
    .fill(null)
    .map((_, rowIndex) =>
      Array(GRID_SIZE)
        .fill(null)
        .map((__, colIndex) => ({
          id: `${rowIndex}-${colIndex}`,
          icons: [],
          notes: '',
        }))
    );
};

const GridContext = createContext<GridContextType | undefined>({
  gridState: initialGridState(),
  isLoading: true,
  isGridDataLoading: true,
  toggleIconInCell: () => console.warn("GridContext not fully initialized"),
  clearIconsInCell: () => console.warn("GridContext not fully initialized"),
  updateCellNotes: () => console.warn("GridContext not fully initialized"),
  resetGrid: () => console.warn("GridContext not fully initialized"),
});


export const GridProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.warn("GridProvider is deprecated. Use MapProvider instead.");
  // Provide a minimal implementation or default values
  const value: GridContextType = {
    gridState: initialGridState(),
    isLoading: true,
    isGridDataLoading: true,
    toggleIconInCell: () => {},
    clearIconsInCell: () => {},
    updateCellNotes: () => {},
    resetGrid: () => {},
  };

  return (
    <GridContext.Provider value={value}>
      {children}
    </GridContext.Provider>
  );
};

export const useGrid = (): GridContextType => {
  const context = useContext(GridContext);
  if (context === undefined) {
    throw new Error('useGrid must be used within a GridProvider. Note: GridProvider is deprecated, use MapProvider.');
  }
  return context;
};
