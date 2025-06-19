
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
          backgroundImageUrl: undefined, // Initialize with undefined
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
          note: pi.note || '',
        })),
        backgroundImageUrl: cell.backgroundImageUrl || undefined, // Ensure it's undefined if empty
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
  setFocusedCellCoordinates: (coordinates: FocusedCellCoordinates | null) => void;
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
    if (!user) {
        toast({ title: "Error", description: "Authentication required to update map.", variant: "destructive" });
        throw new Error("Authentication required");
    }
    const mapToUpdate = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null) ;
    
    if (!mapToUpdate) {
        toast({ title: "Error", description: "Map data not found for update.", variant: "destructive" });
        throw new Error("Map data not found");
    }
    if (mapToUpdate.userId !== user.uid) {
        toast({ title: "Permission Denied", description: "You do not have permission to update this map.", variant: "destructive" });
        throw new Error("Permission denied");
    }

    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (error: any) {
      console.error(`Error updating map ${mapId} in Firestore:`, error);
      toast({ title: "Save Error", description: `Could not save map changes: ${error.message}`, variant: "destructive" });
      throw error; 
    }
  }, [user, toast, userMapList, currentMapData]);

  const updateCurrentMapGridInFirestore = useCallback(async (newLocalGrid: LocalGridState) => {
    console.log("MapContext: updateCurrentMapGridInFirestore called.");
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
    console.log("MapContext: Converted grid for Firestore:", newFirestoreGrid);
    try {
      await updateMapInFirestore(currentMapId, { gridState: newFirestoreGrid });
      console.log("MapContext: Firestore update successful.");
    } catch (error) {
       console.error("MapContext: updateCurrentMapGridInFirestore - Error during Firestore update:", error);
    }
  }, [currentMapId, user, currentMapData, updateMapInFirestore, toast]);


  const addPlacedIconToCell = useCallback((rowIndex: number, colIndex: number, iconType: IconType, x: number, y: number) => {
    console.log(`MapContext: addPlacedIconToCell called for [${rowIndex}, ${colIndex}] with type ${iconType}`);
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

    const newLocalGrid = initializeLocalGrid(); // This will now init with undefined backgroundImageUrl
    setCurrentLocalGrid(newLocalGrid); 
    try {
      // TODO: Iterate through old grid and delete images from storage if necessary.
      // For now, just clearing URLs from Firestore.
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
    // TODO: Consider deleting all associated background images from Storage when a map is deleted.
    // This is a more complex operation and will be omitted for now.
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

  const uploadCellBackgroundImage = useCallback(async (rowIndex: number, colIndex: number, file: File) => {
    if (!currentMapId || !user || !currentLocalGrid) {
      toast({ title: "Error", description: "Cannot upload image: No map selected or not authenticated.", variant: "destructive" });
      console.error("uploadCellBackgroundImage: Pre-check failed", { currentMapId, user, currentLocalGrid });
      return;
    }
    const cellData = currentLocalGrid[rowIndex]?.[colIndex];
    if (!cellData) {
      toast({ title: "Error", description: "Cell data not found.", variant: "destructive" });
      console.error("uploadCellBackgroundImage: Cell data not found for", { rowIndex, colIndex });
      return;
    }

    // Delete old image if it exists
    if (cellData.backgroundImageUrl) {
      console.log("uploadCellBackgroundImage: Attempting to delete old image:", cellData.backgroundImageUrl);
      try {
        const oldImageRef = storageRef(storage, cellData.backgroundImageUrl);
        await deleteObject(oldImageRef);
        console.log("uploadCellBackgroundImage: Old image deleted successfully.");
      } catch (error: any) {
        console.warn("uploadCellBackgroundImage: Could not delete old background image. This might be okay if it was already deleted or never existed.", error);
        if (error.code !== 'storage/object-not-found') {
          toast({ title: "Warning", description: "Could not remove the old background image. It might be orphaned in storage.", variant: "default" });
        }
      }
    }

    const imagePath = `map_backgrounds/${currentMapId}/${cellData.id}/${file.name}`;
    const imageFileRef = storageRef(storage, imagePath);
    console.log("uploadCellBackgroundImage: Attempting to upload new image to:", imagePath);

    try {
      const snapshot = await uploadBytes(imageFileRef, file);
      console.log("uploadCellBackgroundImage: Upload successful. Snapshot:", snapshot);
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("uploadCellBackgroundImage: New image URL:", downloadURL);

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
      toast({ title: "Success", description: "Background image uploaded." });
    } catch (error: any) {
      console.error("uploadCellBackgroundImage: Error during image upload process. Full error object:", error);
      toast({ title: "Upload Failed", description: `Could not upload image: ${error.message || 'Unknown error'}. Check console for details.`, variant: "destructive" });
    }
  }, [currentMapId, user, currentLocalGrid, toast, updateCurrentMapGridInFirestore]);

  const removeCellBackgroundImage = useCallback(async (rowIndex: number, colIndex: number) => {
    if (!currentMapId || !user || !currentLocalGrid) {
      toast({ title: "Error", description: "Cannot remove image: No map selected or not authenticated.", variant: "destructive" });
      console.error("removeCellBackgroundImage: Pre-check failed", { currentMapId, user, currentLocalGrid });
      return;
    }
    const cellData = currentLocalGrid[rowIndex]?.[colIndex];
    if (!cellData || !cellData.backgroundImageUrl) {
      toast({ title: "Info", description: "No background image to remove.", variant: "default" });
      console.log("removeCellBackgroundImage: No background image URL found for cell", { rowIndex, colIndex });
      return;
    }

    console.log("removeCellBackgroundImage: Attempting to delete image from storage:", cellData.backgroundImageUrl);
    const imageToDeleteRef = storageRef(storage, cellData.backgroundImageUrl);
    try {
      await deleteObject(imageToDeleteRef);
      console.log("removeCellBackgroundImage: Image deleted from storage successfully.");
    } catch (error: any) {
      console.warn("removeCellBackgroundImage: Error deleting background image from storage. This might be okay if it was already deleted.", error);
       // If it's not found, that's fine, it might have been deleted manually or through other means
      if (error.code !== 'storage/object-not-found') {
        toast({ title: "Storage Error", description: `Could not delete image from storage: ${error.message || 'Unknown error'}. Check console.`, variant: "destructive" });
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
    toast({ title: "Success", description: "Background image removed." });

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
      setFocusedCellCoordinates,
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

