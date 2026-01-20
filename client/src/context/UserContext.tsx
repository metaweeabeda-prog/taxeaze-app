import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserContextType {
  userId: string;
  setUserId: (userId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState(() => localStorage.getItem('taxeasy_user') || 'user1');

  const setUserId = (newUserId: string) => {
    localStorage.setItem('taxeasy_user', newUserId);
    setUserIdState(newUserId);
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'taxeasy_user' && e.newValue) {
        setUserIdState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <UserContext.Provider value={{ userId, setUserId }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
