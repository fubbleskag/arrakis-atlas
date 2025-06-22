"use client";

import React from 'react';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { MapManager } from '@/components/map/MapManager';
import { IconSourcePalette } from '@/components/map/IconSourcePalette';
import { DetailedCellEditorCanvas } from '@/components/map/DetailedCellEditorCanvas';
import { MarkerEditorPanel } from '@/components/map/MarkerEditorPanel';
import { MapDetailsPanel } from '@/components/map/MapDetailsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, LayoutGrid, HelpCircle, BookText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/auth/AuthButton';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const SIDE_PANEL_WIDTH_CLASS = "w-[300px]";

function AppMenu() {
  const { selectMap, currentMapId } = useMap();
  
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton onClick={() => selectMap(null)} isActive={!currentMapId}>
          <LayoutGrid />
          <span>Maps</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <Dialog>
          <DialogTrigger asChild>
            <SidebarMenuButton>
              <HelpCircle />
              <span>Help</span>
            </SidebarMenuButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Help & Getting Started</DialogTitle>
              <DialogDescription>
                A quick guide to using the Arrakis Atlas.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 text-sm text-muted-foreground">
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">Welcome!</h3>
                  <p>Arrakis Atlas is a collaborative tool for mapping the world of Dune: Awakening. Create maps, mark points of interest, and share them with your guild.</p>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">The Basics</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Map Manager:</strong> The "Maps" view is your home base. From here, you can create new maps or select an existing one to view and edit.</li>
                    <li><strong>The Grid:</strong> The main 9x9 grid represents the deep desert. Click any cell to zoom in and view its detailed contents.</li>
                    <li><strong>Returning Home:</strong> To return to the Map Manager from a map view, click the "Maps" button in the sidebar menu.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">Editing a Cell</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Adding Markers:</strong> When zoomed into a cell, drag icons from the "Markers" list in the right-hand panel onto the canvas.</li>
                    <li><strong>Editing Markers:</strong> Click on a placed marker to open the Marker Editor Panel. Here you can add notes specific to that marker or adjust its precise coordinates.</li>
                    <li><strong>Cell Notes & Background:</strong> The right-hand panel also allows you to add general notes for the cell or upload a custom background image.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">Collaboration & Sharing</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Map Settings:</strong> As an owner, click the gear icon (Settings) on a map to manage its name, add editors, and configure sharing links.</li>
                    <li><strong>Editor Invite Links:</strong> Generate a unique link to invite other users to edit your map.</li>
                    <li><strong>Public View Links:</strong> Generate a public, view-only link to share your map with anyone, even if they don't have an account.</li>
                  </ul>
                </div>
                 <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">Keyboard Shortcuts</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Toggle Sidebar:</strong> Press `Cmd + B` (on Mac) or `Ctrl + B` (on Windows) to quickly show or hide the sidebar menu.</li>
                    <li><strong>Navigate Back:</strong> Press the `Escape` key to close views in reverse order:
                      <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>Closes the Marker Editor Panel.</li>
                        <li>Closes the detailed Cell View.</li>
                        <li>Closes the Map View and returns to the Map Manager.</li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <Dialog>
          <DialogTrigger asChild>
            <SidebarMenuButton>
              <BookText />
              <span>Changelog</span>
            </SidebarMenuButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Application Changelog</DialogTitle>
              <DialogDescription>
                A record of recent updates and new features for Arrakis Atlas.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6 text-sm">
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">June 22, 2024</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Implemented tracking and display of which editor last updated a map.</li>
                    <li>Allowed users to edit their display name.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">June 20, 2024</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Implemented feature allowing editors to remove themselves from shared maps.</li>
                    <li>Added keyboard shortcuts for navigation (`Escape` to close panels/views, `Cmd/Ctrl + B` to toggle sidebar).</li>
                    <li>Increased overall grid and individual cell sizes for better usability.</li>
                    <li>Enhanced sharing functionality for both public view-only and collaborator invite links.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">June 19, 2024</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Streamlined UI by converting action buttons to icon-only buttons with tooltips.</li>
                    <li>Added distinct border colors for PVE/PVP zone demarcation on the grid.</li>
                    <li>Implemented public view-only functionality.</li>
                    <li>Corrected typo for 'Stravidium' resource.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-base text-foreground mb-2">June 18, 2024</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Initial version of the Arrakis Atlas application.</li>
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}


