
"use client";

import { useState, useEffect } from 'react';
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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";

export function AuthButton() {
  const { user, isAuthenticated, isLoading, login, logout, updateUserDisplayName } = useAuth();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [localName, setLocalName] = useState(user?.displayName || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setLocalName(user.displayName);
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
    if (!user || !localName.trim() || localName.trim() === user.displayName) {
      return;
    }
    setIsSaving(true);
    try {
      await updateUserDisplayName(localName.trim());
      setIsDialogOpen(false);
    } catch (error) {
      // Error is handled by context toast
    } finally {
      setIsSaving(false);
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
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription>
              Manage your account details. Your email address is private and not shared with other users.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Address</Label>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div className="space-y-2">
              <Label>Your User ID (for sharing)</Label>
              <div className="flex items-center w-full">
                <span className="text-xs font-mono truncate flex-grow bg-muted px-2 py-1 rounded-md border" title={user.uid}>
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
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2">
            <Button onClick={logout} variant="outline">
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
              <Button
                type="submit"
                onClick={handleSaveName}
                disabled={isSaving || !localName.trim() || localName.trim() === user.displayName}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
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
