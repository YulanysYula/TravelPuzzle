import { createClient } from '@supabase/supabase-js';

// Получаем значения из переменных окружения или используем дефолтные
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Проверяем, настроен ли Supabase
export const isSupabaseConfigured = () => {
  return SUPABASE_URL && 
         SUPABASE_ANON_KEY && 
         SUPABASE_URL !== 'https://your-project.supabase.co' &&
         SUPABASE_ANON_KEY !== 'your-anon-key' &&
         SUPABASE_URL.length > 0 &&
         SUPABASE_ANON_KEY.length > 0;
};

// Создаем клиент только если Supabase настроен
export const supabase = (() => {
  const configured = isSupabaseConfigured();
  if (!configured) {
    console.warn("Supabase is not configured. Check your .env file.");
    return null;
  }
  console.log("Supabase client initialized successfully.");
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();

// Типы для Supabase
export interface SupabaseTrip {
  id: number;
  name: string;
  users: string[];
  progress: number;
  chat: any[];
  created_by: string;
  updated_at: string;
  share_token?: string;
  trip_data: any; // JSON данные поездки
  created_at: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  name: string;
  password: string;
  created_at: string;
}

// Функции для работы с пользователями в Supabase
export const saveUserToSupabase = async (user: any) => {
  if (!isSupabaseConfigured() || !supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email.toLowerCase(),
        name: user.name,
        password: user.password,
        created_at: user.createdAt || new Date().toISOString(),
      });

    if (error) throw error;
    return data;
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error saving user to Supabase:', error);
    }
    return null;
  }
};

export const getUserByEmailFromSupabase = async (email: string) => {
  if (!isSupabaseConfigured() || !supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      password: data.password,
      createdAt: new Date(data.created_at),
    };
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error getting user by email from Supabase:', error);
    }
    return null;
  }
};

export const getUserByIdFromSupabase = async (id: string) => {
  if (!isSupabaseConfigured() || !supabase) return null;
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      password: data.password,
      createdAt: new Date(data.created_at),
    };
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error getting user by id from Supabase:', error);
    }
    return null;
  }
};

// Функции для работы с поездками в Supabase
export const saveTripToSupabase = async (trip: any) => {
  if (!isSupabaseConfigured() || !supabase) {
    return null; // Supabase не настроен, просто возвращаем null
  }
  
  try {
    const { data, error } = await supabase
      .from('trips')
      .upsert({
        id: trip.id,
        name: trip.name,
        users: trip.users,
        progress: trip.progress,
        chat: trip.chat,
        created_by: trip.createdBy,
        trip_data: trip,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) throw error;
    return data;
  } catch (error) {
    // Тихо игнорируем ошибки, если Supabase не настроен или недоступен
    if (isSupabaseConfigured()) {
      console.warn('Error saving trip to Supabase:', error);
    }
    return null;
  }
};

export const getTripFromSupabase = async (tripId: number) => {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();

    if (error) throw error;
    return data?.trip_data;
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error getting trip from Supabase:', error);
    }
    return null;
  }
};

export const getTripsForUserFromSupabase = async (userId: string) => {
  if (!isSupabaseConfigured() || !supabase) {
    return null; // Supabase не настроен
  }
  
  try {
    // Используем правильный синтаксис для проверки наличия элемента в массиве
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .contains('users', [userId]); // Передаем массив для корректной фильтрации TEXT[]

    if (error) throw error;
    return data?.map(t => t.trip_data) || [];
  } catch (error) {
    // Тихо игнорируем ошибки, если Supabase не настроен или недоступен
    if (isSupabaseConfigured()) {
      console.warn('Error getting trips from Supabase:', error);
    }
    return null;
  }
};

export const getTripByShareToken = async (token: string) => {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('share_token', token)
      .single();

    if (error) throw error;
    return data?.trip_data;
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error getting trip by share token:', error);
    }
    return null;
  }
};

export const generateShareToken = async (tripId: number) => {
  if (!isSupabaseConfigured() || !supabase) {
    // Если Supabase не настроен, генерируем токен локально
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  try {
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const { error } = await supabase
      .from('trips')
      .update({ share_token: token })
      .eq('id', tripId);

    if (error) throw error;
    return token;
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error generating share token:', error);
    }
    // Возвращаем токен даже при ошибке, чтобы шаринг работал локально
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

// Удаление поездки из Supabase
export const deleteTripFromSupabase = async (tripId: number) => {
  if (!isSupabaseConfigured() || !supabase) {
    return false;
  }
  
  try {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);

    if (error) throw error;
    return true;
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error deleting trip from Supabase:', error);
    }
    return false;
  }
};

// Получение всех поездок из Supabase
export const getAllTripsFromSupabase = async () => {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data?.map(t => t.trip_data) || [];
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error getting all trips from Supabase:', error);
    }
    return null;
  }
};

// Получение всех пользователей из Supabase
export const getAllUsersFromSupabase = async () => {
  if (!isSupabaseConfigured() || !supabase) {
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data?.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      password: u.password,
      createdAt: new Date(u.created_at),
    })) || [];
  } catch (error) {
    if (isSupabaseConfigured()) {
      console.warn('Error getting all users from Supabase:', error);
    }
    return null;
  }
};



