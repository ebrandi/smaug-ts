/**
 * RoomManager – Room instance registry and lookup.
 *
 * Maintains a Map<vnum, Room> of all instantiated rooms.
 * Provides fast lookup, exit traversal helpers, and coordinates
 * with AreaManager for room instantiation from prototypes.
 *
 * @stub Phase 2b implementation
 */

// TODO PARITY: RoomManager — implement exit traversal helpers, room flag checks, typed Room references (currently uses unknown)
export class RoomManager {
  /** Master map of vnum → room reference. */
  private readonly rooms: Map<number, unknown> = new Map();

  /** Register a room by vnum. */
  registerRoom(vnum: number, room: unknown): void {
    this.rooms.set(vnum, room);
  }

  /** Look up a room by vnum. Returns undefined if not found. */
  getRoom(vnum: number): unknown | undefined {
    return this.rooms.get(vnum);
  }

  /** Get all registered rooms as an array. */
  getAllRooms(): unknown[] {
    return Array.from(this.rooms.values());
  }

  /** Get the total number of registered rooms. */
  get roomCount(): number {
    return this.rooms.size;
  }
}
