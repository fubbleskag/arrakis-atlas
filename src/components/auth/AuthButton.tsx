
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2, UserCircle2, Copy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast"; // Import useToast

export function AuthButton() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { toast } = useToast(); // Initialize toast

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
        .then(() => {
          toast({ title: "UID Copied", description: "Your User ID has been copied to the clipboard." });
        })
        .catch(err => {
          toast({ title: "Copy Failed", description: "Could not copy UID.", variant: "destructive" });
        });
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} />
              <AvatarFallback>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle2 className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end" forceMount> {/* Increased width for UID */}
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.displayName || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="focus:bg-transparent hover:bg-transparent cursor-default flex-col items-start p-2">
            <div className="text-xs text-muted-foreground mb-1">Your User ID (for sharing):</div>
            <div className="flex items-center w-full">
              <span className="text-xs font-mono truncate flex-grow" title={user.uid}>
                {user.uid}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 ml-2 shrink-0"
                onClick={handleCopyUid}
                title="Copy UID"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button onClick={login} variant="outline" size="sm" disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      Login
    </Button>
  );
}
