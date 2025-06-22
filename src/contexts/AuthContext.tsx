
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, updateProfile } from 'firebase/auth';
import { auth, googleProvider, db } from '@/firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const updateUserProfileDocument = useCallback(async (currentUser: User, isNewUser: boolean = false) => {
    if (!currentUser) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      const profileDataForFirestore: { email: string | null; displayName: string | null; lastLogin: any; createdAt?: any; } = {
        email: currentUser.email,
        displayName: currentUser.displayName,
        lastLogin: serverTimestamp(),
      };
      
      if (isNewUser) {
        profileDataForFirestore.createdAt = serverTimestamp();
      }
      
      await setDoc(userDocRef, profileDataForFirestore, { merge: true });

      const localProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
      };
      setUserProfile(localProfile);

    } catch (error: any) {
      console.error("Error updating user profile document:", error);
      toast({
        title: "Profile Error",
        description: "Could not update user profile information.",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  const fetchUserProfile = useCallback(async (uid: string): Promise<UserProfile | null> => {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      return {
        uid: uid,
        email: data.email || null,
        displayName: data.displayName || null,
        lastLogin: data.lastLogin instanceof Timestamp ? data.lastLogin : undefined,
      };
    }
    return null;
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        await updateUserProfileDocument(currentUser, !userDoc.exists());
        const freshProfile = await fetchUserProfile(currentUser.uid);
        setUserProfile(freshProfile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [updateUserProfileDocument, fetchUserProfile, user?.displayName]);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred during login.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error("Firebase logout error:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred during logout.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [toast]);
  
  const updateDisplayName = useCallback(async (newName: string) => {
    if (!auth.currentUser) {
        toast({ title: "Error", description: "You must be logged in to update your name.", variant: "destructive" });
        return;
    }
    const currentUser = auth.currentUser;
    const trimmedNewName = newName.trim();

    try {
        await updateProfile(currentUser, { displayName: trimmedNewName });
        
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, { displayName: trimmedNewName });

        await currentUser.reload();
        const refreshedUser = auth.currentUser;
        setUser(refreshedUser);
        if (refreshedUser) {
           const profile = await fetchUserProfile(refreshedUser.uid);
           setUserProfile(profile);
        }

        toast({ title: "Success", description: "Your display name has been updated." });
    } catch (error: any) {
        console.error("Error updating display name:", error);
        toast({ title: "Update Failed", description: error.message || "Could not update display name.", variant: "destructive" });
    }
  }, [toast, fetchUserProfile]);

  return (
    <AuthContext.Provider value={{ user, userProfile, isAuthenticated: !!user, isLoading, login, logout, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
