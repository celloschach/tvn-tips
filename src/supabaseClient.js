import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// DEBUG: Das zeigt uns in der Browser-Konsole, ob die Daten korrekt sind
console.log('DEBUG URL:', supabaseUrl);
console.log('DEBUG KEY (erste 20 Zeichen):', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'FEHLT!');

// Prüfe auf häufige Fehler
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('FEHLER: Supabase URL oder Key ist nicht definiert!');
} else if (supabaseUrl.endsWith('/')) {
  console.error('FEHLER: Die URL hat einen Schrägstrich (/) am Ende!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
