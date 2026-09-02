import { nanoid } from 'nanoid';
import { toValue, type MaybeRefOrGetter } from 'vue';
import { db } from '../db';
import type { Note } from '../domain/types';
import { useLiveQuery } from './useLiveQuery';

export function useNotes(entityId: MaybeRefOrGetter<string>) {
  const notes = useLiveQuery(
    () =>
      db.notes
        .where('entityId')
        .equals(toValue(entityId))
        .sortBy('createdAt')
        .then((list) => list.reverse()),
    [() => toValue(entityId)],
  );

  async function createNote(text: string): Promise<Note> {
    const note: Note = {
      id: nanoid(),
      entityId: toValue(entityId),
      text,
      createdAt: Date.now(),
    };
    await db.notes.add(note);
    return note;
  }

  async function deleteNote(id: string): Promise<void> {
    await db.notes.delete(id);
  }

  return { notes, createNote, deleteNote };
}
