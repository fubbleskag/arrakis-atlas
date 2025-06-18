
"use client";

import { AuthButton } from '@/components/auth/AuthButton';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export function AppHeader() {
  const { currentMapData, selectMap, currentMapId } = useMap();

  return (
    <header className="py-4 px-6 border-b border-border">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-4">
          {currentMapId && (
            <Button variant="outline" size="sm" onClick={() => selectMap(null)} title="Back to Map List">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Maps
            </Button>
          )}
          <h1 className="text-xl md:text-2xl font-headline font-semibold text-primary truncate max-w-[200px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg">
            {currentMapData ? currentMapData.name : "Arrakis Atlas"}
          </h1>
        </div>
        <AuthButton />
      </div>
    </header>
  );
}