function HomePageContent() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    currentMapId,
    currentMapData,
    currentLocalGrid,
    isLoadingMapData,
    focusedCellCoordinates,
    selectMap,
    selectedPlacedIconId,
    userMapList,
    isLoadingMapList,
    setSelectedPlacedIconId,
    setFocusedCellCoordinates,
  } = useMap();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (selectedPlacedIconId) {
          setSelectedPlacedIconId(null);
        } else if (focusedCellCoordinates) {
          setFocusedCellCoordinates(null);
        } else if (currentMapId) {
          selectMap(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedPlacedIconId, 
    focusedCellCoordinates, 
    currentMapId, 
    setSelectedPlacedIconId, 
    setFocusedCellCoordinates, 
    selectMap
  ]);

  const overallLoading = isAuthLoading || isLoadingMapList || (currentMapId && isLoadingMapData && !currentMapData);
  const showMapManager = !currentMapId && !isLoadingMapList && isAuthenticated && !isAuthLoading;

  if (overallLoading && !currentMapData && (!userMapList || userMapList.length === 0) && !showMapManager) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-6">
        <Skeleton className="h-12 w-1/2 mb-4" /> <Skeleton className="h-8 w-1/3 mb-8" /> <Skeleton className="w-full max-w-md h-64" />
      </div>
    );
  }

  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 flex-grow">
        <LayoutGrid className="h-16 w-16 text-primary" />
        <h2 className="text-2xl font-semibold">Welcome to Arrakis Atlas</h2>
        <p className="text-muted-foreground max-w-md">
          The collaborative mapping tool for Dune: Awakening. Plan your expeditions, mark resources, and share your discoveries with your guild.
        </p>
        <p className="text-muted-foreground">Please log in to get started.</p>
      </div>
    );
  }

  if (showMapManager) {
    return <MapManager />;
  }

  if (currentMapData) {
    return (
      <div className="flex flex-row w-full h-full items-stretch justify-start gap-x-6 p-4 md:p-6">
        <div className="flex-grow flex items-center justify-center h-full min-w-0">
          <div className="aspect-square h-full w-auto max-w-full relative">
            {focusedCellCoordinates && currentMapData ? (
              <>
                {(isLoadingMapData || !currentLocalGrid) && (
                  <Skeleton className="absolute inset-0 w-full h-full bg-card rounded-lg shadow-xl border border-border"/>
                )}
                {(!isLoadingMapData && currentLocalGrid) && (
                  <DetailedCellEditorCanvas
                    rowIndex={focusedCellCoordinates.rowIndex}
                    colIndex={focusedCellCoordinates.colIndex}
                    className="w-full h-full"
                  />
                )}
              </>
            ) : (
              <>
                {(isLoadingMapData || (currentMapData && !currentLocalGrid)) && (
                  <Skeleton className="absolute inset-0 w-full h-full bg-card rounded-lg shadow-xl border border-border" />
                )}
                {(!isLoadingMapData && currentMapData && currentLocalGrid) && (
                  <DeepDesertGrid className="w-full h-full" />
                )}
                {(!isLoadingMapData && currentMapData && !currentLocalGrid && isAuthenticated) && (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4 bg-card rounded-lg shadow-xl border border-destructive">
                    <AlertTriangle className="h-16 w-16 text-destructive" />
                    <h2 className="text-2xl font-semibold text-destructive-foreground">Map Data Error</h2>
                    <p className="text-muted-foreground">
                      Map data is unavailable or corrupted. This map may not exist or you might not have access.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className={cn(SIDE_PANEL_WIDTH_CLASS, "flex-shrink-0 flex flex-col gap-4 sticky top-6")}>
          {focusedCellCoordinates && currentMapData ? (
            <>
              <IconSourcePalette
                rowIndex={focusedCellCoordinates.rowIndex}
                colIndex={focusedCellCoordinates.colIndex}
              />
              {selectedPlacedIconId && currentLocalGrid && (
                <MarkerEditorPanel
                  rowIndex={focusedCellCoordinates.rowIndex}
                  colIndex={focusedCellCoordinates.colIndex}
                />
              )}
            </>
          ) : (
            currentMapData && user && <MapDetailsPanel mapData={currentMapData} currentUser={user} />
          )}
        </div>
      </div>
    );
  }

  if (isAuthenticated && !isAuthLoading && !isLoadingMapList && !currentMapId) {
     return (
      <div className="flex flex-col items-center justify-center flex-grow p-6">
        <LayoutGrid className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-2xl font-semibold">No Map Selected</h2>
        <p className="text-muted-foreground">Please select a map or create a new one.</p>
        <Button onClick={() => selectMap(null)} variant="link" className="mt-2">Go to Map Manager</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-grow p-6">
      <Skeleton className="h-12 w-1/2 mb-4" /> <Skeleton className="h-8 w-1/3 mb-8" /> <Skeleton className="w-full max-w-md h-64" />
      <p className="text-muted-foreground mt-4">Loading map information...</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex h-screen">
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader className="p-2">
        </SidebarHeader>
        <SidebarContent className="p-2">
          <AppMenu />
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-2">
          <AuthButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex-grow overflow-auto">
        <HomePageContent />
      </SidebarInset>
    </div>
  );
}
