
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LocalGridState, FirestoreGridState, IconType, MapData, FocusedCellCoordinates, PlacedIcon, GridCellData } from '@/types';
import { ICON_TYPES } from '@/types';
import { useAuth } from './AuthContext';
import { db, storage } from '@/firebase/firebaseConfig'; // Import storage
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
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from "firebase/storage"; // Firebase Storage functions
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
          backgroundImageUrl: undefined,
        }))
    );
};

const convertLocalToFirestoreGrid = (localGrid: LocalGridState): FirestoreGridState => {
  const firestoreGrid: FirestoreGridState = {};
  localGrid.forEach((rowArray, rIndex) => {
    firestoreGrid[rIndex.toString()] = rowArray.map((cell: GridCellData) => {
      const firestoreCellOutput: GridCellData = {
        id: cell.id,
        notes: cell.notes,
        placedIcons: cell.placedIcons.map((pi: PlacedIcon) => ({
          id: pi.id,
          type: pi.type,
          x: pi.x,
          y: pi.y,
          note: pi.note || '', 
        })),
      };
      if (cell.backgroundImageUrl && cell.backgroundImageUrl.trim() !== '') {
        firestoreCellOutput.backgroundImageUrl = cell.backgroundImageUrl;
      }
      return firestoreCellOutput;
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
            note: typeof pi.note === 'string' ? pi.note : '',
          })).filter(pi => pi.type && ICON_TYPES.includes(pi.type as IconType)) : [],
          notes: typeof cell.notes === 'string' ? cell.notes : '',
          backgroundImageUrl: typeof cell.backgroundImageUrl === 'string' ? cell.backgroundImageUrl : undefined,
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
  selectedPlacedIconId: string | null; // New state for selected icon
  setFocusedCellCoordinates: (coordinates: FocusedCellCoordinates | null) => void;
  setSelectedPlacedIconId: (iconId: string | null) => void; // New setter
  selectMap: (mapId: string | null) => void;
  createMap: (name: string) => Promise<string | null>;
  deleteMap: (mapId: string) => Promise<void>;
  updateMapName: (mapId: string, newName: string) => Promise<void>;
  
  addPlacedIconToCell: (rowIndex: number, colIndex: number, iconType: IconType, x: number, y: number) => void;
  updatePlacedIconPositionInCell: (rowIndex: number, colIndex: number, placedIconId: string, newX: number, newY: number) => void;
  updatePlacedIconNote: (rowIndex: number, colIndex: number, placedIconId: string, newNote: string) => void;
  removePlacedIconFromCell: (rowIndex: number, colIndex: number, placedIconId: string) => void;
  clearAllPlacedIconsInCell: (rowIndex: number, colIndex: number) => void;

  updateCellNotes: (rowIndex: number, colIndex: number, notes: string) => void;
  resetCurrentMapGrid: () => void;

  uploadCellBackgroundImage: (rowIndex: number, colIndex: number, file: File) => Promise<void>;
  removeCellBackgroundImage: (rowIndex: number, colIndex: number) => Promise<void>;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();

  const [userMapList, setUserMapList] = useState<MapData[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentMapData, setCurrentMapData] = useState<MapData | null>(null);
  const [currentLocalGrid, setCurrentLocalGrid] = useState<LocalGridState | null>(null);
  const [focusedCellCoordinates, _setFocusedCellCoordinates] = useState<FocusedCellCoordinates | null>(null);
  const [selectedPlacedIconId, _setSelectedPlacedIconId] = useState<string | null>(null); // New state

  const [isLoadingMapList, setIsLoadingMapList] = useState<boolean>(true);
  const [isLoadingMapData, setIsLoadingMapData] = useState<boolean>(false);

  // Wrapped setters to clear selected icon when focus changes
  const setFocusedCellCoordinates = useCallback((coordinates: FocusedCellCoordinates | null) => {
    _setFocusedCellCoordinates(coordinates);
    if (coordinates === null || (coordinates?.rowIndex !== focusedCellCoordinates?.rowIndex || coordinates?.colIndex !== focusedCellCoordinates?.colIndex)) {
      _setSelectedPlacedIconId(null); // Clear selected icon if cell focus changes
    }
  }, [focusedCellCoordinates]);

  const setSelectedPlacedIconId = useCallback((iconId: string | null) => {
    _setSelectedPlacedIconId(iconId);
  }, []);


  useEffect(() => {
    if (isAuthLoading || !user) {
      setUserMapList([]);
      setCurrentMapId(null);
      setCurrentMapData(null);
      setCurrentLocalGrid(null);
      setFocusedCellCoordinates(null);
      setSelectedPlacedIconId(null);
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
      setTimeout(() => toast({ title: "Error", description: "Could not load your maps.", variant: "destructive" }), 0);
      setIsLoadingMapList(false);
    });

    return () => unsubscribe();
  }, [user, isAuthLoading, toast, setFocusedCellCoordinates, setSelectedPlacedIconId]);

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
          setTimeout(() => toast({ title: "Access Denied", description: "You do not have permission to view this map.", variant: "destructive" }), 0);
          setCurrentMapData(null);
          setCurrentLocalGrid(null);
          setCurrentMapId(null); 
          setFocusedCellCoordinates(null);
          setSelectedPlacedIconId(null);
        }
      } else {
        setTimeout(() => toast({ title: "Error", description: `Map with ID ${currentMapId} not found. Selecting no map.`, variant: "destructive" }), 0);
        setCurrentMapData(null);
        setCurrentLocalGrid(null);
        setCurrentMapId(null);
        setFocusedCellCoordinates(null);
        setSelectedPlacedIconId(null);
      }
      setIsLoadingMapData(false);
    }, (error) => {
      console.error(`Error fetching map ${currentMapId}:`, error);
      setTimeout(() => toast({ title: "Error", description: "Could not load selected map data.", variant: "destructive" }), 0);
      setIsLoadingMapData(false);
    });

    return () => unsubscribe();
  }, [currentMapId, user, toast, setFocusedCellCoordinates, setSelectedPlacedIconId]);

  const selectMap = useCallback((mapId: string | null) => {
    if (mapId === currentMapId && mapId !== null) return; 
    setCurrentMapId(mapId);
    setFocusedCellCoordinates(null); 
    // setSelectedPlacedIconId(null) is handled by setFocusedCellCoordinates
  }, [currentMapId, setFocusedCellCoordinates]);

  const createMap = useCallback(async (name: string): Promise<string | null> => {
    if (!user) {
      setTimeout(() => toast({ title: "Error", description: "You must be logged in to create a map.", variant: "destructive" }), 0);
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
      setTimeout(() => toast({ title: "Success", description: `Map "${name}" created.` }), 0);
      selectMap(docRef.id);
      return docRef.id;
    } catch (error: any) {
      console.error("Error creating map:", error);
      setTimeout(() => toast({ title: "Error", description: `Failed to create map: ${error.message}`, variant: "destructive" }), 0);
      return null;
    } finally {
      setIsLoadingMapData(false);
    }
  }, [user, toast, selectMap]);
  
  const updateMapInFirestore = useCallback(async (mapId: string, updates: Partial<Omit<MapData, 'id' | 'createdAt'>>) => {
    if (!user) {
        setTimeout(() => toast({ title: "Error", description: "Authentication required to update map.", variant: "destructive" }), 0);
        throw new Error("Authentication required");
    }
    const mapToUpdate = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null) ;
    
    if (!mapToUpdate) {
        setTimeout(() => toast({ title: "Error", description: "Map data not found for update.", variant: "destructive" }), 0);
        throw new Error("Map data not found");
    }
    if (mapToUpdate.userId !== user.uid) {
        setTimeout(() => toast({ title: "Permission Denied", description: "You do not have permission to update this map.", variant: "destructive" }), 0);
        throw new Error("Permission denied");
    }

    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (error: any) {
      console.error(`Error updating map ${mapId} in Firestore:`, error);
      setTimeout(() => toast({ title: "Save Error", description: `Could not save map changes: ${error.message}`, variant: "destructive" }), 0);
      throw error; 
    }
  }, [user, toast, userMapList, currentMapData]);

  const updateCurrentMapGridInFirestore = useCallback(async (newLocalGrid: LocalGridState) => {
    if (!currentMapId || !user) {
        return;
    }
    
    const mapData = currentMapData; 
    if (!mapData) {
        setTimeout(() => toast({ title: "Error", description: "Map data not loaded. Cannot save changes.", variant: "destructive" }), 0);
        return;
    }
    if (mapData.userId !== user.uid) {
        setTimeout(() => toast({ title: "Permission Denied", description: "You cannot modify this map's grid.", variant: "destructive" }), 0);
        return;
    }

    const newFirestoreGrid = convertLocalToFirestoreGrid(newLocalGrid);
    try {
      await updateMapInFirestore(currentMapId, { gridState: newFirestoreGrid });
    } catch (error) {
       // Error handled by updateMapInFirestore
    }
  }, [currentMapId, user, currentMapData, updateMapInFirestore, toast]);


  const addPlacedIconToCell = useCallback((rowIndex: number, colIndex: number, iconType: IconType, x: number, y: number) => {
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                const newPlacedIcon: PlacedIcon = { id: crypto.randomUUID(), type: iconType, x, y, note: '' };
                return { ...cell, placedIcons: [...cell.placedIcons, newPlacedIcon] };
              }
              return cell;
            })
          : row
      );
      updateCurrentMapGridInFirestore(newGrid); 
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore]);

  const updatePlacedIconPositionInCell = useCallback((rowIndex: number, colIndex: number, placedIconId: string, newX: number, newY: number) => {
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
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

  const updatePlacedIconNote = useCallback((rowIndex: number, colIndex: number, placedIconId: string, newNote: string) => {
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                return {
                  ...cell,
                  placedIcons: cell.placedIcons.map(pi =>
                    pi.id === placedIconId ? { ...pi, note: newNote } : pi
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
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                return { ...cell, placedIcons: cell.placedIcons.filter(pi => pi.id !== placedIconId) };
              }
              return cell;
            })
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      // If the deleted icon was the selected one, clear the selection
      if (selectedPlacedIconId === placedIconId) {
        setSelectedPlacedIconId(null);
      }
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore, selectedPlacedIconId, setSelectedPlacedIconId]);
  
  const clearAllPlacedIconsInCell = useCallback((rowIndex: number, colIndex: number) => {
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, placedIcons: [] } : cell))
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      setSelectedPlacedIconId(null); // Clear selected icon if all icons in its cell are cleared
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore, setSelectedPlacedIconId]);

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
      setTimeout(() => toast({ title: "Error", description: "No map selected or not authenticated.", variant: "destructive" }), 0);
      return;
    }
    if (currentMapData.userId !== user.uid) {
        setTimeout(() => toast({ title: "Permission Denied", description: "You do not have permission to reset this map.", variant: "destructive" }), 0);
        return;
    }

    const newLocalGrid = initializeLocalGrid(); 
    setCurrentLocalGrid(newLocalGrid); 
    setSelectedPlacedIconId(null); // Clear selected icon
    try {
      await updateCurrentMapGridInFirestore(newLocalGrid);
      setTimeout(() => toast({ title: "Map Reset", description: "Current map grid has been reset." }), 0);
    } catch (error) {
      // Error already handled by updateCurrentMapGridInFirestore
    }
  }, [currentMapId, user, currentMapData, toast, updateCurrentMapGridInFirestore, setSelectedPlacedIconId]);
  
  const deleteMap = useCallback(async (mapId: string) => {
    if (!user) {
        setTimeout(() => toast({ title: "Error", description: "Authentication required.", variant: "destructive" }), 0);
        return;
    }
    const mapToDelete = userMapList.find(m => m.id === mapId);
    if (!mapToDelete || mapToDelete.userId !== user.uid) {
        setTimeout(() => toast({ title: "Permission Denied", description: "You do not have permission to delete this map.", variant: "destructive" }), 0);
        return;
    }
    try {
        await deleteDoc(doc(db, "maps", mapId));
        setTimeout(() => toast({ title: "Success", description: "Map deleted successfully." }), 0);
        if (currentMapId === mapId) {
            selectMap(null); 
        }
    } catch (error: any) {
        console.error("Error deleting map:", error);
        setTimeout(() => toast({ title: "Error", description: `Failed to delete map: ${error.message}`, variant: "destructive" }), 0);
    }
  }, [user, currentMapId, userMapList, selectMap, toast]);

  const updateMapName = useCallback(async (mapId: string, newName: string) => {
      if (!user) {
          setTimeout(() => toast({ title: "Error", description: "Authentication required.", variant: "destructive" }), 0);
          return;
      }
      const mapDataToUpdate = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
       if (!mapDataToUpdate || mapDataToUpdate.userId !== user.uid) {
           setTimeout(() => toast({ title: "Permission Denied", description: "You do not have permission to change the map name.", variant: "destructive" }), 0);
           return;
       }
      try {
          await updateMapInFirestore(mapId, { name: newName });
          setTimeout(() => toast({ title: "Success", description: "Map name updated." }), 0);
      } catch (error) {
          // Error already handled by updateMapInFirestore
      }
  }, [user, userMapList, currentMapData, toast, updateMapInFirestore]);

  const uploadCellBackgroundImage = useCallback(async (rowIndex: number, colIndex: number, file: File) => {
    if (!currentMapId || !user || !currentLocalGrid) {
      setTimeout(() => toast({ title: "Error", description: "Cannot upload image: No map selected or not authenticated.", variant: "destructive" }), 0);
      return;
    }
    const cellData = currentLocalGrid[rowIndex]?.[colIndex];
    if (!cellData) {
      setTimeout(() => toast({ title: "Error", description: "Cell data not found.", variant: "destructive" }), 0);
      return;
    }

    if (cellData.backgroundImageUrl) {
      try {
        const oldImageRef = storageRef(storage, cellData.backgroundImageUrl);
        await deleteObject(oldImageRef);
      } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
          setTimeout(() => toast({ title: "Warning", description: "Could not remove the old background image. It might be orphaned in storage.", variant: "default" }), 0);
        }
      }
    }

    const imagePath = `map_backgrounds/${currentMapId}/${cellData.id}/${file.name}`;
    const imageFileRef = storageRef(storage, imagePath);

    try {
      const snapshot = await uploadBytes(imageFileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setCurrentLocalGrid(prevGrid => {
        if (!prevGrid) return null;
        const newGrid = prevGrid.map((row, rIdx) =>
          rIdx === rowIndex
            ? row.map((cell, cIdx) =>
                cIdx === colIndex ? { ...cell, backgroundImageUrl: downloadURL } : cell
              )
            : row
        );
        updateCurrentMapGridInFirestore(newGrid);
        return newGrid;
      });
      setTimeout(() => toast({ title: "Success", description: "Background image uploaded." }), 0);
    } catch (error: any) {
      setTimeout(() => toast({ title: "Upload Failed", description: `Could not upload image: ${error.message || 'Unknown error'}. Check browser console for details. Ensure CORS is configured on your Firebase Storage bucket.`, variant: "destructive" }), 0);
    }
  }, [currentMapId, user, currentLocalGrid, toast, updateCurrentMapGridInFirestore]);

  const removeCellBackgroundImage = useCallback(async (rowIndex: number, colIndex: number) => {
    if (!currentMapId || !user || !currentLocalGrid) {
      setTimeout(() => toast({ title: "Error", description: "Cannot remove image: No map selected or not authenticated.", variant: "destructive" }), 0);
      return;
    }
    const cellData = currentLocalGrid[rowIndex]?.[colIndex];
    if (!cellData || !cellData.backgroundImageUrl) {
      setTimeout(() => toast({ title: "Info", description: "No background image to remove.", variant: "default" }), 0);
      return;
    }

    const imageToDeleteRef = storageRef(storage, cellData.backgroundImageUrl);
    try {
      await deleteObject(imageToDeleteRef);
    } catch (error: any) {
      if (error.code !== 'storage/object-not-found') {
        setTimeout(() => toast({ title: "Storage Error", description: `Could not delete image from storage: ${error.message || 'Unknown error'}. Check console.`, variant: "destructive" }), 0);
      }
    }
    
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) =>
              cIdx === colIndex ? { ...cell, backgroundImageUrl: undefined } : cell
            )
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      return newGrid;
    });
    setTimeout(() => toast({ title: "Success", description: "Background image removed." }), 0);

  }, [currentMapId, user, currentLocalGrid, toast, updateCurrentMapGridInFirestore]);


  return (
    <MapContext.Provider value={{
      userMapList,
      currentMapId,
      currentMapData,
      currentLocalGrid,
      isLoadingMapList,
      isLoadingMapData: isLoadingMapData || (currentMapId ? !currentMapData : false),
      focusedCellCoordinates,
      selectedPlacedIconId, // Provide new state
      setFocusedCellCoordinates,
      setSelectedPlacedIconId, // Provide new setter
      selectMap,
      createMap,
      deleteMap,
      updateMapName,
      addPlacedIconToCell,
      updatePlacedIconPositionInCell,
      updatePlacedIconNote,
      removePlacedIconFromCell,
      clearAllPlacedIconsInCell,
      updateCellNotes,
      resetCurrentMapGrid,
      uploadCellBackgroundImage,
      removeCellBackgroundImage,
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

