
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2, UserCircle2, Copy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function AuthButton() {
  const { user, isAuthenticated, isLoading, login, logout, updateDisplayName } = useAuth();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  useEffect(() => {
    if (user?.displayName !== null && user?.displayName !== undefined) {
      setNewDisplayName(user.displayName);
    } else {
      setNewDisplayName('');
    }
  }, [user?.displayName, isDialogOpen]);

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

  const handleSaveName = async () => {
    if (!user || !newDisplayName.trim()) {
      toast({ title: "Invalid Name", description: "Display name cannot be empty.", variant: "destructive" });
      return;
    }
    if (newDisplayName.trim() === (user.displayName || '')) {
      setIsDialogOpen(false);
      return;
    }

    setIsUpdatingName(true);
    await updateDisplayName(newDisplayName.trim());
    setIsUpdatingName(false);
    setIsDialogOpen(false);
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full justify-start text-left px-2 h-10">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || "User"} />
              <AvatarFallback>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle2 className="h-5 w-5" />}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{user.displayName || user.email || "User Profile"}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Your Profile</DialogTitle>
                <DialogDescription>
                    Update your display name. This name is visible to other map collaborators.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input 
                        id="displayName" 
                        value={newDisplayName} 
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        disabled={isUpdatingName}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Email Address</Label>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground italic">Your email is kept private and not shared with other users.</p>
                </div>
                <div className="space-y-2">
                    <Label>Your User ID (for sharing)</Label>
                    <div className="flex items-center w-full">
                      <Input readOnly value={user.uid} className="text-xs font-mono truncate flex-grow bg-muted/50 border-input"/>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 ml-2 shrink-0"
                        onClick={handleCopyUid}
                        title="Copy UID"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                </div>
            </div>
            <DialogFooter className="sm:justify-between gap-2">
                <Button variant="secondary" onClick={logout} className="sm:mr-auto">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                </Button>
                <div className="flex gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="ghost">Cancel</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSaveName} disabled={isUpdatingName || !newDisplayName.trim() || newDisplayName.trim() === (user.displayName || '')}>
                        {isUpdatingName ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Changes
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
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
