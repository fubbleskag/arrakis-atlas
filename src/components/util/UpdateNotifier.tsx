
"use client";

import { useEffect, useState, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const CHECK_INTERVAL = 1000 * 60 * 5; // 5 minutes

export function UpdateNotifier() {
  const [initialBuildId, setInitialBuildId] = useState<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/_next/BUILD_ID')
      .then((res) => res.text())
      .then((id) => {
        if (id) {
          setInitialBuildId(id);
        }
      })
      .catch((err) => {
        console.error('Could not fetch initial BUILD_ID. Update checks disabled.', err);
      });
  }, []);

  useEffect(() => {
    if (initialBuildId && !intervalRef.current && !isUpdateAvailable) {
      intervalRef.current = setInterval(async () => {
        if (document.visibilityState === 'hidden') {
          return;
        }
        try {
          const res = await fetch('/_next/BUILD_ID');
          const latestBuildId = await res.text();
          if (latestBuildId && latestBuildId !== initialBuildId) {
            setIsUpdateAvailable(true);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
          }
        } catch (err) {
          console.error('Failed to check for new version.', err);
        }
      }, CHECK_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initialBuildId, isUpdateAvailable]);

  if (!initialBuildId) {
    return <Skeleton className="h-5 w-20 mx-auto" />;
  }

  const displayBuildId = initialBuildId.substring(0, 7);

  if (isUpdateAvailable) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-mono w-full h-auto py-1 px-2 text-primary hover:bg-primary/10"
              onClick={() => window.location.reload()}
            >
              <span>{displayBuildId}</span>
              <RefreshCw className="h-3 w-3 animate-spin" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            <p>New version available. Click to refresh.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground/70 py-1">
                    <span>Build: {displayBuildId}</span>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
                <p>You are on the latest version.</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
}
