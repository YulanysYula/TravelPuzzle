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
  status?: 'new' | 'possible' | 'rejected' | 'approved'; // Статус транспорта
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
export const getUserByEmail = (email: string): User | null => {
  const users = getUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
};

export const getUserById = (id: string): User | null => {
  const users = getUsers();
  return users.find(u => u.id === id) || null;
};

export const getUsers = (): User[] => {
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

export const saveUser = (user: User): void => {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);
  if (existingIndex >= 0) {
    users[existingIndex] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

export const createUser = (email: string, name: string, password: string): User => {
  const user: User = {
    id: Date.now().toString(),
    email: email.toLowerCase(),
    name,
    password, // In production, hash this
    createdAt: new Date(),
  };
  saveUser(user);
  return user;
};

// Trip management
export const getTrips = (): Trip[] => {
  const stored = localStorage.getItem(STORAGE_KEYS.TRIPS);
  if (!stored) return [];
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const trips = JSON.parse(stored).map((t: any) => ({
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
    const validTrips = trips.filter((trip: Trip) => {
      const tripDate = trip.createdAt || trip.updatedAt;
      return tripDate > thirtyDaysAgo;
    });
    
    // Если были удалены поездки, сохраняем обновленный список
    if (validTrips.length < trips.length) {
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(validTrips));
    }
    
    return validTrips;
  } catch {
    return [];
  }
};

export const saveTrip = async (trip: Trip): Promise<void> => {
  const trips = getTrips();
  const existingIndex = trips.findIndex(t => t.id === trip.id);
  const updatedTrip = {
    ...trip,
    updatedAt: new Date(),
  };
  if (existingIndex >= 0) {
    trips[existingIndex] = updatedTrip;
  } else {
    trips.push(updatedTrip);
  }
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
  
  // Also save to Supabase if available
  try {
    const { saveTripToSupabase } = await import("@/utils/supabase");
    await saveTripToSupabase(updatedTrip);
  } catch (error) {
    // Supabase is optional, continue with local storage
    console.log("Supabase not configured or unavailable, using local storage only");
  }
};

export const deleteTrip = (tripId: number): void => {
  const trips = getTrips();
  const filtered = trips.filter(t => t.id !== tripId);
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(filtered));
};

export const getTripsForUser = (userId: string): Trip[] => {
  const trips = getTrips();
  return trips.filter(t => t.users.includes(userId));
};

// Current user session
export const getCurrentUser = (): User | null => {
  const userId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!userId) return null;
  return getUserById(userId);
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

