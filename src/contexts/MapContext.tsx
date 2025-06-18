
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LocalGridState, FirestoreGridState, IconType, MapData, FocusedCellCoordinates, PlacedIcon, GridCellData } from '@/types';
import { ICON_TYPES } from '@/types'; // Import ICON_TYPES for validation
import { useAuth } from './AuthContext';
import { db } from '@/firebase/firebaseConfig';
import {
  doc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  where,
  serverTimestamp,
  deleteDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";

const GRID_SIZE = 9;

const initializeLocalGrid = (): LocalGridState => {
  return Array(GRID_SIZE)
    .fill(null)
    .map((_, rowIndex) =>
      Array(GRID_SIZE)
        .fill(null)
        .map((__, colIndex) => ({
          id: `${rowIndex}-${colIndex}`,
          placedIcons: [],
          notes: '',
        }))
    );
};

const convertLocalToFirestoreGrid = (localGrid: LocalGridState): FirestoreGridState => {
  const firestoreGrid: FirestoreGridState = {};
  localGrid.forEach((rowArray, rIndex) => {
    firestoreGrid[rIndex.toString()] = rowArray.map(cell => {
      const firestoreCell: GridCellData = {
        id: cell.id,
        notes: cell.notes,
        placedIcons: cell.placedIcons.map(pi => ({
          id: pi.id,
          type: pi.type,
          x: pi.x,
          y: pi.y,
        })),
      };
      return firestoreCell;
    });
  });
  return firestoreGrid;
};


const convertFirestoreToLocalGrid = (firestoreGrid: FirestoreGridState | undefined): LocalGridState => {
  const newLocalGrid: LocalGridState = initializeLocalGrid();
  if (firestoreGrid && typeof firestoreGrid === 'object') {
    for (let r = 0; r < GRID_SIZE; r++) {
      const rowKey = r.toString();
      const rowData = firestoreGrid[rowKey];
      if (rowData && Array.isArray(rowData) && rowData.length === GRID_SIZE) {
        newLocalGrid[r] = rowData.map((cell: any, c: number) => ({
          id: cell.id || `${r}-${c}`,
          placedIcons: Array.isArray(cell.placedIcons) ? cell.placedIcons.map((pi: any) => ({
            id: pi.id || crypto.randomUUID(),
            type: pi.type,
            x: typeof pi.x === 'number' ? pi.x : 0,
            y: typeof pi.y === 'number' ? pi.y : 0,
          })).filter(pi => pi.type && ICON_TYPES.includes(pi.type as IconType)) : [],
          notes: typeof cell.notes === 'string' ? cell.notes : '',
        }));
      }
    }
  }
  return newLocalGrid;
};

interface MapContextType {
  userMapList: MapData[];
  currentMapId: string | null;
  currentMapData: MapData | null;
  currentLocalGrid: LocalGridState | null;
  isLoadingMapList: boolean;
  isLoadingMapData: boolean;
  focusedCellCoordinates: FocusedCellCoordinates | null;
  setFocusedCellCoordinates: (coordinates: FocusedCellCoordinates | null) => void;
  selectMap: (mapId: string | null) => void;
  createMap: (name: string) => Promise<string | null>;
  deleteMap: (mapId: string) => Promise<void>;
  updateMapName: (mapId: string, newName: string) => Promise<void>;
  
  addPlacedIconToCell: (rowIndex: number, colIndex: number, iconType: IconType, x: number, y: number) => void;
  updatePlacedIconPositionInCell: (rowIndex: number, colIndex: number, placedIconId: string, newX: number, newY: number) => void;
  removePlacedIconFromCell: (rowIndex: number, colIndex: number, placedIconId: string) => void;
  clearAllPlacedIconsInCell: (rowIndex: number, colIndex: number) => void;

  updateCellNotes: (rowIndex: number, colIndex: number, notes: string) => void;
  resetCurrentMapGrid: () => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [userMapList, setUserMapList] = useState<MapData[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentMapData, setCurrentMapData] = useState<MapData | null>(null);
  const [currentLocalGrid, setCurrentLocalGrid] = useState<LocalGridState | null>(null);
  const [focusedCellCoordinates, setFocusedCellCoordinates] = useState<FocusedCellCoordinates | null>(null);

  const [isLoadingMapList, setIsLoadingMapList] = useState<boolean>(true);
  const [isLoadingMapData, setIsLoadingMapData] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthLoading || !user) {
      setUserMapList([]);
      setCurrentMapId(null);
      setCurrentMapData(null);
      setCurrentLocalGrid(null);
      setFocusedCellCoordinates(null);
      setIsLoadingMapList(user ? true : false);
      return;
    }

    setIsLoadingMapList(true);
    const mapsCollectionRef = collection(db, "maps");
    const q = query(mapsCollectionRef, where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const maps: MapData[] = [];
      querySnapshot.forEach((doc) => {
        maps.push({ id: doc.id, ...doc.data() } as MapData);
      });
      setUserMapList(maps.sort((a,b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0) ));
      setIsLoadingMapList(false);
    }, (error) => {
      console.error("Error fetching map list:", error);
      toast({ title: "Error", description: "Could not load your maps.", variant: "destructive" });
      setIsLoadingMapList(false);
    });

    return () => unsubscribe();
  }, [user, isAuthLoading, toast]);

  useEffect(() => {
    if (!currentMapId) {
      setCurrentMapData(null);
      setCurrentLocalGrid(null);
      setIsLoadingMapData(false);
      return;
    }

    setIsLoadingMapData(true);
    const mapDocRef = doc(db, "maps", currentMapId);
    const unsubscribe = onSnapshot(mapDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const mapData = { id: docSnap.id, ...docSnap.data() } as MapData;
        if (user && mapData.userId === user.uid) {
          setCurrentMapData(mapData);
          setCurrentLocalGrid(convertFirestoreToLocalGrid(mapData.gridState));
        } else {
          toast({ title: "Access Denied", description: "You do not have permission to view this map.", variant: "destructive" });
          setCurrentMapData(null);
          setCurrentLocalGrid(null);
          setCurrentMapId(null); 
          setFocusedCellCoordinates(null);
        }
      } else {
        toast({ title: "Error", description: `Map with ID ${currentMapId} not found. Selecting no map.`, variant: "destructive" });
        setCurrentMapData(null);
        setCurrentLocalGrid(null);
        setCurrentMapId(null);
        setFocusedCellCoordinates(null);
      }
      setIsLoadingMapData(false);
    }, (error) => {
      console.error(`Error fetching map ${currentMapId}:`, error);
      toast({ title: "Error", description: "Could not load selected map data.", variant: "destructive" });
      setIsLoadingMapData(false);
    });

    return () => unsubscribe();
  }, [currentMapId, user, toast]);

  const selectMap = useCallback((mapId: string | null) => {
    if (mapId === currentMapId && mapId !== null) return; 
    setCurrentMapId(mapId);
    setFocusedCellCoordinates(null); 
  }, [currentMapId]);

  const createMap = useCallback(async (name: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a map.", variant: "destructive" });
      return null;
    }
    setIsLoadingMapData(true);
    const now = serverTimestamp();
    const newMapData: Omit<MapData, 'id'> = {
      name,
      userId: user.uid,
      gridState: convertLocalToFirestoreGrid(initializeLocalGrid()),
      createdAt: now as Timestamp,
      updatedAt: now as Timestamp,
    };

    try {
      const docRef = await addDoc(collection(db, "maps"), newMapData);
      toast({ title: "Success", description: `Map "${name}" created.` });
      selectMap(docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error("Error creating map:", error);
      toast({ title: "Error", description: `Failed to create map: ${error.message}`, variant: "destructive" });
      return null;
    } finally {
      setIsLoadingMapData(false);
    }
  }, [user, toast, selectMap]);
  
  const updateMapInFirestore = useCallback(async (mapId: string, updates: Partial<Omit<MapData, 'id' | 'createdAt'>>) => {
    console.log(`MapContext: updateMapInFirestore called for mapId ${mapId}. User:`, user ? user.uid : 'null');
    if (!user) {
        toast({ title: "Error", description: "Authentication required to update map.", variant: "destructive" });
        console.error("MapContext: updateMapInFirestore - User not authenticated.");
        throw new Error("Authentication required");
    }
    const mapToUpdate = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null) ;
    
    if (!mapToUpdate) {
        toast({ title: "Error", description: "Map data not found for update.", variant: "destructive" });
        console.error(`MapContext: updateMapInFirestore - Map data not found for ID: ${mapId}`);
        throw new Error("Map data not found");
    }
    if (mapToUpdate.userId !== user.uid) {
        toast({ title: "Permission Denied", description: "You do not have permission to update this map.", variant: "destructive" });
        console.error(`MapContext: updateMapInFirestore - Permission denied. Map owner: ${mapToUpdate.userId}, Current user: ${user.uid}`);
        throw new Error("Permission denied");
    }

    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, { ...updates, updatedAt: serverTimestamp() });
      console.log(`MapContext: updateMapInFirestore - Successfully updated map ${mapId} in Firestore.`);
    } catch (error: any) {
      console.error(`MapContext: updateMapInFirestore - Error updating map ${mapId} in Firestore:`, error);
      toast({ title: "Save Error", description: `Could not save map changes: ${error.message}`, variant: "destructive" });
      throw error; 
    }
  }, [user, toast, userMapList, currentMapData]);

  const updateCurrentMapGridInFirestore = useCallback(async (newLocalGrid: LocalGridState) => {
    console.log("MapContext: updateCurrentMapGridInFirestore called. User:", user ? user.uid : 'null', "MapID:", currentMapId);
    if (!currentMapId || !user) {
        console.warn("MapContext: updateCurrentMapGridInFirestore - Aborted: No currentMapId or user not authenticated.", { currentMapId, userId: user?.uid });
        return;
    }
    
    const mapData = currentMapData; 
    if (!mapData) {
        console.warn("MapContext: updateCurrentMapGridInFirestore - Aborted: currentMapData is null.");
        toast({ title: "Error", description: "Map data not loaded. Cannot save changes.", variant: "destructive" });
        return;
    }
    if (mapData.userId !== user.uid) {
        console.warn(`MapContext: updateCurrentMapGridInFirestore - Aborted: Permission denied. Map owner: ${mapData.userId}, Current user: ${user.uid}`);
        toast({ title: "Permission Denied", description: "You cannot modify this map's grid.", variant: "destructive" });
        return;
    }

    const newFirestoreGrid = convertLocalToFirestoreGrid(newLocalGrid);
    console.log("MapContext: updateCurrentMapGridInFirestore - Converted grid for Firestore:", newFirestoreGrid);
    try {
      await updateMapInFirestore(currentMapId, { gridState: newFirestoreGrid });
      console.log("MapContext: updateCurrentMapGridInFirestore - Firestore update successful.");
    } catch (error) {
       console.error("MapContext: updateCurrentMapGridInFirestore - Error during Firestore update:", error);
    }
  }, [currentMapId, user, currentMapData, updateMapInFirestore, toast]);


  const addPlacedIconToCell = useCallback((rowIndex: number, colIndex: number, iconType: IconType, x: number, y: number) => {
    console.log(`MapContext: addPlacedIconToCell - Args: ${rowIndex},${colIndex}, ${iconType}, x:${x}, y:${y}`);
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) {
        console.warn("MapContext: addPlacedIconToCell - prevGrid is null, cannot add icon.");
        return null;
      }
      console.log("MapContext: addPlacedIconToCell - prevGrid exists. Proceeding to update.");
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                const newPlacedIcon: PlacedIcon = { id: crypto.randomUUID(), type: iconType, x, y };
                console.log(`MapContext: addPlacedIconToCell - Adding icon ${newPlacedIcon.id} to cell ${cell.id}`);
                return { ...cell, placedIcons: [...cell.placedIcons, newPlacedIcon] };
              }
              return cell;
            })
          : row
      );
      console.log("MapContext: addPlacedIconToCell - Local grid updated. Calling updateCurrentMapGridInFirestore.");
      updateCurrentMapGridInFirestore(newGrid); 
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore]);

  const updatePlacedIconPositionInCell = useCallback((rowIndex: number, colIndex: number, placedIconId: string, newX: number, newY: number) => {
    console.log(`MapContext: updatePlacedIconPosition - Args: ${rowIndex},${colIndex}, iconId:${placedIconId}, newX:${newX}, newY:${newY}`);
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) {
        console.warn("MapContext: updatePlacedIconPosition - prevGrid is null.");
        return null;
      }
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                console.log(`MapContext: updatePlacedIconPosition - Updating icon ${placedIconId} in cell ${cell.id}`);
                return { 
                  ...cell, 
                  placedIcons: cell.placedIcons.map(pi => 
                    pi.id === placedIconId ? { ...pi, x: newX, y: newY } : pi
                  ) 
                };
              }
              return cell;
            })
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore]);

  const removePlacedIconFromCell = useCallback((rowIndex: number, colIndex: number, placedIconId: string) => {
    console.log(`MapContext: removePlacedIconFromCell - Args: ${rowIndex},${colIndex}, iconId:${placedIconId}`);
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) {
        console.warn("MapContext: removePlacedIconFromCell - prevGrid is null.");
        return null;
      }
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                console.log(`MapContext: removePlacedIconFromCell - Removing icon ${placedIconId} from cell ${cell.id}`);
                return { ...cell, placedIcons: cell.placedIcons.filter(pi => pi.id !== placedIconId) };
              }
              return cell;
            })
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore]);
  
  const clearAllPlacedIconsInCell = useCallback((rowIndex: number, colIndex: number) => {
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, placedIcons: [] } : cell))
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore]);

  const updateCellNotes = useCallback((rowIndex: number, colIndex: number, notes: string) => {
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, notes } : cell))
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore]);

  const resetCurrentMapGrid = useCallback(async () => {
    if (!currentMapId || !user || !currentMapData) {
      toast({ title: "Error", description: "No map selected or not authenticated.", variant: "destructive" });
      return;
    }
    if (currentMapData.userId !== user.uid) {
        toast({ title: "Permission Denied", description: "You do not have permission to reset this map.", variant: "destructive" });
        return;
    }

    const newLocalGrid = initializeLocalGrid();
    setCurrentLocalGrid(newLocalGrid); 
    try {
      await updateCurrentMapGridInFirestore(newLocalGrid);
      toast({ title: "Map Reset", description: "Current map grid has been reset." });
    } catch (error) {
      // Error already handled by updateCurrentMapGridInFirestore
    }
  }, [currentMapId, user, currentMapData, toast, updateCurrentMapGridInFirestore]);
  
  const deleteMap = useCallback(async (mapId: string) => {
    if (!user) {
        toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
        return;
    }
    const mapToDelete = userMapList.find(m => m.id === mapId);
    if (!mapToDelete || mapToDelete.userId !== user.uid) {
        toast({ title: "Permission Denied", description: "You do not have permission to delete this map.", variant: "destructive" });
        return;
    }

    try {
        await deleteDoc(doc(db, "maps", mapId));
        toast({ title: "Success", description: "Map deleted successfully." });
        if (currentMapId === mapId) {
            selectMap(null); 
        }
    } catch (error: any) {
        console.error("Error deleting map:", error);
        toast({ title: "Error", description: `Failed to delete map: ${error.message}`, variant: "destructive" });
    }
  }, [user, currentMapId, userMapList, selectMap, toast]);

  const updateMapName = useCallback(async (mapId: string, newName: string) => {
      if (!user) {
          toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
          return;
      }
      const mapDataToUpdate = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
       if (!mapDataToUpdate || mapDataToUpdate.userId !== user.uid) {
           toast({ title: "Permission Denied", description: "You do not have permission to change the map name.", variant: "destructive" });
           return;
       }
      try {
          await updateMapInFirestore(mapId, { name: newName });
          toast({ title: "Success", description: "Map name updated." });
      } catch (error) {
          // Error already handled by updateMapInFirestore
      }
  }, [user, userMapList, currentMapData, toast, updateMapInFirestore]);

  return (
    <MapContext.Provider value={{
      userMapList,
      currentMapId,
      currentMapData,
      currentLocalGrid,
      isLoadingMapList,
      isLoadingMapData: isLoadingMapData || (currentMapId ? !currentMapData : false),
      focusedCellCoordinates,
      setFocusedCellCoordinates,
      selectMap,
      createMap,
      deleteMap,
      updateMapName,
      addPlacedIconToCell,
      updatePlacedIconPositionInCell,
      removePlacedIconFromCell,
      clearAllPlacedIconsInCell,
      updateCellNotes,
      resetCurrentMapGrid,
    }}>
      {children}
    </MapContext.Provider>
  );
};

export const useMap = (): MapContextType => {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMap must be used within a MapProvider');
  }
  return context;
};
