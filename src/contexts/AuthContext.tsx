
"use client";

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type User, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { auth, googleProvider, db } from '@/firebase/firebaseConfig';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
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
      const userDocSnap = await getDoc(userDocRef);
      const profileData: UserProfile = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: currentUser.displayName,
        lastLogin: serverTimestamp() as Timestamp,
      };
      if (userDocSnap.exists()) {
        await setDoc(userDocRef, { 
          email: currentUser.email, // ensure email is updated if changed
          displayName: currentUser.displayName, // ensure display name is updated
          lastLogin: serverTimestamp() 
        }, { merge: true });
      } else {
        await setDoc(userDocRef, profileData);
      }
      setUserProfile(profileData); // Set local profile state
    } catch (error: any) {
      console.error("Error updating user profile document:", error);
      toast({
        title: "Profile Error",
        description: "Could not update user profile information.",
        variant: "destructive",
      });
    }
  }, [toast]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await updateUserProfileDocument(currentUser);
      } else {
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [updateUserProfileDocument]);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting the user and profile
      if (result.user) {
        // updateUserProfileDocument is called by onAuthStateChanged
      }
    } catch (error: any) {
      console.error("Firebase login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "An unexpected error occurred during login.",
        variant: "destructive",
      });
    } 
    // setIsLoading(false) is handled by onAuthStateChanged listener
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
    }
    // setIsLoading(false) is handled by onAuthStateChanged listener
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
