
"use client";

import React from 'react';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { MapManager } from '@/components/map/MapManager';
import { IconSourcePalette } from '@/components/map/IconSourcePalette';
import { DetailedCellEditorCanvas } from '@/components/map/DetailedCellEditorCanvas';
import { MarkerEditorPanel } from '@/components/map/MarkerEditorPanel';
import { MapDetailsPanel } from '@/components/map/MapDetailsPanel';
import { useMap } from '@/contexts/MapContext';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthButton } from '@/components/auth/AuthButton';
import { MiniCellSelectorGrid } from '@/components/map/MiniCellSelectorGrid';
import { cn } from '@/lib/utils';
import { GRID_SIZE } from '@/lib/mapUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';


const SIDE_PANEL_WIDTH_CLASS = "w-[300px]";

function SidebarBreadcrumbs() {
  const {
    currentMapData,
    selectMap,
    focusedCellCoordinates,
    setFocusedCellCoordinates,
    userMapList,
    currentMapId
  } = useMap();

  const [cellSelectorOpen, setCellSelectorOpen] = React.useState(false);

  const getCellCoordinateLabel = (rowIndex: number, colIndex: number): string => {
    const rowLetter = String.fromCharCode(65 + (GRID_SIZE - 1 - rowIndex));
    const colNumber = colIndex + 1;
    return `${rowLetter}-${colNumber}`;
  };

  const breadcrumbItems: Array<{
    key: string;
    label: string;
    onClick?: () => void;
    isCurrent: boolean;
    content?: React.ReactNode;
    level: number; // 0 for root, 1 for map, 2 for cell
  }> = [];

  breadcrumbItems.push({
    key: 'mapsRoot',
    label: 'Maps',
    onClick: () => { selectMap(null); setFocusedCellCoordinates(null); },
    isCurrent: !currentMapData,
    level: 0,
  });

  if (currentMapData) {
    const mapSelectorContent = userMapList && userMapList.length > 1 ? (
      <Select
        value={currentMapId || ""}
        onValueChange={(value) => {
          if (value && value !== currentMapId) {
            selectMap(value);
          }
        }}
      >
        <SelectTrigger
          className="p-0 h-auto text-sm font-semibold focus:ring-0 border-none shadow-none bg-transparent truncate w-full data-[placeholder]:text-foreground hover:text-primary/80 text-left justify-start"
          aria-label="Switch map"
        >
          <SelectValue placeholder={currentMapData.name} />
        </SelectTrigger>
        <SelectContent>
          {userMapList.map((map) => (
            <SelectItem key={map.id} value={map.id}>
              {map.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : (
      <Button
        variant="link"
        onClick={() => setFocusedCellCoordinates(null)}
        className={cn(
          "p-0 h-auto text-sm font-semibold truncate w-full text-left justify-start",
          !!currentMapData && !focusedCellCoordinates ? "text-foreground" : "text-primary hover:text-primary/80"
        )}
      >
        {currentMapData.name}
      </Button>
    );

    breadcrumbItems.push({
      key: 'map',
      label: currentMapData.name,
      content: mapSelectorContent,
      isCurrent: !!currentMapData && !focusedCellCoordinates,
      level: 1,
    });
  }

  if (currentMapData && focusedCellCoordinates) {
    const cellSelectorContent = (
      <Popover open={cellSelectorOpen} onOpenChange={setCellSelectorOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="link"
            className="p-0 h-auto text-sm font-semibold focus:ring-0 border-none shadow-none bg-transparent text-foreground hover:text-foreground/90 data-[placeholder]:text-foreground flex items-center w-full text-left justify-start"
            aria-label="Switch cell"
          >
            {getCellCoordinateLabel(focusedCellCoordinates.rowIndex, focusedCellCoordinates.colIndex)} <ChevronDown className="ml-1 h-3 w-3 opacity-70 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 border-none shadow-xl mt-1" align="start" sideOffset={5}>
          <MiniCellSelectorGrid
            currentFocusedCell={focusedCellCoordinates}
            onCellSelect={(coords) => {
              if (coords.rowIndex !== focusedCellCoordinates.rowIndex || coords.colIndex !== focusedCellCoordinates.colIndex) {
                setFocusedCellCoordinates(coords);
              }
              setCellSelectorOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    );
    breadcrumbItems.push({
      key: 'cell',
      label: getCellCoordinateLabel(focusedCellCoordinates.rowIndex, focusedCellCoordinates.colIndex),
      content: cellSelectorContent,
      isCurrent: !!focusedCellCoordinates,
      level: 2,
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="px-2 py-1 w-full">
      <ol className="flex flex-col items-start space-y-1 w-full">
        {breadcrumbItems.map((item) => (
          <li key={item.key} className={cn(
            "flex items-center w-full min-w-0",
            item.level === 1 && "pl-3", // Indent map name
            item.level === 2 && "pl-6"  // Indent cell name
          )}>
            <div className="truncate w-full">
              {item.content ? (
                item.content
              ) : item.onClick && !item.isCurrent ? (
                <Button
                  variant="link"
                  onClick={item.onClick}
                  className={cn(
                    "p-0 h-auto text-sm font-semibold truncate w-full text-left justify-start",
                    item.isCurrent ? "text-foreground cursor-default" : "text-primary hover:text-primary/80"
                  )}
                >
                  {item.label}
                </Button>
              ) : (
                <span className={cn(
                  "truncate text-sm font-semibold block w-full text-left",
                  item.isCurrent ? "text-foreground" : "text-primary"
                )}>
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
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
          <div className="aspect-square w-auto h-auto max-w-full max-h-full relative">
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
        <MapPin className="h-12 w-12 text-primary mb-4" />
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
        <SidebarContent className="p-0">
          <SidebarMenu>
            <SidebarMenuItem className="p-0">
              <SidebarBreadcrumbs />
            </SidebarMenuItem>
          </SidebarMenu>
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
