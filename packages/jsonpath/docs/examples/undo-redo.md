# Undo/Redo System Example

Build a complete undo/redo system using JSON Patch.

## Overview

JSON Patch (RFC 6902) is ideal for undo/redo because:

1. **Compact**: Only stores changes, not full document copies
2. **Reversible**: Inverse patches can be generated automatically
3. **Debuggable**: Changes are explicit and inspectable

## Basic Implementation

```typescript
import { applyPatch, applyWithInverse, diff } from '@jsonpath/patch';
import type { JSONPatchOperation } from '@jsonpath/core';

interface HistoryEntry {
	description: string;
	timestamp: number;
	forward: JSONPatchOperation[];
	backward: JSONPatchOperation[];
}

class UndoableDocument<T> {
	private current: T;
	private undoStack: HistoryEntry[] = [];
	private redoStack: HistoryEntry[] = [];
	private maxHistory: number;

	constructor(initial: T, maxHistory = 100) {
		this.current = initial;
		this.maxHistory = maxHistory;
	}

	get value(): T {
		return this.current;
	}

	get canUndo(): boolean {
		return this.undoStack.length > 0;
	}

	get canRedo(): boolean {
		return this.redoStack.length > 0;
	}

	/**
	 * Apply changes and record for undo
	 */
	apply(patch: JSONPatchOperation[], description = 'Change'): void {
		const { result, inverse } = applyWithInverse(this.current, patch);

		this.undoStack.push({
			description,
			timestamp: Date.now(),
			forward: patch,
			backward: inverse,
		});

		// Limit history size
		if (this.undoStack.length > this.maxHistory) {
			this.undoStack.shift();
		}

		// Clear redo on new change
		this.redoStack = [];

		this.current = result as T;
	}

	/**
	 * Update to a new state (generates diff automatically)
	 */
	update(newState: T, description = 'Update'): void {
		const patch = diff(this.current, newState);
		if (patch.length > 0) {
			this.apply(patch, description);
		}
	}

	/**
	 * Undo the last change
	 */
	undo(): boolean {
		const entry = this.undoStack.pop();
		if (!entry) return false;

		const { result, inverse } = applyWithInverse(this.current, entry.backward);

		this.redoStack.push({
			...entry,
			backward: inverse, // Update inverse for redo
		});

		this.current = result as T;
		return true;
	}

	/**
	 * Redo the last undone change
	 */
	redo(): boolean {
		const entry = this.redoStack.pop();
		if (!entry) return false;

		const { result, inverse } = applyWithInverse(this.current, entry.forward);

		this.undoStack.push({
			...entry,
			backward: inverse, // Update inverse for undo
		});

		this.current = result as T;
		return true;
	}

	/**
	 * Get undo history descriptions
	 */
	getHistory(): string[] {
		return this.undoStack.map((e) => e.description);
	}

	/**
	 * Undo to a specific point in history
	 */
	undoTo(index: number): void {
		while (this.undoStack.length > index) {
			if (!this.undo()) break;
		}
	}
}
```

## Usage Example

```typescript
interface Document {
	title: string;
	content: string;
	tags: string[];
}

const doc = new UndoableDocument<Document>({
	title: 'Untitled',
	content: '',
	tags: [],
});

// Make changes
doc.apply(
	[{ op: 'replace', path: '/title', value: 'My Document' }],
	'Set title',
);

doc.apply(
	[{ op: 'replace', path: '/content', value: 'Hello, world!' }],
	'Add content',
);

doc.apply([{ op: 'add', path: '/tags/-', value: 'example' }], 'Add tag');

console.log(doc.value);
// { title: 'My Document', content: 'Hello, world!', tags: ['example'] }

console.log(doc.getHistory());
// ['Set title', 'Add content', 'Add tag']

// Undo last change
doc.undo();
console.log(doc.value.tags); // []

// Redo
doc.redo();
console.log(doc.value.tags); // ['example']

// Undo all
while (doc.canUndo) doc.undo();
console.log(doc.value);
// { title: 'Untitled', content: '', tags: [] }
```

## With Batch Changes

Group related changes into a single undo step:

```typescript
import { PatchBuilder } from '@jsonpath/patch';

// Multiple changes as one undo step
const batch = new PatchBuilder()
	.replace('/title', 'Final Title')
	.replace('/content', 'Final content here')
	.add('/tags/-', 'final')
	.add('/tags/-', 'version')
	.build();

doc.apply(batch, 'Finalize document');

// Single undo reverts all
doc.undo();
```

## React Integration

