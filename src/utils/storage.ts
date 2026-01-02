// Storage utilities for persistence
const STORAGE_KEYS = {
  USERS: 'trip_planner_users',
  TRIPS: 'trip_planner_trips',
  CURRENT_USER: 'trip_planner_current_user',
};

export interface User {
  id: string;
  email: string;
  name: string;
  password: string; // In production, this should be hashed
  createdAt: Date;
}

export interface TripImage {
  id: string;
  url: string; // base64 или URL
  category: 'place' | 'activities' | 'housing' | 'transport' | 'other';
  uploadedBy: string; // User ID
  uploadedAt: Date;
}

export interface VotingOption {
  id: string;
  text: string;
  category: 'place' | 'activities' | 'housing' | 'transport' | 'other';
  votes: string[]; // User IDs who voted
  createdBy: string; // User ID
  createdAt: Date;
  approved: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string; // User ID
  sharedBy: string[]; // User IDs who share this expense
  currency?: string; // Валюта (RUB, USD, EUR, etc.)
  createdAt: Date;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  imageUrl: string; // base64 or URL
  coordinates: { lat: number; lng: number } | null;
  googleMapsLink: string;
  order: number; // Порядок в путешествии
  status?: 'new' | 'possible' | 'rejected' | 'approved'; // Статус места
  currency?: string;
  price?: number;
  createdAt: Date;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  imageUrl: string; // base64 or URL
  link: string;
  address: string;
  votes: string[]; // User IDs who voted
  createdBy: string; // User ID
  approved: boolean;
  day: number; // День путешествия
  time: string; // Время активности
  status?: 'new' | 'possible' | 'rejected' | 'approved'; // Статус активности
  currency?: string;
  price?: number;
  createdAt: Date;
}

export interface Accommodation {
  id: string;
  name: string;
  address: string;
  imageUrl: string;
  bookingLink: string;
  description: string;
  checkIn: string; // Дата заезда
  checkOut: string; // Дата выезда
  price: number;
  status?: 'new' | 'possible' | 'rejected' | 'approved'; // Статус жилья
  currency?: string;
  createdAt: Date;
}

export interface Transport {
  id: string;
  type: 'plane' | 'train' | 'bus' | 'car' | 'ship' | 'other';
  from: string;
  to: string;
  departureTime: string;
  departurePlace: string;
  arrivalTime: string;
  arrivalPlace: string;
  passengers: number;
  description: string;
  imageUrl?: string; // base64 or URL
  status?: 'new' | 'possible' | 'rejected' | 'approved'; // Статус транспорта
  currency?: string;
  price?: number;
  createdAt: Date;
}

export interface Trip {
  id: number;
  name: string;
  place?: string; // Legacy field, kept for compatibility
  budget?: string; // Legacy field
  // activities removed - use activities array instead
  housing?: string; // Legacy field - use accommodations array instead
  transport?: string; // Legacy field - use transports array instead
  users: string[]; // User IDs
  progress: number;
  chat: Array<{ user: string; text: string; time: Date }>;
  createdBy: string; // User ID
  createdAt: Date; // Дата создания поездки
  updatedAt: Date;
  images: TripImage[];
  votingOptions: VotingOption[];
  expenses: Expense[];
  // New structured data
  places?: Place[];
  activities?: Activity[];
  accommodations?: Accommodation[];
  transports?: Transport[];
  startDate?: string; // Дата начала поездки
  endDate?: string; // Дата окончания поездки
  coverImage?: string; // Обложка поездки (base64 or URL)
  currency?: string; // Валюта по умолчанию для поездки (RUB, USD, EUR, etc.)
}

// User management
export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { getUserByEmailFromSupabase } = await import("./supabase");
  const sbUser = await getUserByEmailFromSupabase(email);
  if (sbUser) return sbUser;

  // Fallback/Cache check in localStorage
  const users = getUsersFromCache();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const { getUserByIdFromSupabase } = await import("./supabase");
  const sbUser = await getUserByIdFromSupabase(id);
  if (sbUser) return sbUser;

  const users = getUsersFromCache();
  return users.find(u => u.id === id) || null;
};

// Получить пользователей из localStorage (кэш)
export const getUsersFromCache = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!stored) return [];
  try {
    return JSON.parse(stored).map((u: any) => ({
      ...u,
      createdAt: new Date(u.createdAt),
    }));
  } catch {
    return [];
  }
};

// Получить всех пользователей (Supabase → localStorage fallback)
export const getUsers = async (): Promise<User[]> => {
  try {
    const { getAllUsersFromSupabase } = await import("./supabase");
    const sbUsers = await getAllUsersFromSupabase();
    if (sbUsers && sbUsers.length > 0) {
      // Сохраняем в кэш
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sbUsers));
      return sbUsers;
    }
  } catch (error) {
    console.warn("Failed to fetch users from Supabase:", error);
  }
  // Fallback to localStorage
  return getUsersFromCache();
};

