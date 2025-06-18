
"use client";

import { useState, useEffect } from 'react';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { PlusCircle, Loader2, MapPin, Settings2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import type { MapData } from '@/types';

export function MapManager() {
  const { userMapList, isLoadingMapList, selectMap, createMap, deleteMap, updateMapName, currentMapData: selectedMapFromContext } = useMap();
  const { user } = useAuth();
  const [newMapName, setNewMapName] = useState('');
  const [isCreatingMap, setIsCreatingMap] = useState(false);

  const [selectedMapForSettings, setSelectedMapForSettings] = useState<MapData | null>(null);
  const [settingsMapName, setSettingsMapName] = useState('');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  
  useEffect(() => {
    if (selectedMapForSettings && selectedMapFromContext && selectedMapFromContext.id === selectedMapForSettings.id) {
        setSelectedMapForSettings(selectedMapFromContext);
        setSettingsMapName(selectedMapFromContext.name);
    }
  }, [selectedMapFromContext, selectedMapForSettings]);


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
    if (!selectedMapForSettings || !settingsMapName.trim() || !user) return;
    if (selectedMapForSettings.userId !== user.uid) {
      alert("You don't have permission to change settings for this map.");
      return;
    }
    setIsUpdatingSettings(true);
    await updateMapName(selectedMapForSettings.id, settingsMapName.trim());
    setIsUpdatingSettings(false);
    setSelectedMapForSettings(null); 
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
                placeholder="E.g., My Personal Map"
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
                </div>
                <CardDescription>
                  Last updated {map.updatedAt ? formatDistanceToNow(map.updatedAt.toDate(), { addSuffix: true }) : 'N/A'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {/* Content placeholder, can add map preview or stats later */}
              </CardContent>
              <CardFooter className="flex-col sm:flex-row gap-2 pt-4 border-t">
                <Button onClick={() => selectMap(map.id)} className="w-full sm:w-auto flex-grow">
                  Open Map
                </Button>
                {user && map.userId === user.uid && (
                  <div className="flex gap-2 w-full sm:w-auto">
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
                            <DialogFooter>
                                <DialogClose asChild><Button variant="ghost" onClick={() => setSelectedMapForSettings(null)}>Cancel</Button></DialogClose>
                                <Button onClick={handleUpdateNameSetting} disabled={isUpdatingSettings || !settingsMapName.trim()}>
                                {isUpdatingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Save Settings
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                        )}
                    </Dialog>
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
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
