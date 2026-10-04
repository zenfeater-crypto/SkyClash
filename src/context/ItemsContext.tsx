import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SkyblockItem, ItemCategory, ValueAuditLog } from '../types';
import { INITIAL_SKYBLOCK_ITEMS } from '../data/initialItems';
import { parseCoinStringToNumber } from '../lib/itemHelpers';
import { useAuth } from './AuthContext';

interface ItemsContextType {
  items: SkyblockItem[];
  loading: boolean;
  error: string | null;
  seedInitialDatabase: () => Promise<void>;
  addItem: (item: Omit<SkyblockItem, 'id' | 'updatedAt'>) => Promise<string>;
  updateItem: (
    id: string, 
    updates: Partial<SkyblockItem>, 
    changedBy?: { uid: string; username: string; role: 'admin' | 'officer' | 'jmd' | string }
  ) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  getItemById: (id: string) => SkyblockItem | undefined;
  refreshItems: () => Promise<SkyblockItem[]>;
}

const ItemsContext = createContext<ItemsContextType | undefined>(undefined);

// Generate deterministic ID from category & name
function getDeterministicItemId(name: string, category: ItemCategory | string): string {
  const catSlug = category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${catSlug}-${slug}`;
}

export const ItemsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isAdmin } = useAuth();
  const [items, setItems] = useState<SkyblockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync with Firestore, clean up old legacy dataset, and seed new 67 items
  const syncAndSeedDatabase = async () => {
    try {
      const itemsCollection = collection(db, 'items');
      const currentSnap = await getDocs(itemsCollection);

      const validNewIds = new Set(
        INITIAL_SKYBLOCK_ITEMS.map((it) => getDeterministicItemId(it.name, it.category))
      );

      // Check if dataset is empty or contains legacy/outdated items
      let needsCleanupAndReseed = false;
      const docsToDelete: string[] = [];

      currentSnap.forEach((docSnap) => {
        const data = docSnap.data();
        // Preserves Accessories / Items and any admin-created items
        if (data.category === 'Accessories / Items' || data.category === 'accessories_items') {
          return;
        }
        // If an item has an old category (Weapons, Armor, Pets, etc.) or is not in our 67 set
        if (!validNewIds.has(docSnap.id) || (data.category !== 'Sword' && data.category !== 'Armour')) {
          needsCleanupAndReseed = true;
          docsToDelete.push(docSnap.id);
        }
      });

      if (currentSnap.empty || currentSnap.size !== 67 || needsCleanupAndReseed) {
        console.log('Synchronizing Firestore value dataset with authoritative 33 Swords + 34 Armour sets...');

        // Delete obsolete/legacy items
        if (docsToDelete.length > 0) {
          const deleteBatch = writeBatch(db);
          for (const oldId of docsToDelete) {
            deleteBatch.delete(doc(itemsCollection, oldId));
          }
          await deleteBatch.commit().catch((e) => console.warn('Old item cleanup warning:', e));
        }

        // Upsert all 67 authoritative items with deterministic IDs
        const seedBatch = writeBatch(db);
        for (const raw of INITIAL_SKYBLOCK_ITEMS) {
          const docId = getDeterministicItemId(raw.name, raw.category);
          const itemRef = doc(itemsCollection, docId);
          seedBatch.set(itemRef, {
            ...raw,
            id: docId,
            updatedAt: Date.now(),
          }, { merge: true });
        }
        await seedBatch.commit();
      }
    } catch (err: any) {
      console.warn('Dataset synchronization notice:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    const itemsCollection = collection(db, 'items');
    const q = query(itemsCollection, orderBy('value', 'desc'));

    // Trigger cleanup and seed in background
    syncAndSeedDatabase().catch(console.warn);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: SkyblockItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as SkyblockItem;
            // Include Swords, Armour, and Accessories / Items
            if (
              data.category === 'Sword' || 
              data.category === 'Armour' || 
              data.category === 'Accessories / Items' || 
              (data.category as string) === 'accessories_items'
            ) {
              loaded.push({ 
                ...data, 
                category: (data.category as string) === 'accessories_items' ? 'Accessories / Items' : data.category,
                id: docSnap.id 
              });
            }
          });

          if (loaded.length > 0) {
            setItems(loaded);
            setLoading(false);
            return;
          }
        }

        // If Firestore is empty or snapshot has no valid items yet, fallback immediately to local pristine 67 items
        const fallback = INITIAL_SKYBLOCK_ITEMS.map((item) => ({
          ...item,
          id: getDeterministicItemId(item.name, item.category),
        }));
        setItems(fallback);
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore items snapshot notice:', err);
        setError(err.message);
        // Fallback to local 67 items
        const fallback = INITIAL_SKYBLOCK_ITEMS.map((item) => ({
          ...item,
          id: getDeterministicItemId(item.name, item.category),
        }));
        setItems(fallback);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const seedInitialDatabase = async () => {
    await syncAndSeedDatabase();
  };

  const addItem = async (itemData: Omit<SkyblockItem, 'id' | 'updatedAt'>) => {
    if (!isAdmin || userProfile?.role !== 'admin') {
      throw new Error('Access Denied: Only the protected Owner Admin can add items to the catalog.');
    }

    const itemsRef = collection(db, 'items');
    const docId = getDeterministicItemId(itemData.name, itemData.category);
    const newDoc = doc(itemsRef, docId);
    const fullItem: SkyblockItem = {
      ...itemData,
      id: docId,
      normalizedName: itemData.name.trim().toLowerCase(),
      updatedAt: Date.now(),
    };

    setItems((prev) => [...prev.filter((i) => i.id !== docId), fullItem]);
    await setDoc(newDoc, fullItem);
    return docId;
  };

  const updateItem = async (
    id: string, 
    updates: Partial<SkyblockItem>, 
    changedBy?: { uid: string; username: string; role: 'admin' | 'officer' | 'jmd' | string }
  ) => {
    const canChangeValues = isAdmin || (userProfile?.role === 'jmd' && !!userProfile?.permissions?.changeValues);
    if (!canChangeValues) {
      throw new Error('Access Denied: Only the protected Owner Admin or JMD with "Change Values" permission can modify item values.');
    }

    const itemRef = doc(db, 'items', id);
    const finalUpdates: any = {
      ...updates,
      updatedAt: Date.now(),
    };
    if (updates.name) {
      finalUpdates.normalizedName = updates.name.trim().toLowerCase();
    }

    const currentItem = items.find((it) => it.id === id);

    // Optimistic local state update
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...finalUpdates } : it))
    );

    await updateDoc(itemRef, finalUpdates);

    // Log audit trail for price/status/demand changes
    if (changedBy && currentItem) {
      try {
        const auditRef = doc(collection(db, 'valueAudit'));
        await setDoc(auditRef, {
          id: auditRef.id,
          itemId: id,
          itemName: currentItem.name,
          oldValue: currentItem.value,
          newValue: updates.value !== undefined ? Number(updates.value) : currentItem.value,
          oldDemand: currentItem.demand || 'HIGH',
          newDemand: updates.demand !== undefined ? updates.demand : (currentItem.demand || 'HIGH'),
          changedByUid: changedBy.uid,
          changedByUsername: changedBy.username,
          changedByRole: changedBy.role,
          timestamp: Date.now(),
        });
      } catch (auditErr) {
        console.warn('Could not record value audit log:', auditErr);
      }
    }
  };

  const deleteItem = async (id: string) => {
    if (!isAdmin || userProfile?.role !== 'admin') {
      throw new Error('Access Denied: Only the protected Owner Admin can delete catalog items.');
    }

    setItems((prev) => prev.filter((it) => it.id !== id));
    const itemRef = doc(db, 'items', id);
    await deleteDoc(itemRef);
  };

  const getItemById = (id: string) => {
    return items.find((it) => it.id === id);
  };

  const refreshItems = async (): Promise<SkyblockItem[]> => {
    try {
      setLoading(true);
      setError(null);
      const itemsCollection = collection(db, 'items');
      const q = query(itemsCollection, orderBy('value', 'desc'));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const loaded: SkyblockItem[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as SkyblockItem;
          if (
            data.category === 'Sword' || 
            data.category === 'Armour' || 
            data.category === 'Accessories / Items' || 
            (data.category as string) === 'accessories_items'
          ) {
            loaded.push({ 
              ...data, 
              category: (data.category as string) === 'accessories_items' ? 'Accessories / Items' : data.category,
              id: docSnap.id 
            });
          }
        });

        if (loaded.length > 0) {
          setItems(loaded);
          setLoading(false);
          return loaded;
        }
      }

      const fallback = INITIAL_SKYBLOCK_ITEMS.map((item) => ({
        ...item,
        id: getDeterministicItemId(item.name, item.category),
      }));
      setItems(fallback);
      setLoading(false);
      return fallback;
    } catch (err: any) {
      console.warn('Manual refresh items error:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return (
    <ItemsContext.Provider
      value={{
        items,
        loading,
        error,
        seedInitialDatabase,
        addItem,
        updateItem,
        deleteItem,
        getItemById,
        refreshItems,
      }}
    >
      {children}
    </ItemsContext.Provider>
  );
};

export const useItems = () => {
  const context = useContext(ItemsContext);
  if (!context) {
    throw new Error('useItems must be used within an ItemsProvider');
  }
  return context;
};
