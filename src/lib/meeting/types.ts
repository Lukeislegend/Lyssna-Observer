export type MeetingRole = "researcher" | "participant" | "observer";

export interface MeetingTokenResult {
  token: string;
  roomName: string;
  url: string;
}

export interface MeetingProvider {
  issueToken(input: {
    roomName: string;
    identity: string;
    role: MeetingRole;
    displayName?: string;
  }): Promise<MeetingTokenResult>;
  ensureRoom?(roomName: string): Promise<void>;
}
