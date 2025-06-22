
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
  updateUserDisplayName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const updateUserProfileDocument = useCallback(async (currentUser: User) => {
    if (!currentUser) return;
    const userDocRef = doc(db, "users", currentUser.uid);
    try {
      const profileDataForFirestore = {
        email: currentUser.email,
        displayName: currentUser.displayName,
        lastLogin: serverTimestamp(),
      };
      
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
        // If the user object in state is different, update it.
        // This helps reflect profile changes without a full re-auth.
        if (currentUser.displayName !== user?.displayName) {
           setUser(currentUser);
        } else {
           setUser(currentUser);
        }
        
        const freshProfile = await fetchUserProfile(currentUser.uid);
        // If profile doesn't exist or is outdated, create/update it
        if (!freshProfile || freshProfile.displayName !== currentUser.displayName || freshProfile.email !== currentUser.email) {
          await updateUserProfileDocument(currentUser);
        } else {
           setUserProfile(freshProfile);
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
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

  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to update your profile.", variant: "destructive" });
      return;
    }

    try {
      await updateProfile(user, { displayName: newName });
    } catch (error: any) {
       console.error("Error updating Firebase Auth profile:", error);
       toast({ title: "Profile Update Failed", description: `Could not update your display name in authentication: ${error.message}`, variant: "destructive" });
       return;
    }

    const userDocRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userDocRef, {
        displayName: newName
      });
    } catch (error: any) {
        console.error("Error updating Firestore user profile:", error);
        toast({ title: "Profile Update Failed", description: `Could not save your new display name to the database: ${error.message}`, variant: "destructive" });
    }
    
    setUser(prevUser => prevUser ? { ...prevUser, displayName: newName } as User : null);
    setUserProfile(currentProfile => currentProfile ? { ...currentProfile, displayName: newName } : null);
    
    // Manually update the auth.currentUser object as `reload()` can be slow
    if(auth.currentUser) {
        auth.currentUser.displayName = newName;
    }

    toast({ title: "Success", description: "Your display name has been updated." });

  }, [user, toast]);

  return (
    <AuthContext.Provider value={{ user, userProfile, isAuthenticated: !!user, isLoading, login, logout, updateUserDisplayName }}>
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
