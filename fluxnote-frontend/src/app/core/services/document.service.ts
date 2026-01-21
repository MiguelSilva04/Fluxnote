import { Injectable, signal } from '@angular/core';
import { Document, Version, Comment, AISuggestion } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly _documents = signal<Document[]>([
    { id: 1, title: 'Q4 Marketing Strategy', lastEdited: '2 hours ago', sharedWith: 3, status: 'active' },
    { id: 2, title: 'Product Roadmap 2024', lastEdited: 'Yesterday', sharedWith: 5, status: 'active' },
    { id: 3, title: 'Team Meeting Notes', lastEdited: '3 days ago', sharedWith: 2, status: 'archived' }
  ]);

  private readonly _currentDocument = signal<Document | null>(null);
  private readonly _isLoading = signal(false);

  readonly documents = this._documents.asReadonly();
  readonly currentDocument = this._currentDocument.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  getVersions(): Version[] {
    return [
      { id: 7, number: 7, author: 'João Silva', description: 'Added introduction section and fixed spelling errors.', timestamp: '2 hours ago' },
      { id: 6, number: 6, author: 'Ana Clara', description: 'Revised chapter 3 and formatting adjustments.', timestamp: 'Yesterday at 14:30' },
      { id: 5, number: 5, author: 'Pedro Santos', description: 'Implemented team feedback for the Conclusion section.', timestamp: '3 days ago' }
    ];
  }

  getComments(): Comment[] {
    return [
      { id: 1, author: 'Michael Chen', avatar: 'MC', color: 'bg-blue-500', time: '2 hours ago', text: "Consider rephrasing the introduction for better clarity on AI's impact.", replies: [] },
      { id: 2, author: 'Sarah Kim', avatar: 'SK', color: 'bg-purple-500', time: '4 hours ago', text: 'The section on quantum computing is very strong.', replies: [] }
    ];
  }

  getAISuggestions(): AISuggestion[] {
    return [
      { id: 1, title: 'Summarize document', description: 'Get a concise summary of the entire document', icon: '📝' },
      { id: 2, title: 'Improve writing', description: 'Enhance clarity and style', icon: '✨' },
      { id: 3, title: 'Generate content from prompt', description: 'Create new content based on your instructions', icon: '🤖' }
    ];
  }

  setCurrentDocument(doc: Document): void {
    this._currentDocument.set(doc);
  }

  createDocument(teamId: number): Document {
    const newDoc: Document = {
      id: Date.now(),
      title: 'Untitled Document',
      lastEdited: 'Just now',
      sharedWith: 0,
      status: 'active'
    };
    this._documents.update(docs => [...docs, newDoc]);
    return newDoc;
  }

  updateDocument(id: number, updates: Partial<Document>): void {
    this._documents.update(docs =>
      docs.map(doc => doc.id === id ? { ...doc, ...updates } : doc)
    );
  }

  deleteDocument(id: number): void {
    this._documents.update(docs => docs.filter(doc => doc.id !== id));
  }
}
