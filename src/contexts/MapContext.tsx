
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LocalGridState, FirestoreGridState, IconType, MapData, FocusedCellCoordinates, PlacedIcon } from '@/types';
import { useAuth } from './AuthContext';
import { db, storage } from '@/firebase/firebaseConfig';
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
  getDocs,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { 
  initializeLocalGrid, 
  convertLocalToFirestoreGrid, 
  convertFirestoreToLocalGrid 
} from '@/lib/mapUtils';


interface MapContextType {
  userMapList: MapData[];
  currentMapId: string | null;
  currentMapData: MapData | null;
  currentLocalGrid: LocalGridState | null;
  isLoadingMapList: boolean;
  isLoadingMapData: boolean;
  focusedCellCoordinates: FocusedCellCoordinates | null;
  selectedPlacedIconId: string | null;
  setFocusedCellCoordinates: (coordinates: FocusedCellCoordinates | null) => void;
  setSelectedPlacedIconId: (iconId: string | null) => void;
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

  togglePublicView: (mapId: string, enable: boolean) => Promise<void>;
  regeneratePublicViewId: (mapId: string) => Promise<void>;

  addEditorToMap: (mapId: string, editorUid: string) => Promise<void>;
  removeEditorFromMap: (mapId: string, editorUid: string) => Promise<void>;
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
  const [selectedPlacedIconId, _setSelectedPlacedIconId] = useState<string | null>(null);

  const [isLoadingMapList, setIsLoadingMapList] = useState<boolean>(true);
  const [isLoadingMapData, setIsLoadingMapData] = useState<boolean>(false);

