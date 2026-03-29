/**
 * BoardSystem – Board / Note system.
 *
 * Replicates legacy boards.c: in-game bulletin boards with notes,
 * access control, and voting support.
 */

import type { Character } from '../entities/Character.js';
import type { Player } from '../entities/Player.js';
import { oneArgument } from '../../utils/StringUtils.js';

// =============================================================================
// Interfaces
// =============================================================================

/** Board configuration – maps to an in-game board object. */
export interface BoardData {
  id: string;
  boardVnum: number;
  name: string;
  minReadLevel: number;
  minPostLevel: number;
  minRemoveLevel: number;
  maxPosts: number;
  readGroup: string | null;   // Clan/council name, or null for 'all'
  postGroup: string | null;
  extraReaders: string;       // Space-separated additional reader names
  otrusted: boolean;          // Officers can remove
}

/** A single note posted to a board. */
export interface NoteData {
  id: string;
  boardId: string;
  sender: string;
  dateSent: Date;
  toList: string;       // Recipients: 'all', 'immortal', clan name, player name
  subject: string;
  text: string;
  voting: boolean;
  yeaVoters: string[];
  nayVoters: string[];
  abstainVoters: string[];
}

// =============================================================================
// In-Memory Board Registry
// =============================================================================

const boardRegistry: Map<number, BoardData> = new Map();

export function getBoard(vnum: number): BoardData | undefined {
  return boardRegistry.get(vnum);
}

export function getBoardById(id: string): BoardData | undefined {
  for (const b of boardRegistry.values()) {
    if (b.id === id) return b;
  }
  return undefined;
}

export function registerBoard(board: BoardData): void {
  boardRegistry.set(board.boardVnum, board);
}

export function clearBoards(): void {
  boardRegistry.clear();
}

// =============================================================================
// Persistence Delegates
// =============================================================================

export interface BoardPersistence {
  getNotesForBoard(boardId: string): Promise<NoteData[]>;
  saveNote(note: Omit<NoteData, 'id' | 'dateSent'>): Promise<NoteData>;
  deleteNote(noteId: string): Promise<void>;
  getNoteById(noteId: string): Promise<NoteData | undefined>;
  updateNote(note: NoteData): Promise<void>;
  countNotesForBoard(boardId: string): Promise<number>;
}

let persistence: BoardPersistence = {
  async getNotesForBoard() { return []; },
  async saveNote(n) {
    return {
      id: `note_${Date.now()}`,
      boardId: n.boardId,
      sender: n.sender,
      dateSent: new Date(),
      toList: n.toList,
      subject: n.subject,
      text: n.text,
      voting: n.voting,
      yeaVoters: n.yeaVoters,
      nayVoters: n.nayVoters,
      abstainVoters: n.abstainVoters,
    };
  },
  async deleteNote() {},
  async getNoteById() { return undefined; },
  async updateNote() {},
  async countNotesForBoard() { return 0; },
};

export function setBoardPersistence(p: BoardPersistence): void {
  persistence = p;
}

// =============================================================================
// Board Finder Delegate
// =============================================================================

/**
 * Find the board vnum in the player's current room.
 * Injected at bootstrap time; defaults to returning undefined.
 */
let findBoardInRoom: (ch: Character) => number | undefined = () => undefined;

export function setBoardFinder(fn: (ch: Character) => number | undefined): void {
  findBoardInRoom = fn;
}

// =============================================================================
// Access Checks
// =============================================================================

function canRead(ch: Character, board: BoardData): boolean {
  if (ch.level < board.minReadLevel) return false;
  if (board.readGroup) {
    const player = ch as Player;
    if (player.pcData?.clanName?.toLowerCase() === board.readGroup.toLowerCase()) return true;
    if (player.pcData?.councilName?.toLowerCase() === board.readGroup.toLowerCase()) return true;
    if (board.extraReaders &&
        board.extraReaders.toLowerCase().includes(ch.name.toLowerCase())) return true;
    if (ch.isImmortal) return true;
    return false;
  }
  return true;
}

function canPost(ch: Character, board: BoardData): boolean {
  if (ch.level < board.minPostLevel) return false;
  if (board.postGroup) {
    const player = ch as Player;
    if (player.pcData?.clanName?.toLowerCase() === board.postGroup.toLowerCase()) return true;
    if (player.pcData?.councilName?.toLowerCase() === board.postGroup.toLowerCase()) return true;
    if (ch.isImmortal) return true;
    return false;
  }
  return true;
}

function canRemove(ch: Character, board: BoardData, note: NoteData): boolean {
  // Sender can always remove own notes
  if (note.sender.toLowerCase() === ch.name.toLowerCase()) return true;
  // Admin level removal
  if (ch.level >= board.minRemoveLevel) return true;
  // Officer trusted removal
  if (board.otrusted) {
    // Check if ch is a clan officer – simplified check
    const player = ch as Player;
    if (player.pcData?.clanName) return true;
  }
  return false;
}

