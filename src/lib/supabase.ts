import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btxrfquyegrsczzkzwhb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0eHJmcXV5ZWdyc2N6emt6d2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5NzYzODcsImV4cCI6MjA4MzU1MjM4N30.vFiwvhLFbKhAj5BY7Aqa4DZPvkEhDQCo3aaNvUz1Sdc';

export const supabase = createClient(supabaseUrl, supabaseKey);
