import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../../src/game/entities/Player.js';
import { Position } from '../../../src/game/entities/types.js';
import {
  BoardData,
  NoteData,
  registerBoard,
  clearBoards,
  setBoardPersistence,
  setBoardFinder,
  doNote,
  BoardPersistence,
} from '../../../src/game/social/BoardSystem.js';

// =============================================================================
// Helpers
// =============================================================================

const mockDescriptor = {
  write: (_text: string) => {},
  original: null,
};

let lastOutput: string;

function makePlayer(name: string, level = 15): Player {
  lastOutput = '';
  const p = new Player({
    name,
    level,
    position: Position.Standing,
    gold: 1000,
  });
  p.descriptor = {
    ...mockDescriptor,
    write(text: string) { lastOutput += text; },
  } as any;
  return p;
}

function makeBoard(overrides: Partial<BoardData> = {}): BoardData {
  return {
    id: 'board_1',
    boardVnum: 1000,
    name: 'General Board',
    minReadLevel: 0,
    minPostLevel: 0,
    minRemoveLevel: 50,
    maxPosts: 50,
    readGroup: null,
    postGroup: null,
    extraReaders: '',
    otrusted: false,
    ...overrides,
  };
}

function makeNote(overrides: Partial<NoteData> = {}): NoteData {
  return {
    id: 'note_1',
    boardId: 'board_1',
    sender: 'Author',
    dateSent: new Date('2026-01-15'),
    toList: 'all',
    subject: 'Test Subject',
    text: 'Test body text.',
    voting: false,
    yeaVoters: [],
    nayVoters: [],
    abstainVoters: [],
    ...overrides,
  };
}

/** Create an in-memory persistence adapter for testing. */
function createMemoryPersistence(): { persistence: BoardPersistence; notes: NoteData[] } {
  const notes: NoteData[] = [];
  let idCounter = 0;

  const persistence: BoardPersistence = {
    async getNotesForBoard(boardId: string) {
      return notes.filter(n => n.boardId === boardId);
    },
    async saveNote(n) {
      const note: NoteData = {
        id: `note_${++idCounter}`,
        boardId: n.boardId,
        sender: n.sender,
        dateSent: new Date(),
        toList: n.toList,
        subject: n.subject,
        text: n.text,
        voting: n.voting,
        yeaVoters: [...n.yeaVoters],
        nayVoters: [...n.nayVoters],
        abstainVoters: [...n.abstainVoters],
      };
      notes.push(note);
      return note;
    },
    async deleteNote(id: string) {
      const idx = notes.findIndex(n => n.id === id);
      if (idx >= 0) notes.splice(idx, 1);
    },
    async getNoteById(id: string) {
      return notes.find(n => n.id === id);
    },
    async updateNote(note: NoteData) {
      const idx = notes.findIndex(n => n.id === note.id);
      if (idx >= 0) notes[idx] = { ...note };
    },
    async countNotesForBoard(boardId: string) {
      return notes.filter(n => n.boardId === boardId).length;
    },
  };

  return { persistence, notes };
}

// =============================================================================
// Tests
// =============================================================================

