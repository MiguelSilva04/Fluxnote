import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import * as Y from 'yjs';
import { QuillBinding } from 'y-quill';
import * as signalR from '@microsoft/signalr';
import Quill from 'quill';
import { AuthService } from './auth.service';

export interface CollaboratorState {
  connectionId: string;
  userId: string;
  name: string;
  color: string;
  /** Posição do cursor no Y.Text (null = sem foco no editor) */
  cursor?: { index: number; length: number } | null;
}

@Injectable({ providedIn: 'root' })
export class CollaborationService {
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  private connection: signalR.HubConnection | null = null;
  private ydoc: Y.Doc | null = null;
  private binding: QuillBinding | null = null;
  private currentDocumentId: number | null = null;

  // Mapa de estados de awareness dos outros clientes
  readonly collaborators = new Map<string, CollaboratorState>();

  // Emite quando chega um update de awareness (cursor/presença)
  readonly awarenessUpdate$ = new Subject<{ connectionId: string; state: CollaboratorState }>();
  // Emite o connectionId quando um utilizador sai
  readonly userLeft$ = new Subject<string>();

  // ─────────────────────────────────────────────────────────────
  // Conectar ao documento
  // ─────────────────────────────────────────────────────────────

  async connect(documentId: number, quill: Quill): Promise<Y.Doc> {
    // Cleanup de sessão anterior
    await this.disconnect();
    this.currentDocumentId = documentId;

    // 1. Procurar snapshot Y.Doc do backend
    const snapshotBytes = await this.fetchSnapshot(documentId);

    // 2. Criar Y.Doc e aplicar snapshot (ou inicializar do HTML)
    this.ydoc = new Y.Doc();
    const ytext = this.ydoc.getText('quill');

    if (snapshotBytes) {
      // Estado completo do documento via CRDT
      Y.applyUpdate(this.ydoc, snapshotBytes, 'remote');
    } else {
      // Sem snapshot: inicializar Y.Text a partir do conteúdo HTML actual do Quill
      // Deve ser chamado depois do quill.root.innerHTML estar definido
      const delta = quill.getContents();
      if (delta.ops && delta.ops.length > 0) {
        this.ydoc.transact(() => {
          ytext.applyDelta(delta.ops);
        }, 'init');
      }
    }

    // 3. Ligar Y.Text ao Quill (binding bidirecional CRDT ↔ Editor)
    this.binding = new QuillBinding(ytext, quill);

    // 4. Criar conexão SignalR
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/document', {
        // SignalR envia token como query string (?access_token=...)
        // porque WebSocket não suporta headers customizados
        accessTokenFactory: () => this.auth.getAccessToken() ?? '',
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    // 5. Configurar handlers de mensagens do servidor
    this.registerHandlers(documentId);

    // 6. Iniciar conexão e entrar no grupo do documento
    await this.connection.start();
    await this.connection.invoke('JoinDocument', documentId);

    // 7. Quando o Y.Doc muda localmente → enviar update para o servidor
    this.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return;
      if (this.connection?.state !== signalR.HubConnectionState.Connected) return;

      // SignalR JSON protocol serializa byte[] como Base64 — enviamos string Base64
      this.connection
        .invoke('SendUpdate', documentId, this.toBase64(update))
        .catch((err) => console.error('[Collaboration] Erro ao enviar update:', err));
    });

    return this.ydoc;
  }

  // ─────────────────────────────────────────────────────────────
  // Enviar estado de awareness (cursor, nome)
  // ─────────────────────────────────────────────────────────────

  sendAwareness(documentId: number, state: CollaboratorState): void {
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;
    this.connection
      .invoke('SendAwareness', documentId, JSON.stringify(state))
      .catch(() => {});
  }

  // ─────────────────────────────────────────────────────────────
  // Guardar snapshot Y.Doc completo na BD
  // Chamar periodicamente (ex: cada 30 segundos)
  // ─────────────────────────────────────────────────────────────

  saveSnapshot(documentId: number): void {
    if (!this.ydoc) return;
    if (this.connection?.state !== signalR.HubConnectionState.Connected) return;

    const snapshot = Y.encodeStateAsUpdate(this.ydoc);
    this.connection
      .invoke('SaveSnapshot', documentId, this.toBase64(snapshot))
      .catch((err) => console.error('[Collaboration] Erro ao guardar snapshot:', err));
  }

  // ─────────────────────────────────────────────────────────────
  // Desconectar e limpar recursos
  // ─────────────────────────────────────────────────────────────

  async disconnect(): Promise<void> {
    // Guardar snapshot final antes de desconectar
    if (this.ydoc && this.currentDocumentId !== null) {
      this.saveSnapshot(this.currentDocumentId);
    }

    this.binding?.destroy();
    this.binding = null;

    if (this.connection) {
      if (
        this.currentDocumentId !== null &&
        this.connection.state === signalR.HubConnectionState.Connected
      ) {
        try {
          await this.connection.invoke('LeaveDocument', this.currentDocumentId);
        } catch {}
      }
      await this.connection.stop();
      this.connection = null;
    }

    this.ydoc?.destroy();
    this.ydoc = null;
    this.currentDocumentId = null;
    this.collaborators.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // Handlers de mensagens recebidas do servidor
  // ─────────────────────────────────────────────────────────────

  private registerHandlers(documentId: number): void {
    if (!this.connection) return;

    // Update Yjs binário recebido de outro cliente (Base64 string via SignalR JSON protocol)
    this.connection.on('ReceiveUpdate', (updateBase64: string) => {
      if (this.ydoc && updateBase64) {
        // Marcar como 'remote' para não reenviar ao servidor
        Y.applyUpdate(this.ydoc, this.fromBase64(updateBase64), 'remote');
      }
    });

    // Estado de awareness de outro cliente (cursor, nome)
    this.connection.on(
      'ReceiveAwareness',
      (connectionId: string, stateJson: string) => {
        try {
          const state: CollaboratorState = JSON.parse(stateJson);
          state.connectionId = connectionId; // preencher com o connectionId real
          this.collaborators.set(connectionId, state);
          this.awarenessUpdate$.next({ connectionId, state });
        } catch {}
      }
    );

    // Utilizador entrou
    this.connection.on('UserJoined', (userId: string) => {
      console.info(`[Collaboration] Utilizador ${userId} entrou no documento`);
    });

    // Utilizador saiu → remover do awareness e notificar
    this.connection.on('UserLeft', (userId: string) => {
      console.info(`[Collaboration] Utilizador ${userId} saiu do documento`);
      for (const [connId, state] of this.collaborators.entries()) {
        if (state.userId === userId) {
          this.collaborators.delete(connId);
          this.userLeft$.next(connId); // notificar com connectionId para remover cursor
        }
      }
    });

    // Reconexão → re-entrar no grupo
    this.connection.onreconnected(async () => {
      console.info('[Collaboration] Reconectado — a re-entrar no documento');
      await this.connection!.invoke('JoinDocument', documentId);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Procurar snapshot do backend
  // ─────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────
  // Helpers de serialização Base64 ↔ Uint8Array
  // SignalR JSON protocol usa Base64 para byte[] em C#
  // ─────────────────────────────────────────────────────────────

  private toBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private fromBase64(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  private async fetchSnapshot(documentId: number): Promise<Uint8Array | null> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ snapshot: string | null }>(
          `/api/documents/${documentId}/ydoc`
        )
      );
      if (!res.snapshot) return null;
      // Converter Base64 → Uint8Array
      const binary = atob(res.snapshot);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (err) {
      console.warn('[Collaboration] Não foi possível Procurar snapshot:', err);
      return null;
    }
  }
}