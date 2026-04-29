// User-related types
// Auth is now handled by Supabase Auth (auth.users).
// Profile data lives in the profiles PostgreSQL table (see supabase/profile-repo.ts).
// These interfaces are kept for use in onboarding forms and UI components.

export interface Profile {
  name?: { first?: string; last?: string };
  image?: string;
  location?: string;
  height?: number;
  weight?: number;
  birthdate?: string;
  gender?: string;
  genderDesc?: string;
  diet?: string;
  activeness?: string;
  goals?: {
    all?: string[];
    primary?: string;
    target?: string;
    weekly?: string;
  };
  shopping?: {
    tendency?: string;
    priceSensitivity?: string;
    budget?: string;
  };
}

export interface Preferences {
  darkMode?: boolean;
  units?: string;
}
