
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
import { AlertTriangle, MapPin, ChevronDown, ChevronRight } from 'lucide-react'; 
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
  SidebarMenuButton,
  SidebarSeparator,
  SidebarTrigger // If you want a toggle button
} from '@/components/ui/sidebar';


// Approximate constants for layout calculations
const PAGE_INSET_PADDING_VERTICAL = 48; // Sum of top/bottom padding inside SidebarInset (e.g. p-6 top + p-6 bottom)
const PAGE_INSET_PADDING_HORIZONTAL = 48; // Sum of left/right padding inside SidebarInset (e.g. p-6 left + p-6 right)

const SIDE_PANEL_WIDTH = 300; // Width of the right-hand details panel
const SIDE_PANEL_GAP = 24;    // Gap between main content and side panel

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
    isSelector?: 'map' | 'cell';
    content?: React.ReactNode;
  }> = [];

  breadcrumbItems.push({
    key: 'mapsRoot',
    label: 'Maps',
    onClick: () => selectMap(null), 
    isCurrent: !currentMapData,
  });

  if (currentMapData) {
    const mapSelectorContent = userMapList && userMapList.length > 1 ? (
      <Select
        value={currentMapId || ""}
        onValueChange={(value) => { if (value && value !== currentMapId) { selectMap(value); }}}
      >
        <SelectTrigger
          className="p-0 h-auto text-sm font-semibold focus:ring-0 border-none shadow-none bg-transparent truncate w-full data-[placeholder]:text-foreground hover:text-primary/80"
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
      <span className={cn("truncate w-full text-sm font-semibold", !!currentMapData && !focusedCellCoordinates ? "text-foreground" : "text-primary")}>
        {currentMapData.name}
      </span>
    );

    breadcrumbItems.push({
      key: 'map',
      label: currentMapData.name, // Fallback label
      content: mapSelectorContent,
      isCurrent: !!currentMapData && !focusedCellCoordinates,
    });
  }

  if (currentMapData && focusedCellCoordinates) {
    const cellSelectorContent = (
      <Popover open={cellSelectorOpen} onOpenChange={setCellSelectorOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="link"
            className="p-0 h-auto text-sm font-semibold focus:ring-0 border-none shadow-none bg-transparent text-foreground hover:text-foreground/90 data-[placeholder]:text-foreground flex items-center w-full"
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
      label: getCellCoordinateLabel(focusedCellCoordinates.rowIndex, focusedCellCoordinates.colIndex), // Fallback
      content: cellSelectorContent,
      isCurrent: !!focusedCellCoordinates,
    });
  }

  return (
    <nav aria-label="Breadcrumb" className="px-2 py-1 w-full">
      <ol className="flex items-center space-x-0.5 text-sm font-semibold w-full">
        {breadcrumbItems.map((item, index) => (
          <li key={item.key} className="flex items-center space-x-0.5 min-w-0"> {/* min-w-0 for truncation */}
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <div className="truncate"> {/* Added div for truncation */}
              {item.content ? (
                item.content
              ) : item.onClick && !item.isCurrent ? (
                <Button
                  variant="link"
                  onClick={item.onClick}
                  className={cn("p-0 h-auto text-sm font-semibold truncate", "text-primary hover:text-primary/80")}
                >
                  {item.label}
                </Button>
              ) : (
                <span className={cn("truncate text-sm font-semibold", item.isCurrent ? "text-foreground" : "text-primary")}>
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

  // Calculate available dimensions within SidebarInset (which is flex-grow)
  // Assuming SidebarInset has padding (e.g., p-6), those are constants.
  // We use vh/vw for the full viewport and then account for fixed elements.
  const dynamicCanvasHeight = `calc(100vh - ${PAGE_INSET_PADDING_VERTICAL}px)`; // Full viewport height minus inset padding
  
  if (focusedCellCoordinates && currentMapData) {
    const dynamicCanvasWidth = `calc(100% - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px)`; // 100% of SidebarInset's width, minus panel
    const canvasHolderDimension = `min(${dynamicCanvasHeight}, ${dynamicCanvasWidth})`;

    return (
      <div className="flex flex-row w-full h-full items-start justify-center gap-6 p-4 md:p-6"> {/* Ensure HomePageContent itself has padding */}
        <div className="flex-grow flex items-center justify-center h-full">
          <div style={{ width: canvasHolderDimension, height: canvasHolderDimension }} className="relative">
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
          </div>
        </div>
        <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 sticky top-6"> {/* Ensure sticky top matches inset padding */}
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
        </div>
      </div>
    );
  }

  if (currentMapData) {
    const dynamicGridWidth = `calc(100% - ${SIDE_PANEL_WIDTH}px - ${SIDE_PANEL_GAP}px)`; // 100% of SidebarInset's width, minus panel
    const gridHolderDimension = `min(${dynamicCanvasHeight}, ${dynamicGridWidth})`;

    return (
      <div className="flex flex-row w-full h-full items-start justify-center gap-6 p-4 md:p-6">
        <div className="flex-grow flex items-center justify-center h-full">
          <div style={{ width: gridHolderDimension, height: gridHolderDimension }} className="relative">
            {(isLoadingMapData || (currentMapData && !currentLocalGrid)) && (
              <Skeleton className="absolute inset-0 w-full h-full bg-card rounded-lg shadow-xl border border-border" />
            )}
            {(!isLoadingMapData && currentMapData && currentLocalGrid) && (
              <DeepDesertGrid />
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
          </div>
        </div>
        {currentMapData && user && (
          <div className="w-[300px] flex-shrink-0 flex flex-col gap-4 sticky top-6">
            <MapDetailsPanel mapData={currentMapData} currentUser={user} />
          </div>
        )}
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
    <div className="flex h-screen"> {/* Use h-screen for full viewport height */}
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader className="p-2">
          {/* <SidebarTrigger /> Optional toggle button */}
          {/* You can add a logo or app title here if needed */}
        </SidebarHeader>
        <SidebarContent className="p-0"> {/* Remove padding if breadcrumbs/menu handle it */}
          <SidebarMenu>
            <SidebarMenuItem className="p-0"> {/* Remove padding for full-width custom content */}
              <SidebarBreadcrumbs />
            </SidebarMenuItem>
          </SidebarMenu>
          {/* Future sidebar navigation items can go here */}
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-2">
          <AuthButton />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex-grow overflow-auto"> {/* flex-grow and overflow-auto are important */}
        <HomePageContent />
      </SidebarInset>
    </div>
  );
}
