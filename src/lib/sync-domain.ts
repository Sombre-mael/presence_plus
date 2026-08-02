export interface SyncGuardInput {
  requestSequence: number;
  latestSequence: number;
  revisionAtStart: number;
  currentRevision: number;
  responseViewerId: string;
  currentViewerId: string;
}

export function canApplySyncResponse(input: SyncGuardInput) {
  return input.requestSequence === input.latestSequence &&
    input.revisionAtStart === input.currentRevision &&
    input.responseViewerId === input.currentViewerId;
}
