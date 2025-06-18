
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GridState, IconType, GridCellData } from '@/types';
import { useAuth } from './AuthContext';
import { db } from '@/firebase/firebaseConfig';
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

const GRID_SIZE = 9;

interface GridContextType {
  gridState: GridState;
  isLoading: boolean; // True if auth is loading OR grid data is loading/syncing
  isGridDataLoading: boolean; // Specifically for grid data operations
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
          notes: '',
        }))
    );
};

export const GridProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [gridState, setGridState] = useState<GridState>(initializeGrid());
  const [isGridDataLoading, setIsGridDataLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const getGridDocRef = useCallback(() => {
    if (user?.uid) {
      return doc(db, "userMaps", user.uid);
    }
    return null;
  }, [user?.uid]);

  useEffect(() => {
    if (isAuthLoading) {
      setIsGridDataLoading(true); // If auth is loading, grid data is also effectively loading
      return;
    }

    if (!user?.uid) {
      setGridState(initializeGrid()); // No user, so reset to initial local state
      setIsGridDataLoading(false);
      return;
    }

    setIsGridDataLoading(true);
    const gridDocRef = getGridDocRef();
    if (!gridDocRef) return;

    const unsubscribe = onSnapshot(gridDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.gridState) {
           // Basic validation/migration
          const fetchedGrid = data.gridState;
          if (Array.isArray(fetchedGrid) && fetchedGrid.length === GRID_SIZE && Array.isArray(fetchedGrid[0]) && fetchedGrid[0].length === GRID_SIZE) {
            const migratedGrid = fetchedGrid.map((row: any[]) => row.map((cell: any) => ({
              id: cell.id || '', 
              icons: Array.isArray(cell.icons) ? cell.icons : [],
              notes: typeof cell.notes === 'string' ? cell.notes : '', 
            } as GridCellData)));
            setGridState(migratedGrid);
          } else {
             console.warn("Firestore data is malformed, initializing new grid.");
            const newGrid = initializeGrid();
            setGridState(newGrid);
            await setDoc(gridDocRef, { gridState: newGrid, lastUpdated: new Date() });
          }
        } else {
          const newGrid = initializeGrid();
          setGridState(newGrid);
          await setDoc(gridDocRef, { gridState: newGrid, lastUpdated: new Date() });
        }
      } else {
        // Document doesn't exist, create it
        const newGrid = initializeGrid();
        setGridState(newGrid);
        try {
          await setDoc(gridDocRef, { gridState: newGrid, lastUpdated: new Date() });
        } catch (error: any) {
          console.error("Error creating initial grid document:", error);
          toast({ title: "Error", description: "Could not create map data.", variant: "destructive" });
        }
      }
      setIsGridDataLoading(false);
    }, (error) => {
      console.error("Error fetching grid data from Firestore:", error);
      toast({ title: "Error", description: "Could not load map data from cloud.", variant: "destructive" });
      setGridState(initializeGrid()); // Fallback to local initial grid on error
      setIsGridDataLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isAuthLoading, toast, getGridDocRef]);


  const updateFirestoreGrid = async (newGridState: GridState) => {
    const gridDocRef = getGridDocRef();
    if (!gridDocRef) {
      toast({ title: "Error", description: "Not authenticated. Cannot save changes.", variant: "destructive" });
      return;
    }
    try {
      await setDoc(gridDocRef, { gridState: newGridState, lastUpdated: new Date() }, { merge: true });
    } catch (error: any) {
      console.error("Error updating Firestore:", error);
      toast({ title: "Save Error", description: "Could not save changes to cloud.", variant: "destructive" });
    }
  };

  const toggleIconInCell = useCallback((rowIndex: number, colIndex: number, icon: IconType) => {
    setGridState((prevState) => {
      const newState = prevState.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                const newIcons = [...cell.icons];
                const iconIndex = newIcons.indexOf(icon);
                if (iconIndex > -1) {
                  newIcons.splice(iconIndex, 1);
                } else {
                  newIcons.push(icon);
                }
                return { ...cell, icons: newIcons };
              }
              return cell;
            })
          : row
      );
      updateFirestoreGrid(newState);
      return newState;
    });
  }, [getGridDocRef, toast]);

  const clearIconsInCell = useCallback((rowIndex: number, colIndex: number) => {
    setGridState((prevState) => {
      const newState = prevState.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, icons: [] } : cell))
          : row
      );
      updateFirestoreGrid(newState);
      return newState;
    });
  }, [getGridDocRef, toast]);

  const updateCellNotes = useCallback((rowIndex: number, colIndex: number, notes: string) => {
    setGridState((prevState) => {
      const newState = prevState.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, notes } : cell))
          : row
      );
      updateFirestoreGrid(newState);
      return newState;
    });
  }, [getGridDocRef, toast]);

  const resetGrid = useCallback(async () => {
    const newGrid = initializeGrid();
    setGridState(newGrid);
    const gridDocRef = getGridDocRef();
    if (!gridDocRef) {
      toast({ title: "Error", description: "Not authenticated. Cannot reset map.", variant: "destructive" });
      return;
    }
    try {
      await setDoc(gridDocRef, { gridState: newGrid, lastUpdated: new Date() });
      toast({ title: "Map Reset", description: "Map data has been reset in the cloud." });
    } catch (error: any) {
      console.error("Error resetting Firestore grid:", error);
      toast({ title: "Reset Error", description: "Could not reset map data in cloud.", variant: "destructive" });
    }
  }, [getGridDocRef, toast]);

  return (
    <GridContext.Provider value={{ 
      gridState, 
      isLoading: isAuthLoading || isGridDataLoading, 
      isGridDataLoading,
      toggleIconInCell, 
      clearIconsInCell, 
      updateCellNotes, 
      resetGrid 
    }}>
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
