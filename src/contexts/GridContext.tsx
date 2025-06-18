
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { GridState, IconType, GridCellData } from '@/types';
import { useAuth } from './AuthContext';
import { db } from '@/firebase/firebaseConfig';
import { doc, setDoc, onSnapshot } from 'firebase/firestore'; // Removed getDoc as onSnapshot handles initial load
import { useToast } from "@/hooks/use-toast";

const GRID_SIZE = 9;

interface GridContextType {
  gridState: GridState;
  isLoading: boolean; 
  isGridDataLoading: boolean; 
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

// Type for Firestore representation of gridState
type FirestoreGridState = Record<string, GridCellData[]>;

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

  // Helper to convert local GridState (GridCellData[][]) to FirestoreGridState (Record<string, GridCellData[]>)
  const convertToFirestoreFormat = (localGrid: GridState): FirestoreGridState => {
    const firestoreGrid: FirestoreGridState = {};
    localGrid.forEach((row, rIndex) => {
      firestoreGrid[rIndex.toString()] = row;
    });
    return firestoreGrid;
  };

  // Helper to convert FirestoreGridState (Record<string, GridCellData[]>) to local GridState (GridCellData[][])
  const convertFromFirestoreFormat = (firestoreGrid: any): GridState => {
    const newLocalGrid: GridState = initializeGrid();
    if (typeof firestoreGrid === 'object' && firestoreGrid !== null) {
      for (let r = 0; r < GRID_SIZE; r++) {
        const rowKey = r.toString();
        const rowData = firestoreGrid[rowKey];
        if (rowData && Array.isArray(rowData) && rowData.length === GRID_SIZE) {
          newLocalGrid[r] = rowData.map((cell: any, c: number) => ({
            id: cell.id || `${r}-${c}`,
            icons: Array.isArray(cell.icons) ? cell.icons.filter(icon => typeof icon === 'string') : [],
            notes: typeof cell.notes === 'string' ? cell.notes : '',
          }));
        } else {
          // console.warn(`Row ${r} malformed or missing in Firestore data. Using default for this row.`);
          // newLocalGrid[r] is already initialized by initializeGrid()
        }
      }
    }
    return newLocalGrid;
  };


  useEffect(() => {
    if (isAuthLoading) {
      setIsGridDataLoading(true);
      return;
    }

    if (!user?.uid) {
      setGridState(initializeGrid());
      setIsGridDataLoading(false);
      return;
    }

    const gridDocRef = getGridDocRef();
    if (!gridDocRef) {
      setIsGridDataLoading(false);
      return;
    }
    
    setIsGridDataLoading(true);
    const unsubscribe = onSnapshot(gridDocRef, async (docSnap) => {
      let newLocalState: GridState = initializeGrid();
      let needsResaveToFirestore = false;

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.gridState) {
          const fsGridData = data.gridState;

          // Check if data is in the old array-of-arrays format
          if (Array.isArray(fsGridData) && 
              (fsGridData.length === 0 || (fsGridData.length === GRID_SIZE && Array.isArray(fsGridData[0]) && fsGridData[0].length === GRID_SIZE))) {
            // Old format: GridCellData[][]
            console.log("Old grid format detected in Firestore. Migrating.");
            // Sanitize and convert old format to local state
            newLocalState = fsGridData.map((row: any[] = [], r: number) => 
              (Array.isArray(row) ? row : initializeGrid()[r]).map((cell: any = {}, c: number) => ({
                id: cell.id || `${r}-${c}`,
                icons: Array.isArray(cell.icons) ? cell.icons.filter((icon:any) => typeof icon === 'string') : [],
                notes: typeof cell.notes === 'string' ? cell.notes : '',
              }))
            );
            needsResaveToFirestore = true; // Mark for migration
          } 
          // Check for new map format
          else if (typeof fsGridData === 'object' && fsGridData !== null && !Array.isArray(fsGridData)) {
            // New format: Record<string, GridCellData[]>
            newLocalState = convertFromFirestoreFormat(fsGridData);
          } else {
            // Unrecognized format
            console.warn("Unrecognized gridState format in Firestore. Initializing default grid.");
            needsResaveToFirestore = true; // Save the initialized grid in new format
          }
        } else {
          // No data.gridState field
          console.log("No gridState field in Firestore document. Initializing default grid.");
          needsResaveToFirestore = true; // Save the initialized grid in new format
        }
      } else {
        // Document doesn't exist
        console.log("No Firestore document for user. Initializing default grid.");
        needsResaveToFirestore = true; // Save the initialized grid in new format
      }

      setGridState(newLocalState);

      if (needsResaveToFirestore) {
        console.log("Attempting to save/migrate grid to Firestore in new format.");
        const firestoreGridToSave = convertToFirestoreFormat(newLocalState);
        try {
          await setDoc(gridDocRef, { gridState: firestoreGridToSave, lastUpdated: new Date() });
          console.log("Grid saved/migrated successfully to new format.");
        } catch (error: any) {
          console.error("Error saving/migrating grid to Firestore:", error);
          toast({ title: "Save Error", description: `Failed to save map data: ${error.message}`, variant: "destructive" });
        }
      }
      setIsGridDataLoading(false);
    }, (error) => {
      console.error("Error fetching grid data from Firestore:", error);
      toast({ title: "Load Error", description: "Could not load map data.", variant: "destructive" });
      setGridState(initializeGrid());
      setIsGridDataLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isAuthLoading, toast, getGridDocRef]);


  const updateFirestoreGrid = async (currentLocalGridState: GridState) => {
    const gridDocRef = getGridDocRef();
    if (!gridDocRef) {
      toast({ title: "Error", description: "Not authenticated. Cannot save changes.", variant: "destructive" });
      return;
    }
    const firestoreFormattedGrid = convertToFirestoreFormat(currentLocalGridState);
    try {
      await setDoc(gridDocRef, { gridState: firestoreFormattedGrid, lastUpdated: new Date() }, { merge: true });
    } catch (error: any) {
      console.error("Error updating Firestore:", error);
      toast({ title: "Save Error", description: `Could not save changes to cloud: ${error.message}`, variant: "destructive" });
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
    setGridState(newGrid); // Update local state immediately

    const gridDocRef = getGridDocRef();
    if (!gridDocRef) {
      toast({ title: "Error", description: "Not authenticated. Cannot reset map.", variant: "destructive" });
      return;
    }
    const firestoreFormattedGrid = convertToFirestoreFormat(newGrid);
    try {
      await setDoc(gridDocRef, { gridState: firestoreFormattedGrid, lastUpdated: new Date() });
      toast({ title: "Map Reset", description: "Map data has been reset in the cloud." });
    } catch (error: any) {
      console.error("Error resetting Firestore grid:", error);
      toast({ title: "Reset Error", description: `Could not reset map data: ${error.message}`, variant: "destructive" });
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

