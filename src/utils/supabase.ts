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
export const supabase = isSupabaseConfigured() 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

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
      .contains('users', userId); // Исправлено: передаем строку, а не массив

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