export const saveUser = async (user: User): Promise<void> => {
  // Save to Supabase first (primary)
  debugger
  try {
    const { saveUserToSupabase } = await import("./supabase");
    debugger
    await saveUserToSupabase(user);
  } catch (error) {
    console.warn("Failed to save user to Supabase:", error);
  }

  // Also save to localStorage as cache
  const users = getUsersFromCache();
  const existingIndex = users.findIndex(u => u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const createUser = async (email: string, name: string, password: string): Promise<User> => {
  const user: User = {
    id: Date.now().toString(),
    email: email.toLowerCase(),
    name,
    password, // In production, hash this
    createdAt: new Date(),
  };
  await saveUser(user);
  return user;
};

// Trip management - helper to parse trips from raw data
const parseTrips = (rawTrips: any[]): Trip[] => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const trips = rawTrips.map((t: any) => ({
    ...t,
    createdAt: t.createdAt ? new Date(t.createdAt) : new Date(t.updatedAt),
    chat: (t.chat || []).map((c: any) => ({
      ...c,
      time: new Date(c.time),
    })),
    images: (t.images || []).map((img: any) => ({
      ...img,
      uploadedAt: new Date(img.uploadedAt),
    })),
    votingOptions: (t.votingOptions || []).map((vo: any) => ({
      ...vo,
      createdAt: new Date(vo.createdAt),
    })),
    expenses: (t.expenses || []).map((exp: any) => ({
      ...exp,
      createdAt: new Date(exp.createdAt),
    })),
    places: (t.places || []).map((p: any) => ({
      ...p,
      createdAt: new Date(p.createdAt),
    })),
    activities: (t.activities || []).map((a: any) => ({
      ...a,
      createdAt: new Date(a.createdAt),
    })),
    accommodations: (t.accommodations || []).map((acc: any) => ({
      ...acc,
      createdAt: new Date(acc.createdAt),
    })),
    transports: (t.transports || []).map((tr: any) => ({
      ...tr,
      createdAt: new Date(tr.createdAt),
    })),
    updatedAt: new Date(t.updatedAt),
  }));
  
  // Фильтруем поездки старше 30 дней
  return trips.filter((trip: Trip) => {
    const tripDate = trip.createdAt || trip.updatedAt;
    return tripDate > thirtyDaysAgo;
  });
};

// Получить поездки из localStorage (кэш)
export const getTripsFromCache = (): Trip[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.TRIPS);
  if (!stored) return [];
  try {
    return parseTrips(JSON.parse(stored));
  } catch {
    return [];
  }
};

// Получить все поездки (Supabase → localStorage fallback)
export const getTrips = async (): Promise<Trip[]> => {
  try {
    const { getAllTripsFromSupabase } = await import("./supabase");
    const sbTrips = await getAllTripsFromSupabase();
    if (sbTrips && sbTrips.length > 0) {
      const parsedTrips = parseTrips(sbTrips);
      // Сохраняем в кэш
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(parsedTrips));
      return parsedTrips;
    }
  } catch (error) {
    console.warn("Failed to fetch trips from Supabase:", error);
  }
  // Fallback to localStorage
  return getTripsFromCache();
};

export const saveTripToCache = (trip: Trip): void => {
  const trips = getTripsFromCache();
  const existingIndex = trips.findIndex(t => t.id === trip.id);
  if (existingIndex >= 0) {
    trips[existingIndex] = trip;
  } else {
    trips.push(trip);
  }
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
};

export const saveTrip = async (trip: Trip): Promise<void> => {
  const updatedTrip = {
    ...trip,
    updatedAt: new Date(),
  };
  
  // Save to Supabase first (primary)
  try {
    const { saveTripToSupabase } = await import("@/utils/supabase");
    await saveTripToSupabase(updatedTrip);
  } catch (error) {
    console.warn("Supabase not configured or unavailable:", error);
  }
  
  // Also save to localStorage as cache
  saveTripToCache(updatedTrip);
};

export const deleteTrip = async (tripId: number): Promise<void> => {
  // Delete from Supabase first (primary)
  try {
    const { deleteTripFromSupabase } = await import("@/utils/supabase");
    await deleteTripFromSupabase(tripId);
  } catch (error) {
    console.warn("Failed to delete trip from Supabase:", error);
  }
  
  // Also delete from localStorage cache
  const trips = getTripsFromCache();
  const filtered = trips.filter(t => t.id !== tripId);
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(filtered));
};

export const getTripsForUser = async (userId: string): Promise<Trip[]> => {
  // Try Supabase first
  try {
    const { getTripsForUserFromSupabase } = await import("./supabase");
    const sbTrips = await getTripsForUserFromSupabase(userId);
    if (sbTrips && sbTrips.length > 0) {
      const parsedTrips = parseTrips(sbTrips);
      // Update localStorage cache
      const cachedTrips = getTripsFromCache();
      parsedTrips.forEach((st: Trip) => {
        const existingIndex = cachedTrips.findIndex(t => t.id === st.id);
        if (existingIndex >= 0) {
          cachedTrips[existingIndex] = st;
        } else {
          cachedTrips.push(st);
        }
      });
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(cachedTrips));
      return parsedTrips;
    }
  } catch (error) {
    console.warn("Failed to fetch trips from Supabase:", error);
  }

  // Fallback to local storage
  const trips = getTripsFromCache();
  return trips.filter(t => t.users.includes(userId));
};

// Current user session
export const getCurrentUser = async (): Promise<User | null> => {
  const userId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!userId) return null;
  return await getUserById(userId);
};

export const setCurrentUser = (user: User | null): void => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, user.id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

export const logout = (): void => {
  setCurrentUser(null);
};

