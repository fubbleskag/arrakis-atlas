
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
import { useToast } from "@/hooks/use-toast";

export function AuthButton() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();
  const { toast } = useToast();

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
      <Button variant="outline" size="sm" disabled className="w-full justify-start text-left">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading...
      </Button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-left px-2 h-10">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} />
              <AvatarFallback>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle2 className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{user.displayName || user.email || "User Profile"}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" side="top" align="start" forceMount>
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
    <Button onClick={login} variant="outline" size="sm" disabled={isLoading} className="w-full justify-start text-left">
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="mr-2 h-4 w-4" />
      )}
      Login
    </Button>
  );
}