describe('BoardSystem', () => {
  let mem: ReturnType<typeof createMemoryPersistence>;

  beforeEach(() => {
    clearBoards();
    mem = createMemoryPersistence();
    setBoardPersistence(mem.persistence);
    // Default board finder: always returns vnum 1000
    setBoardFinder(() => 1000);
    registerBoard(makeBoard());
  });

  // ---------------------------------------------------------------------------
  // note list
  // ---------------------------------------------------------------------------
  describe('note list', () => {
    it('lists visible notes', async () => {
      mem.notes.push(makeNote({ id: 'n1', subject: 'Hello World' }));
      mem.notes.push(makeNote({ id: 'n2', subject: 'Another Note' }));

      const ch = makePlayer('Reader');
      await doNote(ch, 'list');
      expect(lastOutput).toContain('Hello World');
      expect(lastOutput).toContain('Another Note');
    });

    it('shows empty message when no notes', async () => {
      const ch = makePlayer('Reader');
      await doNote(ch, 'list');
      expect(lastOutput).toContain('no notes');
    });

    it('filters notes by toList', async () => {
      mem.notes.push(makeNote({ id: 'n1', subject: 'Public', toList: 'all' }));
      mem.notes.push(makeNote({ id: 'n2', subject: 'Private', toList: 'SomeoneElse' }));

      const ch = makePlayer('Reader');
      await doNote(ch, 'list');
      expect(lastOutput).toContain('Public');
      expect(lastOutput).not.toContain('Private');
    });

    it('shows notes addressed to player by name', async () => {
      mem.notes.push(makeNote({ id: 'n1', subject: 'ForYou', toList: 'Reader' }));

      const ch = makePlayer('Reader');
      await doNote(ch, 'list');
      expect(lastOutput).toContain('ForYou');
    });
  });

  // ---------------------------------------------------------------------------
  // note read
  // ---------------------------------------------------------------------------
  describe('note read', () => {
    it('reads a note by number', async () => {
      mem.notes.push(makeNote({ id: 'n1', subject: 'First', text: 'Body text here.' }));

      const ch = makePlayer('Reader');
      await doNote(ch, 'read 1');
      expect(lastOutput).toContain('First');
      expect(lastOutput).toContain('Body text here.');
    });

    it('shows vote counts if voting enabled', async () => {
      mem.notes.push(makeNote({
        id: 'n1',
        subject: 'Vote',
        voting: true,
        yeaVoters: ['A', 'B'],
        nayVoters: ['C'],
        abstainVoters: [],
      }));

      const ch = makePlayer('Reader');
      await doNote(ch, 'read 1');
      expect(lastOutput).toContain('Yea: 2');
      expect(lastOutput).toContain('Nay: 1');
    });

    it('rejects out of range', async () => {
      const ch = makePlayer('Reader');
      await doNote(ch, 'read 999');
      expect(lastOutput).toContain('No such note');
    });

    it('rejects non-numeric', async () => {
      const ch = makePlayer('Reader');
      await doNote(ch, 'read abc');
      expect(lastOutput).toContain('which note');
    });
  });

  // ---------------------------------------------------------------------------
  // note write / subject / to / post
  // ---------------------------------------------------------------------------
  describe('note write + post flow', () => {
    it('full post flow', async () => {
      const ch = makePlayer('Author');

      await doNote(ch, 'subject My Topic');
      expect(lastOutput).toContain('subject set');

      lastOutput = '';
      await doNote(ch, 'to all');
      expect(lastOutput).toContain('recipient set');

      lastOutput = '';
      await doNote(ch, 'post');
      expect(lastOutput).toContain('Note posted');
      expect(mem.notes).toHaveLength(1);
      expect(mem.notes[0]!.subject).toBe('My Topic');
      expect(mem.notes[0]!.toList).toBe('all');
      expect(ch.pcData.noteInProgress).toBeNull();
    });

    it('rejects post without subject', async () => {
      const ch = makePlayer('Author');
      await doNote(ch, 'post');
      expect(lastOutput).toContain('no note in progress');
    });

    it('write initializes noteInProgress', async () => {
      const ch = makePlayer('Author');
      await doNote(ch, 'write');
      expect(ch.pcData.noteInProgress).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // note remove
  // ---------------------------------------------------------------------------
  describe('note remove', () => {
    it('removes own note', async () => {
      mem.notes.push(makeNote({ id: 'n1', sender: 'Author' }));

      const ch = makePlayer('Author');
      await doNote(ch, 'remove 1');
      expect(lastOutput).toContain('Note removed');
      expect(mem.notes).toHaveLength(0);
    });

    it('admin can remove any note', async () => {
      mem.notes.push(makeNote({ id: 'n1', sender: 'SomeoneElse' }));
      registerBoard(makeBoard({ minRemoveLevel: 50 }));

      const admin = makePlayer('Admin', 50);
      await doNote(admin, 'remove 1');
      expect(lastOutput).toContain('Note removed');
    });

    it('rejects removal if not allowed', async () => {
      mem.notes.push(makeNote({ id: 'n1', sender: 'SomeoneElse' }));
      registerBoard(makeBoard({ minRemoveLevel: 50 }));

      const ch = makePlayer('Peon', 10);
      await doNote(ch, 'remove 1');
      expect(lastOutput).toContain('cannot remove');
    });
  });

  // ---------------------------------------------------------------------------
  // note vote
  // ---------------------------------------------------------------------------
  describe('note vote', () => {
    it('records a yea vote', async () => {
      mem.notes.push(makeNote({ id: 'n1', voting: true }));

      const ch = makePlayer('Voter');
      await doNote(ch, 'vote 1 yea');
      expect(lastOutput).toContain('vote yea');
      expect(mem.notes[0]!.yeaVoters).toContain('Voter');
    });

    it('records a nay vote', async () => {
      mem.notes.push(makeNote({ id: 'n1', voting: true }));

      const ch = makePlayer('Voter');
      await doNote(ch, 'vote 1 nay');
      expect(mem.notes[0]!.nayVoters).toContain('Voter');
    });

    it('prevents double voting', async () => {
      mem.notes.push(makeNote({ id: 'n1', voting: true, yeaVoters: ['Voter'] }));

      const ch = makePlayer('Voter');
      await doNote(ch, 'vote 1 nay');
      expect(lastOutput).toContain('already voted');
    });

    it('rejects voting on non-voting note', async () => {
      mem.notes.push(makeNote({ id: 'n1', voting: false }));

      const ch = makePlayer('Voter');
      await doNote(ch, 'vote 1 yea');
      expect(lastOutput).toContain('does not have voting');
    });

    it('rejects invalid vote type', async () => {
      mem.notes.push(makeNote({ id: 'n1', voting: true }));

      const ch = makePlayer('Voter');
      await doNote(ch, 'vote 1 maybe');
      expect(lastOutput).toContain('yea, nay, or abstain');
    });
  });

  // ---------------------------------------------------------------------------
  // Access control
  // ---------------------------------------------------------------------------
  describe('access control', () => {
    it('blocks read by minReadLevel', async () => {
      clearBoards();
      registerBoard(makeBoard({ minReadLevel: 20 }));

      const ch = makePlayer('Lowbie', 5);
      await doNote(ch, 'list');
      expect(lastOutput).toContain('cannot read');
    });

    it('blocks post by minPostLevel', async () => {
      clearBoards();
      registerBoard(makeBoard({ minPostLevel: 20 }));

      const ch = makePlayer('Lowbie', 5);
      ch.pcData.noteInProgress = { subject: 'Test', toList: 'all', text: 'Hi' };
      await doNote(ch, 'post');
      expect(lastOutput).toContain('cannot post');
    });

    it('readGroup restricts access to clan members', async () => {
      clearBoards();
      registerBoard(makeBoard({ readGroup: 'Warriors' }));

      const outsider = makePlayer('Outsider', 50);
      await doNote(outsider, 'list');
      expect(lastOutput).toContain('cannot read');

      lastOutput = '';
      const member = makePlayer('Member', 50);
      member.pcData.clanName = 'Warriors';
      await doNote(member, 'list');
      // Should not block – but may show "no notes"
      expect(lastOutput).not.toContain('cannot read');
    });

    it('no board in room sends error', async () => {
      setBoardFinder(() => undefined);
      const ch = makePlayer('Reader');
      await doNote(ch, 'list');
      expect(lastOutput).toContain('no board');
    });

    it('max posts limit', async () => {
      clearBoards();
      registerBoard(makeBoard({ maxPosts: 1 }));
      mem.notes.push(makeNote());

      const ch = makePlayer('Author');
      ch.pcData.noteInProgress = { subject: 'Test', toList: 'all', text: 'Hi' };
      await doNote(ch, 'post');
      expect(lastOutput).toContain('full');
    });
  });

  // ---------------------------------------------------------------------------
  // Misc
  // ---------------------------------------------------------------------------
  describe('misc', () => {
    it('shows syntax on empty subcommand', async () => {
      const ch = makePlayer('Reader');
      await doNote(ch, '');
      expect(lastOutput).toContain('Syntax');
    });

    it('shows syntax on unknown subcommand', async () => {
      const ch = makePlayer('Reader');
      await doNote(ch, 'badcmd');
      expect(lastOutput).toContain('Syntax');
    });
  });
});