/** Check if a note is visible to a character based on toList. */
function canSeeNote(ch: Character, note: NoteData): boolean {
  const to = note.toList.toLowerCase();
  if (to === 'all') return true;
  if (to === 'immortal' && ch.isImmortal) return true;
  if (to.includes(ch.name.toLowerCase())) return true;
  // Check clan name
  const player = ch as Player;
  if (player.pcData?.clanName && to.includes(player.pcData.clanName.toLowerCase())) return true;
  if (player.pcData?.councilName && to.includes(player.pcData.councilName.toLowerCase())) return true;
  return false;
}

// =============================================================================
// doNote – Main command handler
// =============================================================================

/**
 * doNote – Handle all note subcommands.
 *
 * Syntax:
 *   note list
 *   note read <number>
 *   note write
 *   note subject <text>
 *   note to <recipient>
 *   note post
 *   note remove <number>
 *   note vote <number> <yea|nay|abstain>
 */
export async function doNote(ch: Character, argument: string): Promise<void> {
  if (ch.isNpc) {
    ch.sendToChar('NPCs cannot use the note system.\r\n');
    return;
  }

  const [subCmd, rest] = oneArgument(argument);
  if (!subCmd) {
    ch.sendToChar('Syntax: note <list|read|write|subject|to|post|remove|vote>\r\n');
    return;
  }

  const sub = subCmd.toLowerCase();

  switch (sub) {
    case 'list':
      return await doNoteList(ch, rest);
    case 'read':
      return await doNoteRead(ch, rest);
    case 'write':
      return doNoteWrite(ch, rest);
    case 'subject':
      return doNoteSubject(ch, rest);
    case 'to':
      return doNoteTo(ch, rest);
    case 'post':
      return await doNotePost(ch, rest);
    case 'remove':
      return await doNoteRemove(ch, rest);
    case 'vote':
      return await doNoteVote(ch, rest);
    default:
      ch.sendToChar('Syntax: note <list|read|write|subject|to|post|remove|vote>\r\n');
      return;
  }
}

async function doNoteList(ch: Character, _rest: string): Promise<void> {
  const boardVnum = findBoardInRoom(ch);
  if (boardVnum === undefined) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  const board = getBoard(boardVnum);
  if (!board) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  if (!canRead(ch, board)) {
    ch.sendToChar('You cannot read this board.\r\n');
    return;
  }

  const notes = await persistence.getNotesForBoard(board.id);
  const visible = notes.filter(n => canSeeNote(ch, n));

  if (visible.length === 0) {
    ch.sendToChar('There are no notes on this board.\r\n');
    return;
  }

  let buf = '[Num] Date         Sender          Subject\r\n';
  buf +=    '----- ------------ --------------- ----------------------------\r\n';
  visible.forEach((note, idx) => {
    const num = String(idx + 1).padStart(5);
    const date = note.dateSent.toISOString().substring(0, 10).padEnd(12);
    const sender = note.sender.substring(0, 15).padEnd(15);
    buf += `${num} ${date} ${sender} ${note.subject}\r\n`;
  });

  ch.sendToChar(buf);
}

async function doNoteRead(ch: Character, rest: string): Promise<void> {
  const boardVnum = findBoardInRoom(ch);
  if (boardVnum === undefined) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  const board = getBoard(boardVnum);
  if (!board) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  if (!canRead(ch, board)) {
    ch.sendToChar('You cannot read this board.\r\n');
    return;
  }

  const noteNum = parseInt(rest.trim(), 10);
  if (isNaN(noteNum) || noteNum < 1) {
    ch.sendToChar('Read which note number?\r\n');
    return;
  }

  const notes = await persistence.getNotesForBoard(board.id);
  const visible = notes.filter(n => canSeeNote(ch, n));

  if (noteNum > visible.length) {
    ch.sendToChar('No such note.\r\n');
    return;
  }

  const note = visible[noteNum - 1]!;

  let buf = `[${noteNum}] ${note.subject}\r\n`;
  buf += `Date: ${note.dateSent.toISOString().substring(0, 10)}\r\n`;
  buf += `Sender: ${note.sender}\r\n`;
  buf += `To: ${note.toList}\r\n`;
  buf += '--------------------------------------------------------------\r\n';
  buf += note.text + '\r\n';

  if (note.voting) {
    buf += '--------------------------------------------------------------\r\n';
    buf += `Votes - Yea: ${note.yeaVoters.length}  Nay: ${note.nayVoters.length}  Abstain: ${note.abstainVoters.length}\r\n`;
  }

  ch.sendToChar(buf);
}

function doNoteWrite(ch: Character, _rest: string): void {
  const boardVnum = findBoardInRoom(ch);
  if (boardVnum === undefined) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  const board = getBoard(boardVnum);
  if (!board) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  if (!canPost(ch, board)) {
    ch.sendToChar('You cannot post on this board.\r\n');
    return;
  }

  const player = ch as Player;

  if (!player.pcData.noteInProgress) {
    player.pcData.noteInProgress = { subject: '', toList: 'all', text: '' };
  }

  ch.sendToChar('Enter your note text. Use "note subject <text>" and "note to <recipient>" first.\r\n');
  ch.sendToChar('Use "note post" to post or "note write" again to add text interactively.\r\n');
}

