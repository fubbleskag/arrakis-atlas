
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LocalGridState, FirestoreGridState, IconType, MapData, UserRole, UserProfile } from '@/types';
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
  getDocs,
  // Removed writeBatch as changeOwner is removed
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
          icons: [],
          notes: '',
        }))
    );
};

const convertLocalToFirestoreGrid = (localGrid: LocalGridState): FirestoreGridState => {
  const firestoreGrid: FirestoreGridState = {};
  localGrid.forEach((row, rIndex) => {
    firestoreGrid[rIndex.toString()] = row;
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
          icons: Array.isArray(cell.icons) ? cell.icons.filter(icon => typeof icon === 'string') : [],
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
  selectMap: (mapId: string | null) => void;
  createMap: (name: string) => Promise<string | null>;
  deleteMap: (mapId: string) => Promise<void>;
  updateMapName: (mapId: string, newName: string) => Promise<void>; // Kept as owner/co-owner can change name
  toggleIconInCell: (rowIndex: number, colIndex: number, icon: IconType) => void;
  clearIconsInCell: (rowIndex: number, colIndex: number) => void;
  updateCellNotes: (rowIndex: number, colIndex: number, notes: string) => void;
  resetCurrentMapGrid: () => void;
  // updateMapSettings: (mapId: string, settings: Partial<Pick<MapData, 'name'>>) => Promise<void>; // Simplified: Only name is a "setting" editable by owner/co-owner
  addCollaborator: (mapId: string, email: string) => Promise<void>; // Role is implicitly 'co-owner'
  removeCollaborator: (mapId: string, collaboratorUid: string) => Promise<void>;
  // updateCollaboratorRole: (mapId: string, collaboratorUid: string, role: UserRole) => Promise<void>; // Removed as only 'co-owner' role besides owner
  // changeOwner: (mapId: string, newOwnerEmail: string) => Promise<void>; // Removed
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth(); // Removed userProfile as it's handled by AuthContext
  const { toast } = useToast();

  const [userMapList, setUserMapList] = useState<MapData[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentMapData, setCurrentMapData] = useState<MapData | null>(null);
  const [currentLocalGrid, setCurrentLocalGrid] = useState<LocalGridState | null>(null);

  const [isLoadingMapList, setIsLoadingMapList] = useState<boolean>(true);
  const [isLoadingMapData, setIsLoadingMapData] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthLoading || !user) {
      setUserMapList([]);
      setCurrentMapId(null); // Clear selected map on logout
      setCurrentMapData(null);
      setCurrentLocalGrid(null);
      setIsLoadingMapList(true); // Set to true initially, false after check
      return;
    }

    setIsLoadingMapList(true);
    const mapsCollectionRef = collection(db, "maps");
    const q = query(mapsCollectionRef, where("memberUIDs", "array-contains", user.uid));

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
        setCurrentMapData(mapData);
        setCurrentLocalGrid(convertFirestoreToLocalGrid(mapData.gridState));
      } else {
        toast({ title: "Error", description: `Map with ID ${currentMapId} not found.`, variant: "destructive" });
        setCurrentMapData(null);
        setCurrentLocalGrid(null);
        setCurrentMapId(null); 
      }
      setIsLoadingMapData(false);
    }, (error) => {
      console.error(`Error fetching map ${currentMapId}:`, error);
      toast({ title: "Error", description: "Could not load selected map data.", variant: "destructive" });
      setIsLoadingMapData(false);
    });

    return () => unsubscribe();
  }, [currentMapId, toast]);

  const selectMap = useCallback((mapId: string | null) => {
    if (mapId === currentMapId) return; 
    setCurrentMapId(mapId);
  }, [currentMapId]);

  const createMap = useCallback(async (name: string): Promise<string | null> => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to create a map.", variant: "destructive" });
      return null;
    }
    setIsLoadingMapData(true);
    const newMapData: Omit<MapData, 'id'> = {
      name,
      ownerId: user.uid,
      memberUIDs: [user.uid],
      collaborators: { [user.uid]: 'owner' },
      // isPublic: false, // Removed
      gridState: convertLocalToFirestoreGrid(initializeLocalGrid()),
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
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
  
  const updateMapInFirestore = useCallback(async (mapId: string, updates: Partial<MapData>) => {
    const mapDocRef = doc(db, "maps", mapId);
    try {
      await setDoc(mapDocRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
    } catch (error: any) {
      console.error("Error updating map in Firestore:", error);
      toast({ title: "Save Error", description: `Could not save map changes: ${error.message}`, variant: "destructive" });
      throw error; 
    }
  }, [toast]);

  const updateCurrentMapGridInFirestore = useCallback(async (newLocalGrid: LocalGridState) => {
    if (!currentMapId) return;
    const newFirestoreGrid = convertLocalToFirestoreGrid(newLocalGrid);
    try {
      await updateMapInFirestore(currentMapId, { gridState: newFirestoreGrid });
    } catch (error) {
       // Error already toasted by updateMapInFirestore
    }
  }, [currentMapId, updateMapInFirestore]);

  const toggleIconInCell = useCallback((rowIndex: number, colIndex: number, icon: IconType) => {
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => {
              if (cIdx === colIndex) {
                const newIcons = [...cell.icons];
                const iconIndex = newIcons.indexOf(icon);
                if (iconIndex > -1) newIcons.splice(iconIndex, 1);
                else newIcons.push(icon);
                return { ...cell, icons: newIcons };
              }
              return cell;
            })
          : row
      );
      updateCurrentMapGridInFirestore(newGrid);
      return newGrid;
    });
  }, [updateCurrentMapGridInFirestore]);

  const clearIconsInCell = useCallback((rowIndex: number, colIndex: number) => {
    setCurrentLocalGrid(prevGrid => {
      if (!prevGrid) return null;
      const newGrid = prevGrid.map((row, rIdx) =>
        rIdx === rowIndex
          ? row.map((cell, cIdx) => (cIdx === colIndex ? { ...cell, icons: [] } : cell))
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
    if (!currentMapId || !user) {
      toast({ title: "Error", description: "No map selected or not authenticated.", variant: "destructive" });
      return;
    }
    const mapData = userMapList.find(m => m.id === currentMapId);
    if (!mapData || (mapData.ownerId !== user.uid && mapData.collaborators[user.uid] !== 'co-owner')) {
        toast({ title: "Permission Denied", description: "You do not have permission to reset this map.", variant: "destructive" });
        return;
    }

    const newLocalGrid = initializeLocalGrid();
    setCurrentLocalGrid(newLocalGrid); 
    try {
      await updateCurrentMapGridInFirestore(newLocalGrid);
      toast({ title: "Map Reset", description: "Current map grid has been reset." });
    } catch (error) {
      // Error handled
    }
  }, [currentMapId, user, userMapList, toast, updateCurrentMapGridInFirestore]);
  
  const deleteMap = useCallback(async (mapId: string) => {
    if (!user) {
        toast({ title: "Error", description: "Authentication required.", variant: "destructive" });
        return;
    }
    const mapToDelete = userMapList.find(m => m.id === mapId);
    if (mapToDelete?.ownerId !== user.uid) {
        toast({ title: "Error", description: "Only the map owner can delete it.", variant: "destructive" });
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
      const mapData = userMapList.find(m => m.id === mapId);
       if (!mapData || (mapData.ownerId !== user.uid && mapData.collaborators[user.uid] !== 'co-owner')) {
           toast({ title: "Permission Denied", description: "You do not have permission to change the map name.", variant: "destructive" });
           return;
       }
      try {
          await updateMapInFirestore(mapId, { name: newName });
          toast({ title: "Success", description: "Map name updated." });
      } catch (error) {
          // Error already handled
      }
  }, [user, userMapList, toast, updateMapInFirestore]);

  const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserProfile;
    }
    return null;
  };

  const addCollaborator = useCallback(async (mapId: string, email: string) => { // Role is implicitly 'co-owner'
    if (!user) { toast({ title: "Error", description: "Authentication required.", variant: "destructive" }); return; }
    
    const mapData = userMapList.find(m => m.id === mapId);
    if (!mapData || mapData.ownerId !== user.uid) { // Only owner can add collaborators
      toast({ title: "Permission Denied", description: "Only the map owner can add collaborators.", variant: "destructive" });
      return;
    }

    const collaboratorUser = await findUserByEmail(email);
    if (!collaboratorUser) {
      toast({ title: "Error", description: `User with email ${email} not found.`, variant: "destructive" });
      return;
    }
    if (collaboratorUser.uid === user.uid) {
      toast({ title: "Error", description: "You cannot add yourself as a collaborator.", variant: "destructive" });
      return;
    }
    if (mapData.collaborators[collaboratorUser.uid]) {
      toast({ title: "Info", description: `${collaboratorUser.displayName || email} is already a collaborator.`, variant: "default" });
      return;
    }

    const newCollaborators = { ...mapData.collaborators, [collaboratorUser.uid]: 'co-owner' as UserRole };
    const newMemberUIDs = Array.from(new Set([...mapData.memberUIDs, collaboratorUser.uid]));

    try {
      await updateMapInFirestore(mapId, { collaborators: newCollaborators, memberUIDs: newMemberUIDs });
      toast({ title: "Success", description: `${collaboratorUser.displayName || email} added as co-owner.` });
    } catch (error) {
      // Error handled
    }
  }, [user, userMapList, toast, updateMapInFirestore]);

  const removeCollaborator = useCallback(async (mapId: string, collaboratorUid: string) => {
     if (!user) { toast({ title: "Error", description: "Authentication required.", variant: "destructive" }); return; }
    
    const mapData = userMapList.find(m => m.id === mapId);
    if (!mapData || mapData.ownerId !== user.uid) { // Only owner can remove collaborators
      toast({ title: "Permission Denied", description: "Only the map owner can remove collaborators.", variant: "destructive" });
      return;
    }
    if (collaboratorUid === mapData.ownerId) {
      toast({ title: "Error", description: "Cannot remove the map owner.", variant: "destructive" });
      return;
    }
    if (!mapData.collaborators[collaboratorUid]) {
      toast({ title: "Error", description: "User is not a collaborator on this map.", variant: "destructive" });
      return;
    }

    const newCollaborators = { ...mapData.collaborators };
    delete newCollaborators[collaboratorUid];
    const newMemberUIDs = mapData.memberUIDs.filter(uid => uid !== collaboratorUid);
    
    try {
      await updateMapInFirestore(mapId, { collaborators: newCollaborators, memberUIDs: newMemberUIDs });
      toast({ title: "Success", description: `Collaborator removed.` });
    } catch (error) {
      // Error handled
    }
  }, [user, userMapList, toast, updateMapInFirestore]);

  return (
    <MapContext.Provider value={{
      userMapList,
      currentMapId,
      currentMapData,
      currentLocalGrid,
      isLoadingMapList,
      isLoadingMapData: isLoadingMapData || (currentMapId ? !currentMapData : false),
      selectMap,
      createMap,
      deleteMap,
      updateMapName,
      toggleIconInCell,
      clearIconsInCell,
      updateCellNotes,
      resetCurrentMapGrid,
      // updateMapSettings, // Removed as only name setting is left, covered by updateMapName
      addCollaborator,
      removeCollaborator,
      // updateCollaboratorRole, // Removed
      // changeOwner, // Removed
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
