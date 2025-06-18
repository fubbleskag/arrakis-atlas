
"use client";

import { useState, useEffect } from 'react';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Loader2, MapPin, Settings2, Trash2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { MapData, UserRole } from '@/types';

export function MapManager() {
  const { userMapList, isLoadingMapList, selectMap, createMap, deleteMap, updateMapName, addCollaborator, removeCollaborator, currentMapData: selectedMapFromContext } = useMap();
  const { user } = useAuth();
  const [newMapName, setNewMapName] = useState('');
  const [isCreatingMap, setIsCreatingMap] = useState(false);

  // State for map settings dialog (now just name)
  const [selectedMapForSettings, setSelectedMapForSettings] = useState<MapData | null>(null);
  const [settingsMapName, setSettingsMapName] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
  // State for collaborators dialog
  const [selectedMapForCollabs, setSelectedMapForCollabs] = useState<MapData | null>(null);
  const [collabEmail, setCollabEmail] = useState('');
  const [isManagingCollabs, setIsManagingCollabs] = useState(false);

  // Sync selected map for settings/collabs if context changes (e.g., after updates)
  useEffect(() => {
    if (selectedMapForSettings && selectedMapFromContext && selectedMapFromContext.id === selectedMapForSettings.id) {
        setSelectedMapForSettings(selectedMapFromContext);
        setSettingsMapName(selectedMapFromContext.name);
    }
  }, [selectedMapFromContext, selectedMapForSettings]);

  useEffect(() => {
    if (selectedMapForCollabs && selectedMapFromContext && selectedMapFromContext.id === selectedMapForCollabs.id) {
        setSelectedMapForCollabs(selectedMapFromContext);
    }
  }, [selectedMapFromContext, selectedMapForCollabs]);


  const handleCreateMap = async () => {
    if (!newMapName.trim()) {
      alert("Please enter a map name."); 
      return;
    }
    setIsCreatingMap(true);
    await createMap(newMapName.trim());
    setNewMapName('');
    setIsCreatingMap(false);
  };

  const openSettingsDialog = (map: MapData) => {
    setSelectedMapForSettings(map);
    setSettingsMapName(map.name);
  };

  const handleUpdateNameSetting = async () => {
    if (!selectedMapForSettings || !settingsMapName.trim()) return;
    setIsUpdatingSettings(true);
    await updateMapName(selectedMapForSettings.id, settingsMapName.trim());
    setIsUpdatingSettings(false);
    setSelectedMapForSettings(null); 
  };
  
  const openCollabsDialog = (map: MapData) => {
    setSelectedMapForCollabs(map);
    setCollabEmail('');
  };

  const handleAddCollaborator = async () => {
    if (!selectedMapForCollabs || !collabEmail.trim()) return;
    setIsManagingCollabs(true);
    await addCollaborator(selectedMapForCollabs.id, collabEmail.trim());
    setIsManagingCollabs(false);
    setCollabEmail(''); 
  };

  const handleRemoveCollaborator = async (mapId: string, uid: string) => {
    setIsManagingCollabs(true);
    await removeCollaborator(mapId, uid);
    setIsManagingCollabs(false);
  };

  if (isLoadingMapList) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your maps...</p>
      </div>
    );
  }

  const getRoleDisplayName = (role: UserRole) => {
    if (role === 'owner') return 'Owner';
    if (role === 'co-owner') return 'Co-Owner';
    return 'N/A';
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-semibold text-primary">Your Maps</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Map
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Map</DialogTitle>
              <DialogDescription>
                Give your new Arrakis map a name. You can change this later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                id="mapName"
                placeholder="E.g., Guild Operations - Sector Gamma"
                value={newMapName}
                onChange={(e) => setNewMapName(e.target.value)}
                disabled={isCreatingMap}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={isCreatingMap}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleCreateMap} disabled={isCreatingMap || !newMapName.trim()}>
                {isCreatingMap ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Map
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {userMapList.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <MapPin className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle>No Maps Yet</CardTitle>
            <CardDescription>
              It looks like you haven&apos;t created any maps. Get started by creating your first one!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userMapList.map((map) => (
            <Card key={map.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors mb-1">{map.name}</CardTitle>
                  {/* Removed Public/Private icon */}
                </div>
                <CardDescription>
                  Your Role: <span className="font-medium capitalize">{getRoleDisplayName(map.collaborators[user?.uid || ''])}</span>
                  <br />
                  Last updated {map.updatedAt ? formatDistanceToNow(map.updatedAt.toDate(), { addSuffix: true }) : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">Owner: {map.ownerId === user?.uid ? "You" : "Another user"}</p>
                 <p className="text-sm text-muted-foreground">Co-Owners: {Object.values(map.collaborators).filter(role => role === 'co-owner').length}</p>
              </CardContent>
              <CardFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button onClick={() => selectMap(map.id)} className="w-full sm:w-auto flex-grow">
                  Open Map
                </Button>
                <div className="flex gap-2 w-full sm:w-auto">

                {(map.ownerId === user?.uid || map.collaborators[user?.uid || ''] === 'co-owner') && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" title="Settings" onClick={() => openSettingsDialog(map)}>
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        {selectedMapForSettings && selectedMapForSettings.id === map.id && (
                        <DialogContent>
                            <DialogHeader><DialogTitle>Map Settings: {selectedMapForSettings.name}</DialogTitle></DialogHeader>
                            <Input label="Map Name" value={settingsMapName} onChange={e => setSettingsMapName(e.target.value)} className="my-2" />
                            {/* Removed isPublic checkbox */}
                            {selectedMapForSettings.ownerId === user?.uid && (
                                <Button variant="outline" onClick={() => {setSelectedMapForSettings(null); openCollabsDialog(map);}} className="w-full my-1">Manage Co-Owners</Button>
                            )}
                            {/* Removed Change Owner button */}
                            <DialogFooter>
                                <DialogClose asChild><Button variant="ghost" onClick={() => setSelectedMapForSettings(null)}>Cancel</Button></DialogClose>
                                <Button onClick={handleUpdateNameSetting} disabled={isUpdatingSettings || !settingsMapName.trim()}>
                                {isUpdatingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Settings
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                        )}
                    </Dialog>
                )}

                {map.ownerId === user?.uid && (
                  <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="destructive" size="icon" title="Delete Map">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Delete Map: {map.name}</DialogTitle></DialogHeader>
                        <DialogDescription>Are you sure you want to delete this map? This action cannot be undone.</DialogDescription>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                            <Button variant="destructive" onClick={() => deleteMap(map.id)}>Delete</Button>
                        </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      {/* Collaborators Management Dialog */}
      {selectedMapForCollabs && user && selectedMapForCollabs.ownerId === user.uid && (
        <Dialog open={!!selectedMapForCollabs} onOpenChange={() => setSelectedMapForCollabs(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Manage Co-Owners: {selectedMapForCollabs.name}</DialogTitle></DialogHeader>
            <div className="my-4">
              <h3 className="font-semibold mb-2">Add Co-Owner</h3>
              <div className="flex gap-2 items-center">
                <Input placeholder="Co-Owner's email" value={collabEmail} onChange={e => setCollabEmail(e.target.value)} />
                {/* Role selection removed as it's implicitly 'co-owner' */}
                <Button onClick={handleAddCollaborator} disabled={isManagingCollabs || !collabEmail.trim()}>
                  {isManagingCollabs && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add
                </Button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Current Co-Owners</h3>
              {Object.entries(selectedMapForCollabs.collaborators)
                .filter(([uid, role]) => role === 'co-owner') // Only show co-owners
                .map(([uid, role]) => (
                <div key={uid} className="flex justify-between items-center p-2 border-b">
                  <div>
                    {/* TODO: Get display name from users collection in future enhancement */}
                    <p className="font-medium">UID: {uid.substring(0,6)}...</p> 
                    <p className="text-sm capitalize text-muted-foreground">{getRoleDisplayName(role as UserRole)}</p>
                  </div>
                  {uid !== selectedMapForCollabs.ownerId && ( // Should always be true due to filter
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(selectedMapForCollabs.id, uid)} disabled={isManagingCollabs}>
                      <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                  )}
                </div>
              ))}
               {Object.values(selectedMapForCollabs.collaborators).filter(role => role === 'co-owner').length === 0 && (
                <p className="text-sm text-muted-foreground p-2">No co-owners yet.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMapForCollabs(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
