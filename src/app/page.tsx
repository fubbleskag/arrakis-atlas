
"use client"; 

import { AppHeader } from '@/components/AppHeader';
import { DeepDesertGrid } from '@/components/map/DeepDesertGrid';
import { AuthProvider } from '@/contexts/AuthContext';
import { GridProvider } from '@/contexts/GridContext';

export default function Home() {
  return (
    <AuthProvider>
      <GridProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <AppHeader />
          <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center justify-center">
            <DeepDesertGrid />
          </main>
          <footer className="py-4 text-center text-xs text-muted-foreground border-t border-border">
            Arrakis Atlas - Guild Mapping Tool
          </footer>
        </div>
      </GridProvider>
    </AuthProvider>
  );
}
