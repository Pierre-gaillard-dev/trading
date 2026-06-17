/** Résultat d'une vérification de mot de passe. */
export interface PasswordCheck {
  valid: boolean;
  errors: string[];
}