```typescript
import { useState, useCallback, useMemo } from 'react';

function useUndoable<T>(initial: T) {
  const [doc] = useState(() => new UndoableDocument(initial));
  const [, forceUpdate] = useState({});

  const apply = useCallback((
    patch: JSONPatchOperation[],
    description?: string
  ) => {
    doc.apply(patch, description);
    forceUpdate({});
  }, [doc]);

  const update = useCallback((newState: T, description?: string) => {
    doc.update(newState, description);
    forceUpdate({});
  }, [doc]);

  const undo = useCallback(() => {
    if (doc.undo()) forceUpdate({});
  }, [doc]);

  const redo = useCallback(() => {
    if (doc.redo()) forceUpdate({});
  }, [doc]);

  return {
    value: doc.value,
    apply,
    update,
    undo,
    redo,
    canUndo: doc.canUndo,
    canRedo: doc.canRedo,
    history: doc.getHistory()
  };
}

// Usage in component
function Editor() {
  const { value, update, undo, redo, canUndo, canRedo } = useUndoable({
    title: '',
    content: ''
  });

  return (
    <div>
      <div>
        <button onClick={undo} disabled={!canUndo}>Undo</button>
        <button onClick={redo} disabled={!canRedo}>Redo</button>
      </div>
      <input
        value={value.title}
        onChange={e => update({ ...value, title: e.target.value }, 'Edit title')}
      />
      <textarea
        value={value.content}
        onChange={e => update({ ...value, content: e.target.value }, 'Edit content')}
      />
    </div>
  );
}
```

## Collaborative Editing Support

Extend for collaborative scenarios:

```typescript
interface RemoteChange {
	clientId: string;
	patch: JSONPatchOperation[];
	timestamp: number;
}

class CollaborativeDocument<T> extends UndoableDocument<T> {
	private clientId: string;
	private remoteChanges: RemoteChange[] = [];

	constructor(initial: T, clientId: string) {
		super(initial);
		this.clientId = clientId;
	}

	/**
	 * Apply local change and broadcast
	 */
	localChange(patch: JSONPatchOperation[], description: string): RemoteChange {
		this.apply(patch, description);

		const change: RemoteChange = {
			clientId: this.clientId,
			patch,
			timestamp: Date.now(),
		};

		return change; // Send to server/peers
	}

	/**
	 * Apply remote change (not undoable locally)
	 */
	remoteChange(change: RemoteChange): void {
		if (change.clientId === this.clientId) return; // Skip own changes

		const result = applyPatch(this.value, change.patch);
		this.remoteChanges.push(change);

		// Bypass undo stack for remote changes
		(this as any).current = result;
	}
}
```

## Persistence

Save and restore history:

```typescript
interface SerializedHistory<T> {
	current: T;
	undoStack: HistoryEntry[];
	redoStack: HistoryEntry[];
}

class PersistentDocument<T> extends UndoableDocument<T> {
	serialize(): SerializedHistory<T> {
		return {
			current: this.value,
			undoStack: (this as any).undoStack,
			redoStack: (this as any).redoStack,
		};
	}

	static restore<T>(data: SerializedHistory<T>): PersistentDocument<T> {
		const doc = new PersistentDocument(data.current);
		(doc as any).undoStack = data.undoStack;
		(doc as any).redoStack = data.redoStack;
		return doc;
	}
}

// Save to localStorage
function save(doc: PersistentDocument<any>) {
	localStorage.setItem('doc', JSON.stringify(doc.serialize()));
}

// Restore from localStorage
function restore<T>(): PersistentDocument<T> | null {
	const data = localStorage.getItem('doc');
	if (!data) return null;
	return PersistentDocument.restore(JSON.parse(data));
}
```

## Diff-Based Updates

Use diff for automatic change detection:

```typescript
class DiffDocument<T extends object> {
	private current: T;
	private history: T[] = [];
	private historyIndex = -1;

	constructor(initial: T) {
		this.current = initial;
		this.saveSnapshot();
	}

	private saveSnapshot(): void {
		// Remove any redo states
		this.history = this.history.slice(0, this.historyIndex + 1);
		this.history.push(structuredClone(this.current));
		this.historyIndex = this.history.length - 1;
	}

	update(changes: Partial<T>): void {
		const newState = { ...this.current, ...changes } as T;
		const patch = diff(this.current, newState);

		if (patch.length > 0) {
			this.current = newState;
			this.saveSnapshot();
		}
	}

	undo(): T | null {
		if (this.historyIndex <= 0) return null;
		this.historyIndex--;
		this.current = structuredClone(this.history[this.historyIndex]);
		return this.current;
	}

	redo(): T | null {
		if (this.historyIndex >= this.history.length - 1) return null;
		this.historyIndex++;
		this.current = structuredClone(this.history[this.historyIndex]);
		return this.current;
	}

	get value(): T {
		return this.current;
	}
}
```

## Performance Tips

1. **Limit History Size**: Don't keep unlimited undo history
2. **Batch Changes**: Group related changes into single entries
3. **Compress History**: For long sessions, consider compressing old entries
4. **Lazy Serialization**: Don't serialize on every change

```typescript
// Debounce history saves
let saveTimeout: number;
function debouncedSave(doc: PersistentDocument<any>) {
	clearTimeout(saveTimeout);
	saveTimeout = setTimeout(() => save(doc), 1000);
}
```