function doNoteSubject(ch: Character, rest: string): void {
  const player = ch as Player;
  if (!player.pcData.noteInProgress) {
    player.pcData.noteInProgress = { subject: '', toList: 'all', text: '' };
  }

  const subject = rest.trim();
  if (!subject) {
    ch.sendToChar('Set the subject to what?\r\n');
    return;
  }

  player.pcData.noteInProgress.subject = subject;
  ch.sendToChar(`Note subject set to: ${subject}\r\n`);
}

function doNoteTo(ch: Character, rest: string): void {
  const player = ch as Player;
  if (!player.pcData.noteInProgress) {
    player.pcData.noteInProgress = { subject: '', toList: 'all', text: '' };
  }

  const toList = rest.trim();
  if (!toList) {
    ch.sendToChar('Set the recipient to whom?\r\n');
    return;
  }

  player.pcData.noteInProgress.toList = toList;
  ch.sendToChar(`Note recipient set to: ${toList}\r\n`);
}

async function doNotePost(ch: Character, _rest: string): Promise<void> {
  const player = ch as Player;
  const nip = player.pcData.noteInProgress;

  if (!nip || !nip.subject) {
    ch.sendToChar('You have no note in progress, or it has no subject.\r\n');
    return;
  }

  const boardVnum = findBoardInRoom(ch);
  if (boardVnum === undefined) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  const board = getBoard(boardVnum);
  if (!board) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  if (!canPost(ch, board)) {
    ch.sendToChar('You cannot post on this board.\r\n');
    return;
  }

  // Check max posts
  const count = await persistence.countNotesForBoard(board.id);
  if (count >= board.maxPosts) {
    ch.sendToChar('This board is full. Some notes must be removed first.\r\n');
    return;
  }

  await persistence.saveNote({
    boardId: board.id,
    sender: ch.name,
    toList: nip.toList,
    subject: nip.subject,
    text: nip.text || '(no text)',
    voting: false,
    yeaVoters: [],
    nayVoters: [],
    abstainVoters: [],
  });

  player.pcData.noteInProgress = null;
  ch.sendToChar('Note posted.\r\n');
}

async function doNoteRemove(ch: Character, rest: string): Promise<void> {
  const boardVnum = findBoardInRoom(ch);
  if (boardVnum === undefined) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  const board = getBoard(boardVnum);
  if (!board) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  const noteNum = parseInt(rest.trim(), 10);
  if (isNaN(noteNum) || noteNum < 1) {
    ch.sendToChar('Remove which note number?\r\n');
    return;
  }

  const notes = await persistence.getNotesForBoard(board.id);
  const visible = notes.filter(n => canSeeNote(ch, n));

  if (noteNum > visible.length) {
    ch.sendToChar('No such note.\r\n');
    return;
  }

  const note = visible[noteNum - 1]!;

  if (!canRemove(ch, board, note)) {
    ch.sendToChar('You cannot remove that note.\r\n');
    return;
  }

  await persistence.deleteNote(note.id);
  ch.sendToChar('Note removed.\r\n');
}

async function doNoteVote(ch: Character, rest: string): Promise<void> {
  const boardVnum = findBoardInRoom(ch);
  if (boardVnum === undefined) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  const board = getBoard(boardVnum);
  if (!board) {
    ch.sendToChar('There is no board here.\r\n');
    return;
  }

  const [numStr, voteStr] = oneArgument(rest);
  const noteNum = parseInt(numStr, 10);
  if (isNaN(noteNum) || noteNum < 1) {
    ch.sendToChar('Vote on which note number?\r\n');
    return;
  }

  const vote = voteStr.trim().toLowerCase();
  if (vote !== 'yea' && vote !== 'nay' && vote !== 'abstain') {
    ch.sendToChar('Vote yea, nay, or abstain.\r\n');
    return;
  }

  const notes = await persistence.getNotesForBoard(board.id);
  const visible = notes.filter(n => canSeeNote(ch, n));

  if (noteNum > visible.length) {
    ch.sendToChar('No such note.\r\n');
    return;
  }

  const note = visible[noteNum - 1]!;

  if (!note.voting) {
    ch.sendToChar('That note does not have voting enabled.\r\n');
    return;
  }

  const name = ch.name.toLowerCase();
  // Check if already voted
  if (note.yeaVoters.map(v => v.toLowerCase()).includes(name) ||
      note.nayVoters.map(v => v.toLowerCase()).includes(name) ||
      note.abstainVoters.map(v => v.toLowerCase()).includes(name)) {
    ch.sendToChar('You have already voted on this note.\r\n');
    return;
  }

  switch (vote) {
    case 'yea':
      note.yeaVoters.push(ch.name);
      break;
    case 'nay':
      note.nayVoters.push(ch.name);
      break;
    case 'abstain':
      note.abstainVoters.push(ch.name);
      break;
  }

  await persistence.updateNote(note);
  ch.sendToChar(`You vote ${vote} on note #${noteNum}.\r\n`);
}
