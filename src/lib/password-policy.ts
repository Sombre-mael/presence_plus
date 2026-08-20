import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as common from "@zxcvbn-ts/language-common";
import * as french from "@zxcvbn-ts/language-fr";

let checker: ZxcvbnFactory | null = null;

function passwordChecker() {
  if (!checker) checker = new ZxcvbnFactory({
    translations: french.translations,
    graphs: common.adjacencyGraphs,
    dictionary: {
      ...common.dictionary,
      ...french.dictionary,
    },
  });
  return checker;
}

export interface PasswordPolicyResult {
  valid: boolean;
  score: number;
  errors: string[];
  feedback: string;
}

function identityWords(identityFragments: string[]) {
  return identityFragments
    .flatMap((value) => value.normalize("NFKD").toLocaleLowerCase("fr").split(/[^a-z0-9]+/))
    .filter((value) => value.length >= 3);
}

const COMMON_PASSWORD_PARTS = [
  "123456",
  "azerty",
  "motdepasse",
  "password",
  "presenceplus",
  "qwerty",
];

export function evaluatePassword(password: string, identityFragments: string[] = []): PasswordPolicyResult {
  const errors: string[] = [];
  const byteLength = new TextEncoder().encode(password).length;

  if (password.length < 12) errors.push("Utilisez au moins 12 caractères.");
  if (password.length > 64) errors.push("Utilisez au maximum 64 caractères.");
  if (byteLength > 72) errors.push("Le mot de passe dépasse la limite sécurisée de 72 octets.");

  const lowerPassword = password.normalize("NFKD").toLocaleLowerCase("fr");
  const compactPassword = lowerPassword.replace(/[^a-z0-9]+/g, "");
  if (COMMON_PASSWORD_PARTS.some((part) => compactPassword.includes(part))) {
    errors.push("Évitez les mots de passe courants ou liés à Presence Plus.");
  }
  if (identityWords(identityFragments).some((fragment) => lowerPassword.includes(fragment))) {
    errors.push("Évitez votre nom, e-mail ou matricule dans le mot de passe.");
  }

  const result = passwordChecker().check(password, identityFragments);
  if (result.score < 2) errors.push("Cette phrase est trop facile à deviner. Ajoutez un mot inattendu.");

  const feedback = [result.feedback.warning, ...result.feedback.suggestions]
    .filter(Boolean)
    .join(" ") || "Cette phrase convient.";

  return { valid: errors.length === 0, score: result.score, errors, feedback };
}
