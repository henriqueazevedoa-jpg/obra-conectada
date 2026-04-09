import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ehmdwwuhhumgxhsjvvrr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVobWR3d3VoaHVtZ3hoc2p2dnJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNzI1MDgsImV4cCI6MjA5MDY0ODUwOH0.qmzYKaoUluhbwsQgKR9yzuM6wyW7qA7XbEP8LG1fnjk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
