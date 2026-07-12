import { createTableSession, type TableSession, type TableSessionOptions } from "./session";

const tableSessions = new WeakMap<HTMLTableElement, TableSession>();

export function mountTableSession(
  table: HTMLTableElement,
  options: TableSessionOptions = {},
): TableSession {
  const existingSession = tableSessions.get(table);

  if (existingSession) {
    return existingSession;
  }

  const session = createTableSession(table, options);
  tableSessions.set(table, session);
  return session;
}

export function destroyTableSession(table: HTMLTableElement): void {
  const session = tableSessions.get(table);

  if (!session) {
    return;
  }

  session.destroy();
  tableSessions.delete(table);
}

export function destroyDetachedTableSessions(root: Element): void {
  const tables = Array.from(root.querySelectorAll<HTMLTableElement>("table"));

  if (root instanceof HTMLTableElement) {
    tables.unshift(root);
  }

  for (const table of tables) {
    if (!table.isConnected) {
      destroyTableSession(table);
    }
  }
}
