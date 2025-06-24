
"use client";

import { useState, useEffect } from 'react';
import type { MapData } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useMap } from '@/contexts/MapContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Loader2, LogIn, ExternalLink as LinkExternal } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/firebase/firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

interface JoinPageClientProps {
  providedShareId: string;
}

export function JoinPageClient({ providedShareId }: JoinPageClientProps) {
  const { user, isAuthenticated, isLoading: isAuthLoading, login } = useAuth();
  const { claimEditorInvite, selectMap } = useMap();
  const { toast } = useToast();
  const router = useRouter();

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [isFetchingMap, setIsFetchingMap] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [joinStatus, setJoinStatus] = useState<"idle" | "success" | "error" | "already_member">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!providedShareId) {
      setIsFetchingMap(false);
      return;
    }

    const fetchMapByShareId = async () => {
      setIsFetchingMap(true);
      try {
        const mapsRef = collection(db, "maps");
        const q = query(mapsRef, where("collaboratorShareId", "==", providedShareId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setMapData(null);
        } else {
          const mapDoc = querySnapshot.docs[0];
          const data = { id: mapDoc.id, ...mapDoc.data() } as MapData;
          setMapData(data);
        }
      } catch (error: any) {
        console.error("Error fetching map by share ID:", error);
        toast({
          title: "Database Error",
          description: "Could not fetch map details. A missing database index is a common cause for this issue. Please check the browser console for a link to create it.",
          variant: "destructive",
          duration: 10000,
        });
        setMapData(null);
      } finally {
        setIsFetchingMap(false);
      }
    };

    fetchMapByShareId();
  }, [providedShareId, toast]);

  useEffect(() => {
    if (isAuthenticated && user && mapData && joinStatus === "idle" && !isFetchingMap) {
      if (mapData.ownerId === user.uid || (mapData.editors && mapData.editors.includes(user.uid))) {
        setJoinStatus("already_member");
      }
    }
  }, [isAuthenticated, user, mapData, joinStatus, isFetchingMap]);


  const handleJoinMap = async () => {
    if (!mapData || !user) return;

    setIsLoading(true);
    setErrorMessage(null);
    const success = await claimEditorInvite(mapData.id, providedShareId);
    setIsLoading(false);

    if (success) {
      setJoinStatus("success");
    } else {
      setJoinStatus("error");
      setErrorMessage("Failed to join the map. The invite link might be invalid, expired, or you may not have permission.");
    }
  };

  const navigateToMap = () => {
    selectMap(mapData!.id);
    router.push(`/?mapId=${mapData!.id}`);
  };
  
  if (isFetchingMap || isAuthLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-3" />
                    <CardTitle className="text-2xl">Validating Invite...</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        Please wait while we verify your invitation link.
                    </CardDescription>
                    <Skeleton className="h-10 w-full mt-6" />
                </CardContent>
            </Card>
        </div>
    );
  }

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
