
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut, type UserInfo } from 'firebase/auth';
import { auth, googleProvider, db } from '@/firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore'; // Added Timestamp
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null; // This will represent the data from /users/{uid}
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
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
      // Data to write to Firestore (uid is the doc ID, not a field)
      const profileDataForFirestore = {
        email: currentUser.email,
        displayName: currentUser.displayName,
        lastLogin: serverTimestamp(), // Firestore will convert this to Timestamp
      };
      
      await setDoc(userDocRef, profileDataForFirestore, { merge: true });

      // For local context, create UserProfile including the UID
      // Note: serverTimestamp() resolves on the server. For immediate local state,
      // you might use new Date() or fetch the doc after write if precise lastLogin is needed locally.
      // However, for this app's current needs, this approximation for local state is fine.
      const localProfile: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        // lastLogin will be a server timestamp in Firestore.
        // For local context, it might be undefined until fetched or represented differently.
        // For simplicity, we'll leave it potentially undefined or handle as needed.
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
      setUser(currentUser);
      if (currentUser) {
        await updateUserProfileDocument(currentUser); // Creates or updates profile in Firestore
        // Optionally fetch to get server-resolved timestamps if needed immediately in userProfile state
        // const freshProfile = await fetchUserProfile(currentUser.uid);
        // setUserProfile(freshProfile);
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [updateUserProfileDocument, fetchUserProfile]);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting the user and calling updateUserProfileDocument
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred during login.",
        variant: "destructive",
      });
      setIsLoading(false); // Explicitly set loading false on error if onAuthStateChanged doesn't fire quickly
    }
  }, [toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle setting user to null
    } catch (error: any) {
      console.error("Firebase logout error:", error);
      toast({
        title: "Logout Failed",
        description: error.message || "An unexpected error occurred during logout.",
        variant: "destructive",
      });
      setIsLoading(false); // Explicitly set loading false on error
    }
  }, [toast]);

  return (
    <AuthContext.Provider value={{ user, userProfile, isAuthenticated: !!user, isLoading, login, logout }}>
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
