import { describe, expect, it } from "vitest";
import { canApplySyncResponse } from "../src/lib/sync-domain";

const valid = {
  requestSequence: 3,
  latestSequence: 3,
  revisionAtStart: 8,
  currentRevision: 8,
  responseViewerId: "u2",
  currentViewerId: "u2",
};

describe("sync response guard", () => {
  it("accepte uniquement la reponse courante du profil affiche", () => {
    expect(canApplySyncResponse(valid)).toBe(true);
  });

  it("rejette une reponse terminee apres un rechargement plus recent", () => {
    expect(canApplySyncResponse({ ...valid, requestSequence: 2 })).toBe(false);
  });

  it("rejette une reponse anterieure a une mutation confirmee", () => {
    expect(canApplySyncResponse({ ...valid, currentRevision: 9 })).toBe(false);
  });

  it("rejette les donnees d'un autre profil de demonstration", () => {
    expect(canApplySyncResponse({ ...valid, responseViewerId: "u4" })).toBe(false);
  });
});
