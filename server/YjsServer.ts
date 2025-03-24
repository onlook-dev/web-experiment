import fs from 'fs';
import { IncomingMessage } from 'http';
import * as decoding from 'lib0/decoding';
import * as encoding from 'lib0/encoding';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import type { ClientConnection, DocumentData } from './types';

// Get directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Message types (matching y-websocket implementation)
const messageSync = 0;
const messageAwareness = 1;

export class YjsServer {
    private docs: Map<string, DocumentData>;
    private connections: Map<WebSocket, ClientConnection>;
    private STORAGE_DIR: string;
    private saveInterval: NodeJS.Timer;
    private gcEnabled: boolean;

    constructor() {
        this.docs = new Map<string, DocumentData>();
        this.connections = new Map<WebSocket, ClientConnection>();
        this.STORAGE_DIR = path.join(__dirname, 'yjs-docs');
        this.gcEnabled = process.env.GC !== 'false' && process.env.GC !== '0';

        // Create storage directory if it doesn't exist
        if (!fs.existsSync(this.STORAGE_DIR)) {
            fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
        }

        // Set up periodic saving
        this.saveInterval = setInterval(() => this.persistAllDocuments(), 30000);
    }

    // Get or create a document
    private getDocument(docName: string): DocumentData {
        if (!this.docs.has(docName)) {
            const doc = new Y.Doc({ gc: this.gcEnabled });
            const docData: DocumentData = {
                doc,
                clients: new Map<string, WebSocket>()
            };
            this.docs.set(docName, docData);

            // Set up update handler
            doc.on('update', (update: Uint8Array, origin: any) => {
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, messageSync);
                syncProtocol.writeUpdate(encoder, update);
                const message = encoding.toUint8Array(encoder);

                // Broadcast to all connected clients
                docData.clients.forEach((ws) => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(message);
                    }
                });
            });

            // Try to load document from storage
            this.loadDocument(docName, doc);
        }
        return this.docs.get(docName)!;
    }

    // Load document from file
    private loadDocument(docName: string, doc: Y.Doc): void {
        const storagePath = path.join(this.STORAGE_DIR, `${docName}.bin`);
        try {
            if (fs.existsSync(storagePath)) {
                const persistedYDoc = fs.readFileSync(storagePath);
                Y.applyUpdate(doc, persistedYDoc);
                console.log(`Loaded document '${docName}' from disk`);
            }
        } catch (err) {
            console.error(`Error loading document '${docName}':`, err);
        }
    }

    // Save document to file
    private persistDocument(docName: string): void {
        if (!this.docs.has(docName)) return;

        const { doc } = this.docs.get(docName)!;
        const persistedYDoc = Y.encodeStateAsUpdate(doc);
        const storagePath = path.join(this.STORAGE_DIR, `${docName}.bin`);

        fs.writeFile(storagePath, persistedYDoc, err => {
            if (err) console.error(`Error saving document '${docName}':`, err);
            else console.log(`Document '${docName}' saved to disk`);
        });
    }

    // Save all documents
    public persistAllDocuments(): void {
        for (const docName of this.docs.keys()) {
            this.persistDocument(docName);
        }
    }

    // Add awareness handling
    private getAwareness(doc: Y.Doc): awarenessProtocol.Awareness {
        if (!doc.awareness) {
            doc.awareness = new awarenessProtocol.Awareness(doc);
        }
        return doc.awareness;
    }

    // Handle a new WebSocket connection
    public handleConnection(ws: WebSocket, req: IncomingMessage): void {
        ws.binaryType = 'arraybuffer';

        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const docName = url.searchParams.get('document') || 'default';
        const clientId = Math.random().toString(36).substring(2, 15);

        console.log(`Client ${clientId} connected to document '${docName}'`);

        // Store connection info
        this.connections.set(ws, { docName, clientId });

        // Get or create the document
        const { doc, clients } = this.getDocument(docName);
        const awareness = this.getAwareness(doc);
        clients.set(clientId, ws);

        // Set up ping/pong
        let pongReceived = true;
        const pingInterval = setInterval(() => {
            if (!pongReceived) {
                this.closeConnection(ws);
                clearInterval(pingInterval);
            } else if (clients.has(clientId)) {
                pongReceived = false;
                try {
                    ws.ping();
                } catch (e) {
                    this.closeConnection(ws);
                    clearInterval(pingInterval);
                }
            }
        }, 30000);

        ws.on('pong', () => {
            pongReceived = true;
        });

        // Set up message handler
        ws.on('message', (message: WebSocket.Data) => {
            try {
                const update = message instanceof ArrayBuffer ? new Uint8Array(message) :
                    Buffer.isBuffer(message) ? new Uint8Array(message) :
                        message instanceof Uint8Array ? message : null;

                if (!update) {
                    console.error('Unsupported message format:', typeof message);
                    return;
                }

                const decoder = decoding.createDecoder(update);
                const encoder = encoding.createEncoder();
                const messageType = decoding.readVarUint(decoder);

                switch (messageType) {
                    case messageSync:
                        encoding.writeVarUint(encoder, messageSync);
                        syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
                        if (encoding.length(encoder) > 1) {
                            ws.send(encoding.toUint8Array(encoder));
                        }
                        break;

                    case messageAwareness:
                        const awarenessUpdate = decoding.readVarUint8Array(decoder);
                        awarenessProtocol.applyAwarenessUpdate(awareness, awarenessUpdate, ws);
                        clients.forEach((client, cid) => {
                            if (cid !== clientId && client.readyState === WebSocket.OPEN) {
                                client.send(update);
                            }
                        });
                        break;
                }
            } catch (err) {
                console.error('Error processing message:', err);
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            this.closeConnection(ws);
            clearInterval(pingInterval);
        });

        // Send initial sync step 1
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeSyncStep1(encoder, doc);
        ws.send(encoding.toUint8Array(encoder));

        // Send initial awareness states
        const awarenessStates = awareness.getStates();
        if (awarenessStates.size > 0) {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageAwareness);
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awarenessStates.keys()))
            );
            ws.send(encoding.toUint8Array(encoder));
        }
    }

    private closeConnection(ws: WebSocket): void {
        const conn = this.connections.get(ws);
        if (!conn) return;

        const { docName, clientId } = conn;
        console.log(`Client ${clientId} disconnected from '${docName}'`);

        if (this.docs.has(docName)) {
            const docData = this.docs.get(docName)!;
            const awareness = this.getAwareness(docData.doc);

            awarenessProtocol.removeAwarenessStates(awareness, [clientId], null);
            docData.clients.delete(clientId);

            if (docData.clients.size === 0) {
                this.persistDocument(docName);
                // Optional: Unload from memory
                // this.docs.delete(docName);
            }
        }

        this.connections.delete(ws);
        ws.close();
    }

    // Close the server and clean up
    public close(): void {
        console.log('Shutting down YJS server, persisting all documents...');
        clearInterval(this.saveInterval);
        this.persistAllDocuments();

        // Close all connections
        for (const ws of this.connections.keys()) {
            try {
                ws.close();
            } catch (err) {
                console.error('Error closing WebSocket:', err);
            }
        }
    }
}

// Create a singleton instance
export const yjsServer = new YjsServer(); 