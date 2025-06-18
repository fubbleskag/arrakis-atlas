
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GridState, IconType, GridCellData } from '@/types';

const GRID_SIZE = 9;
const GRID_STORAGE_KEY = 'arrakisAtlasGridData';

interface GridContextType {
  gridState: GridState;
  isLoading: boolean;
  toggleIconInCell: (rowIndex: number, colIndex: number, icon: IconType) => void;
  clearIconsInCell: (rowIndex: number, colIndex: number) => void;
  updateCellNotes: (rowIndex: number, colIndex: number, notes: string) => void;
  resetGrid: () => void;
}

const GridContext = createContext<GridContextType | undefined>(undefined);

const initializeGrid = (): GridState => {
  return Array(GRID_SIZE)
    .fill(null)
    .map((_, rowIndex) =>
      Array(GRID_SIZE)
        .fill(null)
        .map((__, colIndex) => ({
          id: `${rowIndex}-${colIndex}`,
          icons: [],
          notes: '', // Initialize notes
        }))
    );
};

export const GridProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gridState, setGridState] = useState<GridState>(initializeGrid());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedGrid = localStorage.getItem(GRID_STORAGE_KEY);
      if (storedGrid) {
        const parsedGrid = JSON.parse(storedGrid);
        if (Array.isArray(parsedGrid) && parsedGrid.length === GRID_SIZE && Array.isArray(parsedGrid[0]) && parsedGrid[0].length === GRID_SIZE) {
          // Migration for existing data: ensure 'notes' and 'icons' fields exist
          const migratedGrid = parsedGrid.map((row: GridCellData[]) => row.map((cell: any) => ({
            id: cell.id || '', // Ensure id exists
            icons: Array.isArray(cell.icons) ? cell.icons : [], // Ensure icons is an array
            notes: typeof cell.notes === 'string' ? cell.notes : '', // Ensure notes is a string
          })));
          setGridState(migratedGrid);
        } else {
          setGridState(initializeGrid()); 
        }
      } else {
        setGridState(initializeGrid()); 
      }
    } catch (error) {
      console.error("Failed to load grid state from local storage", error);
      setGridState(initializeGrid()); 
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) { 
      try {
        localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(gridState));
      } catch (error) {
        console.error("Failed to save grid state to local storage", error);
      }
    }
  }, [gridState, isLoading]);

  const toggleIconInCell = useCallback((rowIndex: number, colIndex: number, icon: IconType) => {
    setGridState((prevState) => {
      const newState = prevState.map(row => row.map(cell => ({ ...cell, icons: [...cell.icons], notes: cell.notes }))); 
      const cell = newState[rowIndex][colIndex];
      const iconIndex = cell.icons.indexOf(icon);
      if (iconIndex > -1) {
        cell.icons.splice(iconIndex, 1);
      } else {
        cell.icons.push(icon);
      }
      return newState;
    });
  }, []);

  const clearIconsInCell = useCallback((rowIndex: number, colIndex: number) => {
    setGridState((prevState) => {
      const newState = prevState.map(row => row.map(cell => ({ ...cell, icons: [...cell.icons], notes: cell.notes })));
      newState[rowIndex][colIndex].icons = [];
      return newState;
    });
  }, []);

  const updateCellNotes = useCallback((rowIndex: number, colIndex: number, notes: string) => {
    setGridState((prevState) => {
      const newState = prevState.map(row => row.map(cell => ({ ...cell, icons: [...cell.icons], notes: cell.notes })));
      newState[rowIndex][colIndex].notes = notes;
      return newState;
    });
  }, []);

  const resetGrid = useCallback(() => {
    const newGrid = initializeGrid();
    setGridState(newGrid);
    try {
      localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(newGrid));
    } catch (error) {
      console.error("Failed to save reset grid state to local storage", error);
    }
  }, []);

  return (
    <GridContext.Provider value={{ gridState, isLoading, toggleIconInCell, clearIconsInCell, updateCellNotes, resetGrid }}>
      {children}
    </GridContext.Provider>
  );
};

export const useGrid = (): GridContextType => {
  const context = useContext(GridContext);
  if (context === undefined) {
    throw new Error('useGrid must be used within a GridProvider');
  }
  return context;
};
