import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { TradeRecord } from '../types';
import { sanitizeForFirestore } from '../lib/validation';

interface UserDataContextType {
  favorites: string[]; // itemIds
  tradeHistory: TradeRecord[];
  isFavorite: (itemId: string) => boolean;
  toggleFavorite: (itemId: string) => Promise<void>;
  saveTrade: (trade: Omit<TradeRecord, 'id' | 'userId' | 'timestamp'>) => Promise<string>;
  deleteTrade: (tradeId: string) => Promise<void>;
  blockedUserIds: string[];
  blockUser: (targetUid: string) => Promise<void>;
  unblockUser: (targetUid: string) => Promise<void>;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export const UserDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);

  // Real-time synchronization of Favorites
  useEffect(() => {
    if (!currentUser) {
      setFavorites([]);
      setTradeHistory([]);
      setBlockedUserIds([]);
      return;
    }

    const favsQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', currentUser.uid)
    );

    const unsubFavs = onSnapshot(favsQuery, (snap) => {
      const ids: string[] = [];
      snap.forEach((d) => {
        ids.push(d.data().itemId);
      });
      setFavorites(ids);
    });

    const tradesQuery = query(
      collection(db, 'tradeHistory'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubTrades = onSnapshot(tradesQuery, (snap) => {
      const records: TradeRecord[] = [];
      snap.forEach((d) => {
        records.push({ id: d.id, ...d.data() } as TradeRecord);
      });
      setTradeHistory(records);
    }, (err) => {
      console.warn('Trades snapshot warning (check index):', err);
    });

    const blocksQuery = query(
      collection(db, 'userBlocks'),
      where('blockerUid', '==', currentUser.uid)
    );

    const unsubBlocks = onSnapshot(blocksQuery, (snap) => {
      const blocked: string[] = [];
      snap.forEach((d) => {
        blocked.push(d.data().blockedUid);
      });
      setBlockedUserIds(blocked);
    });

    return () => {
      unsubFavs();
      unsubTrades();
      unsubBlocks();
    };
  }, [currentUser]);

  const isFavorite = (itemId: string) => favorites.includes(itemId);

  const toggleFavorite = async (itemId: string) => {
    if (!currentUser) throw new Error('Please sign in to save favorites.');
    const docId = `${currentUser.uid}_${itemId}`;
    const favRef = doc(db, 'favorites', docId);

    if (favorites.includes(itemId)) {
      await deleteDoc(favRef);
    } else {
      await setDoc(favRef, {
        userId: currentUser.uid,
        itemId,
        addedAt: Date.now(),
      });
    }
  };

  const saveTrade = async (tradeData: Omit<TradeRecord, 'id' | 'userId' | 'timestamp'>) => {
    if (!currentUser) throw new Error('Please sign in to save trades.');
    const tradeRef = doc(collection(db, 'tradeHistory'));
    const fullTrade: TradeRecord = {
      ...tradeData,
      id: tradeRef.id,
      userId: currentUser.uid,
      timestamp: Date.now(),
    };
    await setDoc(tradeRef, sanitizeForFirestore(fullTrade));
    return tradeRef.id;
  };

  const deleteTrade = async (tradeId: string) => {
    if (!currentUser) throw new Error('Unauthorized');
    const tradeRef = doc(db, 'tradeHistory', tradeId);
    await deleteDoc(tradeRef);
  };

  const blockUser = async (targetUid: string) => {
    if (!currentUser) throw new Error('Unauthorized');
    const blockRef = doc(db, 'userBlocks', `${currentUser.uid}_${targetUid}`);
    await setDoc(blockRef, {
      blockerUid: currentUser.uid,
      blockedUid: targetUid,
      createdAt: Date.now(),
    });
  };

  const unblockUser = async (targetUid: string) => {
    if (!currentUser) throw new Error('Unauthorized');
    const blockRef = doc(db, 'userBlocks', `${currentUser.uid}_${targetUid}`);
    await deleteDoc(blockRef);
  };

  return (
    <UserDataContext.Provider
      value={{
        favorites,
        tradeHistory,
        isFavorite,
        toggleFavorite,
        saveTrade,
        deleteTrade,
        blockedUserIds,
        blockUser,
        unblockUser,
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
};

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  return context;
};
