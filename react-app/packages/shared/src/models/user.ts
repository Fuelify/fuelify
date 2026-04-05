// Ported from: lib/models/user.dart

export interface Authentication {
  id: string;
  email: string;
  type?: string;
  token: string;
  refreshToken: string;
}

export function parseAuthentication(data: Record<string, unknown>): Authentication {
  return {
    id: data.id as string,
    email: data.email as string,
    type: (data.type as string) ?? 'USER',
    token: data.access_token as string,
    refreshToken: data.refresh_token as string,
  };
}

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

export function parseProfile(data: Record<string, unknown>): Profile {
  const goals = data.goals as Record<string, unknown> | undefined;
  return {
    name: data.name as Profile['name'],
    image:
      (data.image as string) ??
      'https://images.unsplash.com/photo-1554151228-14d9def656e4?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=333&q=80',
    location: data.location as string | undefined,
    height: data.height as number | undefined,
    weight: data.weight as number | undefined,
    birthdate: data.birthdate as string | undefined,
    gender: data.gender as string | undefined,
    genderDesc: data.genderdesc as string | undefined,
    diet: data.diet as string | undefined,
    activeness: data.activeness as string | undefined,
    goals: goals?.health as Profile['goals'],
    shopping: data.shopping as Profile['shopping'],
  };
}

export function profileToJSON(profile: Profile): Record<string, unknown> {
  return {
    Name: profile.name,
    Image: profile.image,
    Location: profile.location,
    Personal: {
      height: profile.height,
      birthdate: profile.birthdate,
      gender: profile.gender,
      genderDesc: profile.genderDesc,
    },
    Diet: profile.diet,
    Activeness: profile.activeness,
    Goals: profile.goals,
    Shopping: profile.shopping,
  };
}

export interface Preferences {
  darkMode?: boolean;
  units?: string;
}

export function parsePreferences(data: Record<string, unknown>): Preferences {
  return {
    darkMode: data.darkMode as boolean | undefined,
    units: data.units as string | undefined,
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  type: string;
  token: string;
  refreshToken: string;
  settings: { DarkMode: boolean; Units: string };
  states: { Registered: boolean; Onboarded: boolean };
  plan: string;
  authentication: Authentication;
  profile: Profile;
  preferences: Preferences;
}

export function createDefaultUser(): User {
  return {
    id: '',
    name: '',
    email: '',
    phone: '',
    image: '',
    type: '',
    token: '',
    refreshToken: '',
    settings: { DarkMode: false, Units: 'Imperial' },
    states: { Registered: true, Onboarded: false },
    plan: 'Free',
    authentication: { id: '', email: '', token: '', refreshToken: '' },
    profile: {},
    preferences: {},
  };
}

export function parseUser(data: Record<string, unknown>): User {
  const defaultUser = createDefaultUser();
  return {
    ...defaultUser,
    id: data.id as string,
    name: (data.name as string) ?? 'Joe Smith',
    email: data.email as string,
    phone: (data.phone as string) ?? '315-988-5689',
    image:
      (data.image as string) ??
      'https://images.unsplash.com/photo-1554151228-14d9def656e4?ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=333&q=80',
    type: (data.type as string) ?? 'USER',
    token: data.access_token as string,
    refreshToken: data.refresh_token as string,
    states: (data.states as User['states']) ?? { Registered: true, Onboarded: false },
    settings: (data.settings as User['settings']) ?? { DarkMode: false, Units: 'Imperial' },
    plan: (data.plan as string) ?? 'Free',
  };
}
