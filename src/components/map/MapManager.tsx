
"use client";

import { useState } from 'react';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Loader2, MapPin, Edit3, Trash2, Settings2, Users, Eye, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { MapData, UserRole } from '@/types';

export function MapManager() {
  const { userMapList, isLoadingMapList, selectMap, createMap, deleteMap, updateMapSettings, addCollaborator, removeCollaborator, updateCollaboratorRole, changeOwner } = useMap();
  const { user } = useAuth();
  const [newMapName, setNewMapName] = useState('');
  const [isCreatingMap, setIsCreatingMap] = useState(false);

  // State for map settings dialog
  const [selectedMapForSettings, setSelectedMapForSettings] = useState<MapData | null>(null);
  const [settingsMapName, setSettingsMapName] = useState('');
  const [settingsIsPublic, setSettingsIsPublic] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
  // State for collaborators dialog
  const [selectedMapForCollabs, setSelectedMapForCollabs] = useState<MapData | null>(null);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabRole, setCollabRole] = useState<UserRole>('associate');
  const [isManagingCollabs, setIsManagingCollabs] = useState(false);

  // State for owner change dialog
  const [selectedMapForOwner, setSelectedMapForOwner] = useState<MapData | null>(null);
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [isChangingOwner, setIsChangingOwner] = useState(false);


  const handleCreateMap = async () => {
    if (!newMapName.trim()) {
      alert("Please enter a map name."); // Replace with toast later
      return;
    }
    setIsCreatingMap(true);
    await createMap(newMapName.trim());
    setNewMapName('');
    setIsCreatingMap(false);
    // Dialog will close if DialogClose is used, or manage open state manually
  };

  const openSettingsDialog = (map: MapData) => {
    setSelectedMapForSettings(map);
    setSettingsMapName(map.name);
    setSettingsIsPublic(map.isPublic);
  };

  const handleUpdateSettings = async () => {
    if (!selectedMapForSettings || !user) return;
    if (selectedMapForSettings.ownerId !== user.uid && selectedMapForSettings.collaborators[user.uid] !== 'co-owner') {
        alert("Permission denied."); return;
    }
    setIsUpdatingSettings(true);
    await updateMapSettings(selectedMapForSettings.id, { name: settingsMapName, isPublic: settingsIsPublic });
    setIsUpdatingSettings(false);
    setSelectedMapForSettings(null); // Close dialog
  };
  
  const openCollabsDialog = (map: MapData) => {
    setSelectedMapForCollabs(map);
    setCollabEmail('');
    setCollabRole('associate');
  };

  const handleAddCollaborator = async () => {
    if (!selectedMapForCollabs || !collabEmail.trim()) return;
    setIsManagingCollabs(true);
    await addCollaborator(selectedMapForCollabs.id, collabEmail.trim(), collabRole);
    setIsManagingCollabs(false);
    setCollabEmail(''); 
    // Consider refetching map data or relying on snapshot for UI update. Dialog might need manual close or conditional rendering.
  };

  const handleRemoveCollaborator = async (mapId: string, uid: string) => {
    setIsManagingCollabs(true);
    await removeCollaborator(mapId, uid);
    setIsManagingCollabs(false);
    // Dialog might need manual close or conditional rendering if last collab removed.
  };

  const handleUpdateCollaboratorRole = async (mapId: string, uid: string, role: UserRole) => {
     setIsManagingCollabs(true);
     await updateCollaboratorRole(mapId, uid, role);
     setIsManagingCollabs(false);
  };

  const openOwnerChangeDialog = (map: MapData) => {
    setSelectedMapForOwner(map);
    setNewOwnerEmail('');
  };

  const handleChangeOwner = async () => {
    if(!selectedMapForOwner || !newOwnerEmail.trim()) return;
    setIsChangingOwner(true);
    await changeOwner(selectedMapForOwner.id, newOwnerEmail.trim());
    setIsChangingOwner(false);
    setSelectedMapForOwner(null); // Close dialog
  };

  if (isLoadingMapList) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your maps...</p>
      </div>
    );
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
                  {map.isPublic ? <Globe className="h-5 w-5 text-blue-500" title="Publicly Visible" /> : <Eye className="h-5 w-5 text-muted-foreground" title="Private" />}
                </div>
                <CardDescription>
                  Role: <span className="font-medium capitalize">{map.collaborators[user?.uid || ''] || (map.isPublic ? 'Public Viewer' : 'N/A')}</span>
                  <br />
                  Last updated {map.updatedAt ? formatDistanceToNow(map.updatedAt.toDate(), { addSuffix: true }) : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Placeholder for map preview or more stats if needed */}
                <p className="text-sm text-muted-foreground">Owner: {map.ownerId === user?.uid ? "You" : "Another user"}</p>
                <p className="text-sm text-muted-foreground">Collaborators: {Object.keys(map.collaborators).length -1}</p>

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
                            <div className="flex items-center space-x-2 my-2">
                                <Input type="checkbox" id={`isPublic-${map.id}`} checked={settingsIsPublic} onCheckedChange={checked => setSettingsIsPublic(!!checked)} />
                                <label htmlFor={`isPublic-${map.id}`}>Publicly Visible</label>
                            </div>
                            {(selectedMapForSettings.ownerId === user?.uid) && (
                                <>
                                <Button variant="outline" onClick={() => {setSelectedMapForSettings(null); openCollabsDialog(map);}} className="w-full my-1">Manage Collaborators</Button>
                                <Button variant="outline" onClick={() => {setSelectedMapForSettings(null); openOwnerChangeDialog(map);}} className="w-full my-1">Change Owner</Button>
                                </>
                            )}
                            <DialogFooter>
                                <DialogClose asChild><Button variant="ghost" onClick={() => setSelectedMapForSettings(null)}>Cancel</Button></DialogClose>
                                <Button onClick={handleUpdateSettings} disabled={isUpdatingSettings}>
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
      {selectedMapForCollabs && (
        <Dialog open={!!selectedMapForCollabs} onOpenChange={() => setSelectedMapForCollabs(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Manage Collaborators: {selectedMapForCollabs.name}</DialogTitle></DialogHeader>
            <div className="my-4">
              <h3 className="font-semibold mb-2">Add Collaborator</h3>
              <div className="flex gap-2 items-center">
                <Input placeholder="Collaborator's email" value={collabEmail} onChange={e => setCollabEmail(e.target.value)} />
                <select value={collabRole} onChange={e => setCollabRole(e.target.value as UserRole)} className="border p-2 rounded">
                  <option value="associate">Associate</option>
                  <option value="co-owner">Co-Owner</option>
                </select>
                <Button onClick={handleAddCollaborator} disabled={isManagingCollabs || !collabEmail.trim()}>
                  {isManagingCollabs && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Add
                </Button>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Current Collaborators</h3>
              {Object.entries(selectedMapForCollabs.collaborators).map(([uid, role]) => (
                <div key={uid} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <p className="font-medium">{/* TODO: Get display name from users collection */}UID: {uid.substring(0,6)}...</p>
                    <p className="text-sm capitalize text-muted-foreground">{role}</p>
                  </div>
                  {uid !== selectedMapForCollabs.ownerId && (
                    <div className="flex gap-1">
                       <select 
                          value={role} 
                          onChange={e => handleUpdateCollaboratorRole(selectedMapForCollabs.id, uid, e.target.value as UserRole)}
                          className="border p-1 rounded text-xs"
                          disabled={isManagingCollabs}
                        >
                          <option value="associate">Associate</option>
                          <option value="co-owner">Co-Owner</option>
                        </select>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(selectedMapForCollabs.id, uid)} disabled={isManagingCollabs}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMapForCollabs(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
       {/* Owner Change Dialog */}
      {selectedMapForOwner && (
        <Dialog open={!!selectedMapForOwner} onOpenChange={() => setSelectedMapForOwner(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Change Owner for: {selectedMapForOwner.name}</DialogTitle></DialogHeader>
            <DialogDescription className="my-2">
                Transfer ownership of this map. The new owner must have an Arrakis Atlas account. You will become a co-owner.
            </DialogDescription>
            <Input placeholder="New owner's email" value={newOwnerEmail} onChange={e => setNewOwnerEmail(e.target.value)} className="my-4"/>
            <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedMapForOwner(null)}>Cancel</Button>
                <Button onClick={handleChangeOwner} disabled={isChangingOwner || !newOwnerEmail.trim()}>
                    {isChangingOwner && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Transfer Ownership
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
