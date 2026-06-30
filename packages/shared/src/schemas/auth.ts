import { z } from 'zod';

/**
 * Contrat des routes d'authentification (validé côté serveur, réutilisable côté front).
 * `z.infer<...>` déduit automatiquement le type TypeScript depuis le schéma.
 */

// --- Requête de connexion ---
// Au login on n'impose PAS les règles de robustesse (12 car., etc.) : on se connecte
// avec son mot de passe existant. On exige juste un email valide et un mot de passe non vide.
export const loginRequestSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// --- Utilisateur public (jamais le mot de passe) ---
export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

// --- Réponses ---
export const loginResponseSchema = z.object({
  token: z.string(),
  user: publicUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const meResponseSchema = z.object({
  user: publicUserSchema,
});
export type MeResponse = z.infer<typeof meResponseSchema>;
