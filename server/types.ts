import { WebSocket } from 'ws';
import * as Y from 'yjs';

export interface ClientConnection {
    docName: string;
    clientId: string;
}

export interface DocumentData {
    doc: Y.Doc;
    clients: Map<string, WebSocket>;
} 