/**
 * Simple utility for encoding and decoding Fink session IDs.
 * Session IDs are formatted as: <uuid>::<tag>
 * Tags: SUCCESS, INVALID_ACCOUNT, ACCOUNT_BLOCKED
 */

import { randomUUID } from 'crypto';

export type SessionTag = 'SUCCESS' | 'INVALID_ACCOUNT' | 'ACCOUNT_BLOCKED';

export function encodeSessionId(tag: SessionTag): string {
  // Generate a random UUID v4
  const uuid = randomUUID();
  return `${uuid}::${tag}`;
}

export function decodeSessionId(sessionId: string): { uuid: string; tag: SessionTag | null } {
  const parts = sessionId.split('::');
  if (parts.length !== 2) {
    return { uuid: sessionId, tag: null };
  }

  const tag = parts[1] as SessionTag;
  if (tag === 'SUCCESS' || tag === 'INVALID_ACCOUNT' || tag === 'ACCOUNT_BLOCKED') {
    return { uuid: parts[0], tag };
  }

  return { uuid: parts[0], tag: null };
}

