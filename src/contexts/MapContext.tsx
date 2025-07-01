
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LocalGridState, FirestoreGridState, IconType, MapData, FocusedCellCoordinates, PlacedIcon, UserProfile } from '@/types';
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
  getDoc,
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
  removeSelfAsEditor: (mapId: string) => Promise<void>;

  regenerateCollaboratorShareId: (mapId: string) => Promise<void>;
  disableCollaboratorShareId: (mapId: string) => Promise<void>;
  claimEditorInvite: (mapIdToJoin: string, providedShareId: string) => Promise<boolean>;
  transferMapOwnership: (mapId: string, newOwnerUid: string) => Promise<void>;

  editorProfiles: Record<string, UserProfile | null>;
  isLoadingEditorProfiles: boolean;
  fetchEditorProfiles: (editorUids: string[]) => Promise<void>;
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

  const [editorProfiles, setEditorProfiles] = useState<Record<string, UserProfile | null>>({});
  const [isLoadingEditorProfiles, setIsLoadingEditorProfiles] = useState(false);

  const setFocusedCellCoordinates = useCallback((coordinates: FocusedCellCoordinates | null) => {
    _setFocusedCellCoordinates(coordinates);
    if (coordinates === null || (coordinates?.rowIndex !== focusedCellCoordinates?.rowIndex || coordinates?.colIndex !== focusedCellCoordinates?.colIndex)) {
      _setSelectedPlacedIconId(null);
    }
  }, [focusedCellCoordinates]);

  const setSelectedPlacedIconId = useCallback((iconId: string | null) => {
    _setSelectedPlacedIconId(iconId);
  }, []);

  const fetchEditorProfiles = useCallback(async (editorUids: string[]) => {
    if (!editorUids || editorUids.length === 0) {
      setEditorProfiles(prev => ({...prev}));
      return;
    }

    const uidsToActuallyFetch = editorUids.filter(uid => typeof editorProfiles[uid] === 'undefined');

    if (uidsToActuallyFetch.length === 0) {
      return;
    }

    setIsLoadingEditorProfiles(true);
    const newProfilesUpdate: Record<string, UserProfile | null> = {};

    try {
      for (const uid of uidsToActuallyFetch) {
        const userDocRef = doc(db, "users", uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          newProfilesUpdate[uid] = {
            uid: uid,
            email: data.email || null,
            displayName: data.displayName || null,
          };
        } else {
          newProfilesUpdate[uid] = null;
        }
      }
      setEditorProfiles(prevProfiles => ({ ...prevProfiles, ...newProfilesUpdate }));
    } catch (error: any) {
      console.error("Error fetching editor profiles:", error);
      let desc = "Could not load some editor details.";
      if (error.code === 'permission-denied') {
        desc = "Could not load some editor details due to Firestore security rules. Ensure rules allow reading user profiles.";
      }
      toast({ title: "Error", description: desc, variant: "destructive", duration: 10000 });
    } finally {
      setIsLoadingEditorProfiles(false);
    }
  }, [toast, editorProfiles]);


  useEffect(() => {
    if (isAuthLoading || !user) {
      setUserMapList([]);
      setCurrentMapId(null);
      setCurrentMapData(null);
      setCurrentLocalGrid(null);
      setFocusedCellCoordinates(null);
      setSelectedPlacedIconId(null);
      setEditorProfiles({});
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
        if (map && map.id) {
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
      toast({ title: "Error Loading Owned Maps", description: "Could not load your owned maps. Check console for details.", variant: "destructive" });
      if (!ownerLoaded) ownerLoaded = true;
      if (editorLoaded) setIsLoadingMapList(false);
    });

    const unsubEditor = onSnapshot(qEditor, (snapshot) => {
      mapSources.editor = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MapData));
      if (!editorLoaded) editorLoaded = true;
      updateCombinedList();
    }, (error: any) => {
      console.error("Error fetching shared maps:", error);
      let desc = "Could not load maps shared with you. This might be due to Firestore security rules or missing indexes. Check browser console for details.";
      if (error.code === 'failed-precondition') {
        desc = "Could not load shared maps due to a missing Firestore index. The browser console may have a link to create it.";
      } else if (error.code === 'permission-denied') {
        desc = "Could not load shared maps due to Firestore security rules. Ensure rules allow querying maps where you are an editor.";
      }
      toast({
        title: "Error Loading Shared Maps",
        description: desc,
        variant: "destructive",
        duration: 10000
      });
      if (!editorLoaded) editorLoaded = true;
      if (ownerLoaded) setIsLoadingMapList(false);
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
          if(user || !isAuthLoading) {
            toast({ title: "Access Denied", description: "You do not have permission to view this map.", variant: "destructive" });
            setCurrentMapData(null);
            setCurrentLocalGrid(null);
            setCurrentMapId(null);
            setFocusedCellCoordinates(null);
            setSelectedPlacedIconId(null);
          }
        }
      } else {
        toast({ title: "Error", description: `Map with ID ${currentMapId} not found.`, variant: "destructive" });
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
      setCurrentMapData(null);
      setCurrentLocalGrid(null);
      setCurrentMapId(null);
      setIsLoadingMapData(false);
    });

    return () => unsubscribe();
  }, [currentMapId, user, toast, setFocusedCellCoordinates, setSelectedPlacedIconId, isAuthLoading]);

  const selectMap = useCallback((newMapId: string | null) => {
    if (currentMapId !== newMapId) {
        setCurrentMapId(newMapId);
        _setFocusedCellCoordinates(null);
        _setSelectedPlacedIconId(null);
        if (newMapId !== null) {
            setEditorProfiles({});
        }
    }
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
      ownerId: user.uid,
      editors: [],
      gridState: convertLocalToFirestoreGrid(initializeLocalGrid()),
      createdAt: now as Timestamp,
      updatedAt: now as Timestamp,
      updatedBy: user.uid,
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

  const updateCurrentMapGridInFirestore = useCallback(async (newLocalGrid: LocalGridState) => {
    if (!currentMapId || !user) {
      return;
    }
    const newFirestoreGrid = convertLocalToFirestoreGrid(newLocalGrid);
    try {
      const mapDocRef = doc(db, "maps", currentMapId);
      await updateDoc(mapDocRef, { gridState: newFirestoreGrid, updatedAt: serverTimestamp(), updatedBy: user.uid });
    } catch (error: any) {
      console.error(`Error updating grid for map ${currentMapId}:`, error);
      toast({ title: "Save Error", description: "Could not save grid changes.", variant: "destructive" });
    }
  }, [currentMapId, user, toast]);

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
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      toast({ title: "Success", description: `User added as editor.` });
      fetchEditorProfiles([editorUid]);
    } catch (error: any) {
      console.error("Error adding editor:", error);
      toast({ title: "Error", description: `Failed to add editor: ${error.message}`, variant: "destructive" });
    }
  }, [user, toast, userMapList, currentMapData, fetchEditorProfiles]);

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
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      toast({ title: "Success", description: `Editor removed.` });
      setEditorProfiles(prev => {
        const newProfiles = {...prev};
        delete newProfiles[editorUid];
        return newProfiles;
      });
    } catch (error: any) {
      console.error("Error removing editor:", error);
      toast({ title: "Error", description: `Failed to remove editor: ${error.message}`, variant: "destructive" });
    }
  }, [user, toast, userMapList, currentMapData]);

  const removeSelfAsEditor = useCallback(async (mapId: string) => {
    if (!user) {
        toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
        return;
    }
    const mapData = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
    if (!mapData) {
        toast({ title: "Error", description: "Map not found.", variant: "destructive" });
        return;
    }
    if (mapData.ownerId === user.uid) {
        toast({ title: "Action Not Allowed", description: "Owners cannot leave their own map. You can delete it instead.", variant: "destructive" });
        return;
    }
    if (!mapData.editors || !mapData.editors.includes(user.uid)) {
        toast({ title: "Action Not Allowed", description: "You are not an editor of this map.", variant: "destructive" });
        return;
    }
    const mapDocRef = doc(db, "maps", mapId);
    try {
        await updateDoc(mapDocRef, {
            editors: arrayRemove(user.uid),
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });
        toast({ title: "Success", description: `You have left the map "${mapData.name}".` });
        if (currentMapId === mapId) {
            selectMap(null); // Go back to map manager if viewing the map
        }
    } catch (error: any) {
        console.error("Error removing self as editor:", error);
        toast({ title: "Error", description: `Failed to leave map: ${error.message}`, variant: "destructive" });
    }
  }, [user, toast, userMapList, currentMapData, currentMapId, selectMap]);

  const transferMapOwnership = useCallback(async (mapId: string, newOwnerUid: string) => {
    if (!user) {
        toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
        return;
    }
    
    const mapDocRef = doc(db, "maps", mapId);

    try {
        const mapDoc = await getDoc(mapDocRef);
        if (!mapDoc.exists()) {
            toast({ title: "Error", description: "Map not found.", variant: "destructive" });
            return;
        }

        const mapData = mapDoc.data() as MapData;
        const currentOwnerUid = user.uid;

        if (mapData.ownerId !== currentOwnerUid) {
            toast({ title: "Permission Denied", description: "Only the current map owner can transfer ownership.", variant: "destructive" });
            return;
        }
        
        if (!mapData.editors.includes(newOwnerUid)) {
            toast({ title: "Error", description: "The new owner must be an existing editor on the map.", variant: "destructive" });
            return;
        }

        // Prepare the new editors array
        const newEditorsArray = mapData.editors.filter(uid => uid !== newOwnerUid);
        newEditorsArray.push(currentOwnerUid);

        await updateDoc(mapDocRef, {
            ownerId: newOwnerUid,
            editors: newEditorsArray,
            updatedAt: serverTimestamp(),
            updatedBy: currentOwnerUid,
        });

        toast({ title: "Success", description: "Map ownership transferred successfully." });
        
        // The onSnapshot listener will handle updating state, no need for manual state updates here.
        // It might be good to ensure the user is navigated away if they lose access, but the rules keep them as editor.

    } catch (error: any) {
        console.error("Error transferring ownership:", error);
        toast({ title: "Ownership Transfer Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  }, [user, toast]);

  const addPlacedIconToCell = useCallback((rowIndex: number, colIndex: number, iconType: IconType, x: number, y: number) => {
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
      setSelectedPlacedIconId(null);
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
    if (!currentMapId || !user) {
      toast({ title: "Error", description: "No map selected or not authenticated.", variant: "destructive" });
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
  }, [currentMapId, user, toast, updateCurrentMapGridInFirestore, setSelectedPlacedIconId]);

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
      try {
          const mapDocRef = doc(db, "maps", mapId);
          await updateDoc(mapDocRef, { name: newName, updatedAt: serverTimestamp(), updatedBy: user.uid });
          toast({ title: "Success", description: "Map name updated." });
      } catch (error: any) {
          console.error(`Error updating name for map ${mapId}:`, error);
          toast({ title: "Save Error", description: "Could not save map name.", variant: "destructive" });
      }
  }, [user, toast]);

  const uploadCellBackgroundImage = useCallback(async (rowIndex: number, colIndex: number, file: File) => {
    if (!currentMapId || !user || !currentLocalGrid) {
      toast({ title: "Error", description: "Cannot upload image: Operation not permitted or map not loaded.", variant: "destructive" });
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
  }, [currentMapId, user, currentLocalGrid, toast, updateCurrentMapGridInFirestore]);

  const removeCellBackgroundImage = useCallback(async (rowIndex: number, colIndex: number) => {
    if (!currentMapId || !user || !currentLocalGrid) {
      toast({ title: "Error", description: "Cannot remove image: Operation not permitted or map not loaded.", variant: "destructive" });
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

  }, [currentMapId, user, currentLocalGrid, toast, updateCurrentMapGridInFirestore]);

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
    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, { isPublicViewable: enable, publicViewId: newPublicViewId, updatedAt: serverTimestamp(), updatedBy: user.uid });
      toast({ title: "Success", description: `Public view ${enable ? 'enabled' : 'disabled'}.` });
    } catch (error: any) {
      console.error("Error toggling public view:", error);
      toast({ title: "Error", description: `Failed to update public view settings: ${error.message}`, variant: "destructive" });
    }
  }, [user, userMapList, currentMapData, toast]);

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
    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, { publicViewId: newPublicViewId, isPublicViewable: true, updatedAt: serverTimestamp(), updatedBy: user.uid });
      toast({ title: "Success", description: "Public view link regenerated." });
    } catch (error: any) {
      console.error("Error regenerating public view ID:", error);
      toast({ title: "Error", description: `Failed to regenerate public link: ${error.message}`, variant: "destructive" });
    }
  }, [user, userMapList, currentMapData, toast]);

  const regenerateCollaboratorShareId = useCallback(async (mapId: string) => {
    if (!user) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    const mapData = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
    if (!mapData || mapData.ownerId !== user.uid) {
      toast({ title: "Permission Denied", description: "Only the map owner can manage invite links.", variant: "destructive" });
      return;
    }
    const newShareId = crypto.randomUUID();
    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, { collaboratorShareId: newShareId, updatedAt: serverTimestamp(), updatedBy: user.uid });
      toast({ title: "Success", description: "Editor invite link generated/regenerated." });
    } catch (error: any) {
       toast({ title: "Error", description: `Failed to update invite link: ${error.message}`, variant: "destructive" });
    }
  }, [user, userMapList, currentMapData, toast]);

  const disableCollaboratorShareId = useCallback(async (mapId: string) => {
    if (!user) {
      toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
      return;
    }
    const mapData = userMapList.find(m => m.id === mapId) || (currentMapData?.id === mapId ? currentMapData : null);
    if (!mapData || mapData.ownerId !== user.uid) {
      toast({ title: "Permission Denied", description: "Only the map owner can manage invite links.", variant: "destructive" });
      return;
    }
    const mapDocRef = doc(db, "maps", mapId);
    try {
      await updateDoc(mapDocRef, { collaboratorShareId: null, updatedAt: serverTimestamp(), updatedBy: user.uid });
      toast({ title: "Success", description: "Editor invite link disabled." });
    } catch (error: any) {
       toast({ title: "Error", description: `Failed to disable invite link: ${error.message}`, variant: "destructive" });
    }
  }, [user, userMapList, currentMapData, toast]);

  const claimEditorInvite = useCallback(async (mapIdToJoin: string, providedShareId: string): Promise<boolean> => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to join a map.", variant: "destructive" });
      return false;
    }
    try {
      const mapDocRef = doc(db, "maps", mapIdToJoin);
      const mapSnapshot = await getDoc(mapDocRef);

      if (!mapSnapshot.exists()) {
        toast({ title: "Invite Error", description: "This invite link is invalid or the map no longer exists.", variant: "destructive" });
        return false;
      }
      const mapData = mapSnapshot.data() as MapData;

      if (mapData.ownerId === user.uid) {
        toast({ title: "Already Owner", description: "You are the owner of this map.", variant: "default" });
        return true;
      }
      if (mapData.editors && mapData.editors.includes(user.uid)) {
        toast({ title: "Already Editor", description: "You are already an editor for this map.", variant: "default" });
        return true;
      }
      if (mapData.collaboratorShareId !== providedShareId || !mapData.collaboratorShareId) {
        toast({ title: "Invite Error", description: "This invite link is invalid or has expired.", variant: "destructive" });
        return false;
      }

      await updateDoc(mapDocRef, {
        editors: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      toast({ title: "Joined Map!", description: `You are now an editor for "${mapData.name}".` });
      return true;

    } catch (error: any) {
      console.error("Error claiming editor invite:", error);
      let detailedMessage = `Failed to join map: ${error.message}`;
      if (error.code === 'permission-denied') {
        detailedMessage = "Could not join the map. This usually means the invite link is invalid, has expired, or there's an issue with map permissions (security rules). Please verify the link or contact the map owner.";
      }
      toast({
        title: "Invite Error",
        description: detailedMessage,
        variant: "destructive",
        duration: error.code === 'permission-denied' ? 10000 : 5000
      });
      return false;
    }
  }, [user, toast]);


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
      removeSelfAsEditor,
      regenerateCollaboratorShareId,
      disableCollaboratorShareId,
      claimEditorInvite,
      transferMapOwnership,
      editorProfiles,
      isLoadingEditorProfiles,
      fetchEditorProfiles,
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
