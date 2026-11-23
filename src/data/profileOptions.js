import { LEVELS, MODULES_BY_LEVEL } from "./sessionOptions.js";

// Placeholder major list until the faculties/majors API exists.
export const MAJORS = ["Informatique", "Mathématiques", "Physique", "Chimie", "Électronique", "Génie civil", "Génie mécanique", "Génie électrique", "Biologie", "Économie et gestion"];

export { LEVELS };

// Every module offered across levels (deduped), for the "good at" picker.
export const ALL_MODULES = [...new Set(Object.values(MODULES_BY_LEVEL).flat())].sort((a, b) => a.localeCompare(b, "fr"));

export const PROFILE_LIMITS = {
  bio: 300,
  years: { min: 1, max: 10 },
  strongModules: 8,
  name: 80,
  age: { min: 15, max: 80 },
  avatarBytes: 5 * 1024 * 1024,
  avatarPx: 256,
};

export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp";
