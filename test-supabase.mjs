import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
// Read .env.local
const envContent = fs.readFileSync('c:/Users/luis2/Hackathon/ai-food-analyzer/.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key length:", supabaseAnonKey ? supabaseAnonKey.length : 0);
const supabase = createClient(supabaseUrl, supabaseAnonKey);
try {
    const { data, error } = await supabase.from('plants').select('*').limit(1);
    if (error) {
        console.error("Supabase error detail:", error);
    } else {
        console.log("Supabase success! Data:", data);
    }
} catch (e) {
    console.error("Fetch thrown error:", e);
}