  const setFocusedCellCoordinates = useCallback((coordinates: FocusedCellCoordinates | null) => {
    _setFocusedCellCoordinates(coordinates);
    if (coordinates === null || (coordinates?.rowIndex !== focusedCellCoordinates?.rowIndex || coordinates?.colIndex !== focusedCellCoordinates?.colIndex)) {
      _setSelectedPlacedIconId(null);
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

    const qOwner = query(mapsCollectionRef, where("ownerId", "==", user.uid));
    const qEditor = query(mapsCollectionRef, where("editors", "array-contains", user.uid));

    const mapSources = { owner: [] as MapData[], editor: [] as MapData[] };
    let ownerLoaded = false;
    let editorLoaded = false;

    const updateCombinedList = () => {
      const combined = [...mapSources.owner, ...mapSources.editor];
      const uniqueMapsMap = new Map<string, MapData>();
      combined.forEach(map => {
        if (map && map.id) { // Ensure map and map.id are defined
          uniqueMapsMap.set(map.id, map);
        }
      });
      const sortedUniqueMaps = Array.from(uniqueMapsMap.values())
        .sort((a, b) => {
          const timeA = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : 0);
          const timeB = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : 0);
          return timeB - timeA;
        });
      setUserMapList(sortedUniqueMaps);
      if (ownerLoaded && editorLoaded) {
        setIsLoadingMapList(false);
      }
    };

    const unsubOwner = onSnapshot(qOwner, (snapshot) => {
      mapSources.owner = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapData));
      if (!ownerLoaded) ownerLoaded = true;
      updateCombinedList();
    }, (error) => { 
      console.error("Error fetching owner maps:", error);
      toast({ title: "Error", description: "Could not load your owned maps.", variant: "destructive" });
      if (!ownerLoaded) ownerLoaded = true; // Mark as loaded to potentially unblock loading state
      if (editorLoaded) setIsLoadingMapList(false); // If other source is loaded, stop global loading
    });

    const unsubEditor = onSnapshot(qEditor, (snapshot) => {
      mapSources.editor = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapData));
      if (!editorLoaded) editorLoaded = true;
      updateCombinedList();
    }, (error) => { 
      console.error("Error fetching shared maps:", error);
      toast({ title: "Error", description: "Could not load maps shared with you.", variant: "destructive" });
      if (!editorLoaded) editorLoaded = true; // Mark as loaded
      if (ownerLoaded) setIsLoadingMapList(false); // If other source is loaded, stop global loading
    });
    
    return () => { unsubOwner(); unsubEditor(); };

  }, [user, isAuthLoading, toast, setFocusedCellCoordinates, setSelectedPlacedIconId]);

  useEffect(() => {
    if (!currentMapId) {
      setCurrentMapData(null);
      setCurrentLocalGrid(null);
      setIsLoadingMapData(false);
      setFocusedCellCoordinates(null);
      setSelectedPlacedIconId(null);
      return;
    }

    setIsLoadingMapData(true);
    const mapDocRef = doc(db, "maps", currentMapId);
    const unsubscribe = onSnapshot(mapDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const mapData = { id: docSnap.id, ...docSnap.data() } as MapData;
        const isOwner = user && (mapData.ownerId === user.uid);
        const isEditor = user && mapData.editors && mapData.editors.includes(user.uid);

        if (isOwner || isEditor) {
          setCurrentMapData(mapData);
          setCurrentLocalGrid(convertFirestoreToLocalGrid(mapData.gridState));
        } else {
          toast({ title: "Access Denied", description: "You do not have permission to view this map.", variant: "destructive" });
          setCurrentMapData(null);
          setCurrentLocalGrid(null);
          setCurrentMapId(null);
          setFocusedCellCoordinates(null);
          setSelectedPlacedIconId(null);
        }
      } else {
        toast({ title: "Error", description: `Map with ID ${currentMapId} not found. Selecting no map.`, variant: "destructive" });
        setCurrentMapData(null);
        setCurrentLocalGrid(null);
        setCurrentMapId(null);
        setFocusedCellCoordinates(null);
        setSelectedPlacedIconId(null);
      }
      setIsLoadingMapData(false);
    }, (error) => {
      console.error(`Error fetching map ${currentMapId}:`, error);
      toast({ title: "Error", description: "Could not load selected map data.", variant: "destructive" });
      setIsLoadingMapData(false);
    });

    return () => unsubscribe();
  }, [currentMapId, user, toast, setFocusedCellCoordinates, setSelectedPlacedIconId]);

  const selectMap = useCallback((mapId: string | null) => {
    if (mapId === currentMapId && mapId !== null) {
       if (focusedCellCoordinates) {
        setFocusedCellCoordinates(null);
       }
       return;
    }
    setCurrentMapId(mapId);
    setFocusedCellCoordinates(null);
  }, [currentMapId, focusedCellCoordinates, setFocusedCellCoordinates]);

  const createMap = useCallback(async (name: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a map.", variant: "destructive" });
      return null;
    }
    setIsLoadingMapData(true);
    const now = serverTimestamp();
    const newMapData: Omit<MapData, 'id'> = {
      name,
      ownerId: user.uid,
      editors: [], // Initialize editors array
      gridState: convertLocalToFirestoreGrid(initializeLocalGrid()),
      createdAt: now as Timestamp,
      updatedAt: now as Timestamp,
      isPublicViewable: false,
      publicViewId: null,
      collaboratorShareId: null,
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
    // Find map from combined list or currentMapData for up-to-date editor list
    const mapToUpdate = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);

    if (!mapToUpdate) {
        toast({ title: "Error", description: "Map data not found for update.", variant: "destructive" });
        throw new Error("Map data not found");
    }

    const isOwner = mapToUpdate.ownerId === user.uid;
    const isEditor = mapToUpdate.editors && mapToUpdate.editors.includes(user.uid);
    
    // Allow update if owner or editor (editors can update gridState, owners can update more)
    // Specific field restrictions for editors should be handled by Firestore rules.
    // Client-side checks here are primarily for quick feedback and UI control.
    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You do not have permission to update this map.", variant: "destructive" });
        throw new Error("Permission denied to update map");
    }

    // If an editor is trying to modify fields other than gridState (or other permitted fields), block it client-side.
    // This example allows editors to modify any field passed in `updates` if they are in the `editors` list.
    // Firestore rules are the ultimate arbiter.
    // For managing 'editors' array, only owner should be allowed. This is handled in addEditor/removeEditor.

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
    if (!currentMapId || !user || !currentMapData) {
        return;
    }
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);

    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map's grid.", variant: "destructive" });
        return;
    }

    const newFirestoreGrid = convertLocalToFirestoreGrid(newLocalGrid);
    try {
      await updateMapInFirestore(currentMapId, { gridState: newFirestoreGrid });
    } catch (error) {
       // Error handled by updateMapInFirestore
    }
  }, [currentMapId, user, currentMapData, updateMapInFirestore, toast]);

  const addEditorToMap = useCallback(async (mapId: string, editorUid: string) => {
    if (!user) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    const mapData = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
    if (!mapData) {
      toast({ title: "Error", description: "Map not found.", variant: "destructive" });
      return;
    }
    if (mapData.ownerId !== user.uid) {
      toast({ title: "Permission Denied", description: "Only the map owner can add editors.", variant: "destructive" });
      return;
    }
    if (editorUid === user.uid) {
      toast({ title: "Info", description: "You cannot add yourself as an editor.", variant: "default" });
      return;
    }
     if (mapData.editors && mapData.editors.includes(editorUid)) {
      toast({ title: "Info", description: "This user is already an editor.", variant: "default" });
      return;
    }

    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, {
        editors: arrayUnion(editorUid),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Success", description: `User ${editorUid.substring(0,6)}... added as editor.` });
    } catch (error: any) {
      console.error("Error adding editor:", error);
      toast({ title: "Error", description: `Failed to add editor: ${error.message}`, variant: "destructive" });
    }
  }, [user, toast, userMapList, currentMapData]);

  const removeEditorFromMap = useCallback(async (mapId: string, editorUid: string) => {
    if (!user) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    const mapData = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
    if (!mapData) {
      toast({ title: "Error", description: "Map not found.", variant: "destructive" });
      return;
    }
    if (mapData.ownerId !== user.uid) {
      toast({ title: "Permission Denied", description: "Only the map owner can remove editors.", variant: "destructive" });
      return;
    }

    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, {
        editors: arrayRemove(editorUid),
        updatedAt: serverTimestamp()
      });
      toast({ title: "Success", description: `Editor ${editorUid.substring(0,6)}... removed.` });
    } catch (error: any) {
      console.error("Error removing editor:", error);
      toast({ title: "Error", description: `Failed to remove editor: ${error.message}`, variant: "destructive" });
    }
  }, [user, toast, userMapList, currentMapData]);


  const addPlacedIconToCell = useCallback((rowIndex: number, colIndex: number, iconType: IconType, x: number, y: number) => {
    if (!currentMapData || !user) return;
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map.", variant: "destructive" });
        return;
    }
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                const newPlacedIcon: PlacedIcon = { id: crypto.randomUUID(), type: iconType, x, y, note: '' };
                const updatedIcons = [...cell.placedIcons, newPlacedIcon];
                _setSelectedPlacedIconId(newPlacedIcon.id);
                return { ...cell, placedIcons: updatedIcons };
              }
              return cell;
            })
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore, currentMapData, user, toast]);

  const updatePlacedIconPositionInCell = useCallback((rowIndex: number, colIndex: number, placedIconId: string, newX: number, newY: number) => {
     if (!currentMapData || !user) return;
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map.", variant: "destructive" });
        return;
    }
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
  }, [updateCurrentMapGridInFirestore, currentMapData, user, toast]);

  const updatePlacedIconNote = useCallback((rowIndex: number, colIndex: number, placedIconId: string, newNote: string) => {
     if (!currentMapData || !user) return;
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map.", variant: "destructive" });
        return;
    }
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
  }, [updateCurrentMapGridInFirestore, currentMapData, user, toast]);

  const removePlacedIconFromCell = useCallback((rowIndex: number, colIndex: number, placedIconId: string) => {
     if (!currentMapData || !user) return;
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map.", variant: "destructive" });
        return;
    }
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
      if (selectedPlacedIconId === placedIconId) {
        setSelectedPlacedIconId(null);
      }
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore, selectedPlacedIconId, setSelectedPlacedIconId, currentMapData, user, toast]);

  const clearAllPlacedIconsInCell = useCallback((rowIndex: number, colIndex: number) => {
     if (!currentMapData || !user) return;
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map.", variant: "destructive" });
        return;
    }
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, placedIcons: [] } : cell))
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      setSelectedPlacedIconId(null);
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore, setSelectedPlacedIconId, currentMapData, user, toast]);

  const updateCellNotes = useCallback((rowIndex: number, colIndex: number, notes: string) => {
    if (!currentMapData || !user) return;
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map.", variant: "destructive" });
        return;
    }
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
  }, [updateCurrentMapGridInFirestore, currentMapData, user, toast]);

  const resetCurrentMapGrid = useCallback(async () => {
    if (!currentMapId || !user || !currentMapData) {
      toast({ title: "Error", description: "No map selected or not authenticated.", variant: "destructive" });
      return;
    }
    const isOwner = currentMapData.ownerId === user.uid;
    if (!isOwner) {
        toast({ title: "Permission Denied", description: "Only the map owner can reset the grid.", variant: "destructive" });
        return;
    }

    const newLocalGrid = initializeLocalGrid();
    setCurrentLocalGrid(newLocalGrid);
    setSelectedPlacedIconId(null);
    try {
      await updateCurrentMapGridInFirestore(newLocalGrid);
      toast({ title: "Map Reset", description: "Current map grid has been reset." });
    } catch (error) {
      // Error already handled by updateCurrentMapGridInFirestore
    }
  }, [currentMapId, user, currentMapData, toast, updateCurrentMapGridInFirestore, setSelectedPlacedIconId]);

  const deleteMap = useCallback(async (mapId: string) => {
    if (!user) {
        toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
        return;
    }
    const mapToDelete = userMapList.find(m => m.id === mapId);
    if (!mapToDelete) {
        toast({ title: "Error", description: "Map not found.", variant: "destructive" });
        return;
    }
    const isOwner = mapToDelete.ownerId === user.uid;
    if (!isOwner) {
        toast({ title: "Permission Denied", description: "Only the map owner can delete this map.", variant: "destructive" });
        return;
    }
    try {
        if (mapToDelete.gridState) {
            const localGrid = convertFirestoreToLocalGrid(mapToDelete.gridState);
            for (const row of localGrid) {
                for (const cell of row) {
                    if (cell.backgroundImageUrl) {
                        try {
                            const imageRef = storageRef(storage, cell.backgroundImageUrl);
                            await deleteObject(imageRef);
                        } catch (storageError: any) {
                            if (storageError.code !== 'storage/object-not-found') {
                                console.warn(`Could not delete background image ${cell.backgroundImageUrl} for map ${mapId}: ${storageError.message}`);
                            }
                        }
                    }
                }
            }
        }
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
       if (!mapDataToUpdate) {
           toast({ title: "Error", description: "Map not found.", variant: "destructive" });
           return;
       }
       const isOwner = mapDataToUpdate.ownerId === user.uid;
       if (!isOwner) {
           toast({ title: "Permission Denied", description: "Only the map owner can change the map name.", variant: "destructive" });
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
    if (!currentMapId || !user || !currentLocalGrid || !currentMapData) {
      toast({ title: "Error", description: "Cannot upload image: Operation not permitted or map not loaded.", variant: "destructive" });
      return;
    }
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
    if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map's background.", variant: "destructive" });
        return;
    }

    const cellData = currentLocalGrid[rowIndex]?.[colIndex];
    if (!cellData) {
      toast({ title: "Error", description: "Cell data not found.", variant: "destructive" });
      return;
    }

    if (cellData.backgroundImageUrl) {
      try {
        const oldImageRef = storageRef(storage, cellData.backgroundImageUrl);
        await deleteObject(oldImageRef);
      } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
          toast({ title: "Warning", description: "Could not remove the old background image.", variant: "default" });
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
      toast({ title: "Success", description: "Background image uploaded." });
    } catch (error: any) {
      toast({ title: "Upload Failed", description: `Could not upload image: ${error.message || 'Unknown error'}.`, variant: "destructive" });
    }
  }, [currentMapId, user, currentLocalGrid, currentMapData, toast, updateCurrentMapGridInFirestore]);

  const removeCellBackgroundImage = useCallback(async (rowIndex: number, colIndex: number) => {
    if (!currentMapId || !user || !currentLocalGrid || !currentMapData) {
      toast({ title: "Error", description: "Cannot remove image: Operation not permitted or map not loaded.", variant: "destructive" });
      return;
    }
    const isOwner = currentMapData.ownerId === user.uid;
    const isEditor = currentMapData.editors && currentMapData.editors.includes(user.uid);
     if (!isOwner && !isEditor) {
        toast({ title: "Permission Denied", description: "You cannot modify this map's background.", variant: "destructive" });
        return;
    }

    const cellData = currentLocalGrid[rowIndex]?.[colIndex];
    if (!cellData || !cellData.backgroundImageUrl) {
      toast({ title: "Info", description: "No background image to remove.", variant: "default" });
      return;
    }

    const imageToDeleteRef = storageRef(storage, cellData.backgroundImageUrl);
    try {
      await deleteObject(imageToDeleteRef);
    } catch (error: any) {
      if (error.code !== 'storage/object-not-found') {
        toast({ title: "Storage Error", description: `Could not delete image from storage: ${error.message || 'Unknown error'}.`, variant: "destructive" });
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

  }, [currentMapId, user, currentLocalGrid, currentMapData, toast, updateCurrentMapGridInFirestore]);

  const togglePublicView = useCallback(async (mapId: string, enable: boolean) => {
    if (!user) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    const mapToUpdate = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
    if (!mapToUpdate) {
         toast({ title: "Error", description: "Map not found to update public view settings.", variant: "destructive" });
         return;
    }
    const isOwner = mapToUpdate.ownerId === user.uid;
    if (!isOwner) {
      toast({ title: "Permission Denied", description: "Only the map owner can change public view settings.", variant: "destructive" });
      return;
    }

    let newPublicViewId = mapToUpdate.publicViewId;
    if (enable && !newPublicViewId) {
      newPublicViewId = crypto.randomUUID();
    }

    try {
      await updateMapInFirestore(mapId, { isPublicViewable: enable, publicViewId: newPublicViewId });
      toast({ title: "Success", description: `Public view ${enable ? 'enabled' : 'disabled'}.` });
    } catch (error) {
      // Error handled by updateMapInFirestore
    }
  }, [user, userMapList, currentMapData, toast, updateMapInFirestore]);

  const regeneratePublicViewId = useCallback(async (mapId: string) => {
    if (!user) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    const mapToUpdate = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
     if (!mapToUpdate) {
         toast({ title: "Error", description: "Map not found to regenerate public link.", variant: "destructive" });
         return;
    }
    const isOwner = mapToUpdate.ownerId === user.uid;
    if (!isOwner) {
      toast({ title: "Permission Denied", description: "Only the map owner can regenerate the public link.", variant: "destructive" });
      return;
    }

    const newPublicViewId = crypto.randomUUID();
    try {
      await updateMapInFirestore(mapId, { publicViewId: newPublicViewId, isPublicViewable: true }); 
      toast({ title: "Success", description: "Public view link regenerated." });
    } catch (error) {
      // Error handled by updateMapInFirestore
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
      selectedPlacedIconId,
      setFocusedCellCoordinates,
      setSelectedPlacedIconId,
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
      togglePublicView,
      regeneratePublicViewId,
      addEditorToMap,
      removeEditorFromMap,
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
