
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
          <SidebarMenuButton disabled>
              <HelpCircle />
              <span>Help</span>
          </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
          <SidebarMenuButton disabled>
              <BookText />
              <span>Changelog</span>
          </SidebarMenuButton>
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
    isLoadingMapList
  } = useMap();

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
        <AlertTriangle className="h-16 w-16 text-primary" />
        <h2 className="text-2xl font-semibold">Authentication Required</h2>
        <p className="text-muted-foreground"> Please log in to create, view, and interact with Arrakis Atlas maps. </p>
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
