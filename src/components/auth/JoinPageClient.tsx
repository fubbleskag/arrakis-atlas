
"use client";

import { useState, useEffect } from 'react';
import type { MapData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, LogIn, ExternalLink as LinkExternal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // For redirecting

interface JoinPageClientProps {
  mapData: MapData | null;
  providedShareId: string;
}

export function JoinPageClient({ mapData: initialMapData, providedShareId }: JoinPageClientProps) {
  const { user, isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const { claimEditorInvite, selectMap } = useMap();
  const router = useRouter();

  const [mapData, setMapData] = useState(initialMapData);
  const [isLoading, setIsLoading] = useState(false);
  const [joinStatus, setJoinStatus] = useState<"idle" | "success" | "error" | "already_member">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setMapData(initialMapData); // Update local state if props change (e.g., on re-render)
    setJoinStatus("idle"); // Reset status if mapData changes (e.g. navigating between join links)
    setErrorMessage(null);
  }, [initialMapData]);

  const handleJoinMap = async () => {
    if (!mapData || !user) return;

    setIsLoading(true);
    setErrorMessage(null);
    const success = await claimEditorInvite(mapData.id, providedShareId);
    setIsLoading(false);

    if (success) {
      setJoinStatus("success");
      // Optional: redirect to map after a short delay or offer a button
      // selectMap(mapData.id); // Selects the map in context
      // router.push(`/?mapId=${mapData.id}`); // Redirects
    } else {
      setJoinStatus("error");
      // Error message is usually set by toast in claimEditorInvite, but can set specific one here if needed
      setErrorMessage("Failed to join the map. The invite link might be invalid, expired, or you may not have permission.");
    }
  };

  useEffect(() => {
    // Check if user is already owner or editor once authenticated and mapData is available
    if (isAuthenticated && user && mapData && joinStatus === "idle") {
      if (mapData.ownerId === user.uid || (mapData.editors && mapData.editors.includes(user.uid))) {
        setJoinStatus("already_member");
      }
    }
  }, [isAuthenticated, user, mapData, joinStatus]);

  if (!mapData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
            <CardTitle className="text-2xl">Invalid Invite Link</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              The invite link you used is invalid, has expired, or the map no longer exists.
              Please check the link or contact the map owner.
            </CardDescription>
            <Button asChild className="mt-6">
              <Link href="/">Go to Homepage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const navigateToMap = () => {
    selectMap(mapData.id);
    router.push(`/?mapId=${mapData.id}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          {joinStatus === "success" && <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />}
          {joinStatus === "already_member" && <CheckCircle2 className="mx-auto h-12 w-12 text-primary mb-3" />}
          {(joinStatus === "idle" || joinStatus === "error") && !isAuthenticated && <AlertCircle className="mx-auto h-12 w-12 text-primary mb-3" /> }
          {(joinStatus === "idle" || joinStatus === "error") && isAuthenticated && <AlertCircle className="mx-auto h-12 w-12 text-primary mb-3" /> }
          {joinStatus === "error" && errorMessage && <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" /> }
          
          <CardTitle className="text-2xl">
            {joinStatus === "success" ? "Successfully Joined!" : 
             joinStatus === "already_member" ? "Map Access Confirmed" : 
             `Join Map: ${mapData.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <>
              <CardDescription>
                You&apos;ve been invited to collaborate on the map: <strong>{mapData.name}</strong>.
                Please log in to accept the invitation.
              </CardDescription>
              <Button onClick={login} disabled={isAuthLoading} className="w-full">
                {isAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                Log In to Join
              </Button>
            </>
          ) : joinStatus === "already_member" ? (
            <>
              <CardDescription>
                You already have access to the map: <strong>{mapData.name}</strong>.
              </CardDescription>
              <Button onClick={navigateToMap} className="w-full">
                <LinkExternal className="mr-2 h-4 w-4" /> Go to Map
              </Button>
            </>
          ) : joinStatus === "success" ? (
             <>
              <CardDescription>
                You are now an editor for the map: <strong>{mapData.name}</strong>!
              </CardDescription>
              <Button onClick={navigateToMap} className="w-full">
                <LinkExternal className="mr-2 h-4 w-4" /> Go to Map
              </Button>
            </>
          ) : ( // idle or error state for authenticated user
            <>
              <CardDescription>
                You&apos;ve been invited by the owner of <strong>{mapData.name}</strong> to become an editor.
              </CardDescription>
              {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
              <Button onClick={handleJoinMap} disabled={isLoading || isAuthLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Accept Invitation & Join Map"}
              </Button>
            </>
          )}
           <Button variant="link" asChild className="mt-4">
              <Link href="/">Go to Homepage</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

