import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STORAGE_MODE_KEY = 'umzugsnetz.auth.storage';

function getActiveStorage() {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const storageMode = window.localStorage.getItem(STORAGE_MODE_KEY);
  return storageMode === 'session' ? window.sessionStorage : window.localStorage;
}

const browserStorage = {
  getItem(key: string) {
    return getActiveStorage()?.getItem(key) ?? null;
  },
  setItem(key: string, value: string) {
    const activeStorage = getActiveStorage();
    activeStorage?.setItem(key, value);

    const inactiveStorage =
      activeStorage === window.sessionStorage ? window.localStorage : window.sessionStorage;
    inactiveStorage.removeItem(key);
  },
  removeItem(key: string) {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export function setSupabaseSessionPersistence(rememberMe: boolean) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_MODE_KEY, rememberMe ? 'local' : 'session');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: browserStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
