"use client";

import { useEffect, useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { Rocket } from 'lucide-react';

// Interval to check for new version, e.g., every 5 minutes
const CHECK_INTERVAL = 1000 * 60 * 5;

export function UpdateNotifier() {
  const { toast } = useToast();
  const [initialBuildId, setInitialBuildId] = useState<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch the initial build ID when the component mounts
    fetch('/_next/BUILD_ID')
      .then((res) => res.text())
      .then((id) => {
        if (id) setInitialBuildId(id);
      })
      .catch((err) => {
        console.error('Could not fetch initial BUILD_ID. Update checks disabled.', err);
      });
  }, []);

  useEffect(() => {
    if (initialBuildId && !intervalRef.current && !isUpdateAvailable) {
      // Once we have the initial build ID, start checking for updates
      intervalRef.current = setInterval(async () => {
        if (document.visibilityState === 'hidden') {
          return; // Don't check if the page is not visible
        }
        try {
          const res = await fetch('/_next/BUILD_ID');
          const latestBuildId = await res.text();
          if (latestBuildId && latestBuildId !== initialBuildId) {
            // New version found, stop checking and set state to show notification
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

    // Cleanup interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initialBuildId, isUpdateAvailable]);

  useEffect(() => {
    if (isUpdateAvailable) {
      toast({
        title: (
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <span className="font-semibold">Update Available</span>
          </div>
        ),
        description: "A new version of Arrakis Atlas is ready. Refresh to get the latest features.",
        duration: Infinity, // Keep the toast until dismissed or acted upon
        action: (
          <ToastAction
            altText="Refresh page"
            onClick={() => window.location.reload()}
          >
            Refresh
          </ToastAction>
        ),
      });
    }
  }, [isUpdateAvailable, toast]);

  return null; // This component does not render anything itself
}
