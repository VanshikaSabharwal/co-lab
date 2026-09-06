/**
 * Marker for chat lines the app generated rather than a person typing.
 *
 * Kept apart from memberEvents.ts, which pulls in Prisma — the chat UI is a
 * client component and can only import the pure helpers.
 */

/** Prefix marking a GroupMessage as system-generated. */
export const SYSTEM_MESSAGE_PREFIX = "__system__:";

export function isSystemMessage(message: string): boolean {
  return message.startsWith(SYSTEM_MESSAGE_PREFIX);
}

/** The human-readable half of a system message, without the marker. */
export function systemMessageText(message: string): string {
  return message.slice(SYSTEM_MESSAGE_PREFIX.length);
}
