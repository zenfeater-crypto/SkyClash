import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  writeBatch 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { SkyblockPet, PetType } from '../types';
import { INITIAL_PETS } from '../data/initialPets';
import { parseCoinStringToNumber } from '../lib/itemHelpers';

interface PetsContextType {
  pets: SkyblockPet[];
  rarePets: SkyblockPet[];
  normalPets: SkyblockPet[];
  loading: boolean;
  error: string | null;
  getPetById: (id: string) => SkyblockPet | undefined;
  updatePet: (id: string, updates: Partial<SkyblockPet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
  addPet: (pet: {
    name: string;
    type: PetType;
    status: string;
    p5: string;
    p6: string;
    p7: string;
    p8: string;
    p9: string;
    p10: string;
    image?: string;
    description?: string;
  }) => Promise<string>;
  seedInitialPets?: () => Promise<void>;
  refreshPets: () => Promise<SkyblockPet[]>;
}

const PetsContext = createContext<PetsContextType | undefined>(undefined);

export const PetsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile, isAdmin } = useAuth();
  const [pets, setPets] = useState<SkyblockPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync and seed initial 30 pets if collection is empty or missing
  const seedInitialPets = async () => {
    try {
      const petsCol = collection(db, 'pets');
      const snap = await getDocs(petsCol);

      if (snap.empty || snap.size < 30) {
        console.log('Seeding initial 30 Skyblock Pets (15 Rare, 15 Normal)...');
        const batch = writeBatch(db);
        for (const pet of INITIAL_PETS) {
          const petRef = doc(petsCol, pet.id);
          batch.set(petRef, pet, { merge: true });
        }
        await batch.commit();
      }
    } catch (err: any) {
      console.warn('Pets initial synchronization note:', err);
    }
  };

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const init = async () => {
      await seedInitialPets();

      const petsCol = collection(db, 'pets');
      unsubscribe = onSnapshot(
        petsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const loadedPets: SkyblockPet[] = [];
            snapshot.forEach((d) => {
              loadedPets.push(d.data() as SkyblockPet);
            });

            // Sort: Rare first, then Normal, alphabetical by name
            loadedPets.sort((a, b) => {
              if (a.type !== b.type) {
                return a.type === 'Rare' ? -1 : 1;
              }
              return a.name.localeCompare(b.name);
            });

            setPets(loadedPets);
          } else {
            // Fallback to in-memory initial pets if offline / before snapshot writes
            setPets(INITIAL_PETS);
          }
          setLoading(false);
        },
        (err) => {
          console.error('Error listening to pets collection:', err);
          setError(err.message);
          // Fallback to initial pets
          setPets(INITIAL_PETS);
          setLoading(false);
        }
      );
    };

    init().catch(console.error);

    return () => unsubscribe();
  }, []);

  const rarePets = useMemo(() => pets.filter((p) => p.type === 'Rare'), [pets]);
  const normalPets = useMemo(() => pets.filter((p) => p.type === 'Normal'), [pets]);

  const getPetById = (id: string): SkyblockPet | undefined => {
    return pets.find((p) => p.id === id);
  };

  // OWNER ADMIN OR AUTHORIZED JMD: Update pet values, image, trend/status
  const updatePet = async (id: string, updates: Partial<SkyblockPet>) => {
    const canChangeValues = isAdmin || (userProfile?.role === 'jmd' && !!userProfile?.permissions?.changeValues);
    if (!canChangeValues || !userProfile) {
      throw new Error('Access Denied: Only the protected Owner Admin or JMD with "Change Values" permission can modify pet values.');
    }

    const docRef = doc(db, 'pets', id);
    const sanitizedUpdates: Partial<SkyblockPet> = {
      ...updates,
      updatedAt: Date.now(),
      updatedBy: userProfile.uid,
    };

    // Automatically recalculate numeric values if string values are altered
    if (updates.p5) sanitizedUpdates.numericP5 = parseCoinStringToNumber(updates.p5);
    if (updates.p6) sanitizedUpdates.numericP6 = parseCoinStringToNumber(updates.p6);
    if (updates.p7) sanitizedUpdates.numericP7 = parseCoinStringToNumber(updates.p7);
    if (updates.p8) sanitizedUpdates.numericP8 = parseCoinStringToNumber(updates.p8);
    if (updates.p9) sanitizedUpdates.numericP9 = parseCoinStringToNumber(updates.p9);
    if (updates.p10) sanitizedUpdates.numericP10 = parseCoinStringToNumber(updates.p10);

    // Optimistic local state update
    setPets((prev) =>
      prev.map((pet) => (pet.id === id ? { ...pet, ...sanitizedUpdates } : pet))
    );

    await updateDoc(docRef, sanitizedUpdates as any);
  };

  // OWNER ADMIN ONLY: Delete pet
  const deletePet = async (id: string) => {
    if (!isAdmin || userProfile?.role !== 'admin') {
      throw new Error('Access Denied: Only the protected Owner Admin can delete pets.');
    }

    setPets((prev) => prev.filter((p) => p.id !== id));
    await deleteDoc(doc(db, 'pets', id));
  };

  // OWNER ADMIN ONLY: Add new pet
  const addPet = async (petData: {
    name: string;
    type: PetType;
    status: string;
    p5: string;
    p6: string;
    p7: string;
    p8: string;
    p9: string;
    p10: string;
    image?: string;
    description?: string;
  }): Promise<string> => {
    if (!isAdmin || userProfile?.role !== 'admin') {
      throw new Error('Access Denied: Only the protected Owner Admin can create pets.');
    }

    const slug = petData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `${petData.type.toLowerCase()}-${slug}`;

    const newPet: SkyblockPet = {
      id,
      name: petData.name,
      normalizedName: petData.name.toLowerCase().trim(),
      type: petData.type,
      status: petData.status,
      p5: petData.p5,
      p6: petData.p6,
      p7: petData.p7,
      p8: petData.p8,
      p9: petData.p9,
      p10: petData.p10,
      image: petData.image || '',
      description: petData.description || `Skyblock ${petData.type} Pet: ${petData.name}.`,
      updatedAt: Date.now(),
      updatedBy: userProfile.uid,
      numericP5: parseCoinStringToNumber(petData.p5),
      numericP6: parseCoinStringToNumber(petData.p6),
      numericP7: parseCoinStringToNumber(petData.p7),
      numericP8: parseCoinStringToNumber(petData.p8),
      numericP9: parseCoinStringToNumber(petData.p9),
      numericP10: parseCoinStringToNumber(petData.p10),
    };

    setPets((prev) => [...prev, newPet]);
    await setDoc(doc(db, 'pets', id), newPet);
    return id;
  };

  const refreshPets = async (): Promise<SkyblockPet[]> => {
    try {
      setLoading(true);
      setError(null);
      const petsCol = collection(db, 'pets');
      const snapshot = await getDocs(petsCol);

      if (!snapshot.empty) {
        const loadedPets: SkyblockPet[] = [];
        snapshot.forEach((d) => {
          loadedPets.push(d.data() as SkyblockPet);
        });

        loadedPets.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === 'Rare' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        setPets(loadedPets);
        setLoading(false);
        return loadedPets;
      }

      setPets(INITIAL_PETS);
      setLoading(false);
      return INITIAL_PETS;
    } catch (err: any) {
      console.error('Manual refresh pets error:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  };

  return (
    <PetsContext.Provider
      value={{
        pets,
        rarePets,
        normalPets,
        loading,
        error,
        getPetById,
        updatePet,
        deletePet,
        addPet,
        seedInitialPets,
        refreshPets,
      }}
    >
      {children}
    </PetsContext.Provider>
  );
};

export const usePets = () => {
  const context = useContext(PetsContext);
  if (!context) {
    throw new Error('usePets must be used within a PetsProvider');
  }
  return context;
};
