import fs from 'fs';
import { IncomingMessage } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket } from 'ws';
import * as Y from 'yjs';
import type { ClientConnection, DocumentData } from './types';

// Get directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class YjsServer {
    private docs: Map<string, DocumentData>;
    private connections: Map<WebSocket, ClientConnection>;
    private STORAGE_DIR: string;
    private saveInterval: NodeJS.Timer;

    constructor() {
        this.docs = new Map<string, DocumentData>();
        this.connections = new Map<WebSocket, ClientConnection>();
        this.STORAGE_DIR = path.join(__dirname, 'yjs-docs');

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
            const doc = new Y.Doc();
            const docData: DocumentData = {
                doc,
                clients: new Map<string, WebSocket>()
            };
            this.docs.set(docName, docData);

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

    // Handle a new WebSocket connection
    public handleConnection(ws: WebSocket, req: IncomingMessage): void {
        // Extract document name from URL or query params
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        const docName = url.searchParams.get('document') || 'default';
        const clientId = Math.random().toString(36).substring(2, 15);

        console.log(`Client ${clientId} connected to document '${docName}'`);

        // Store connection info
        this.connections.set(ws, {
            docName,
            clientId
        });

        // Get or create the document
        const { doc, clients } = this.getDocument(docName);
        clients.set(clientId, ws);

        // Send initial document state
        const initialSync = Y.encodeStateAsUpdate(doc);
        ws.send(initialSync);

        // Set up message handler
        ws.on('message', (message: WebSocket.Data) => {
            try {
                // Ensure message is Uint8Array
                let update: Uint8Array;

                if (message instanceof ArrayBuffer) {
                    update = new Uint8Array(message);
                } else if (Buffer.isBuffer(message)) {
                    update = new Uint8Array(message);
                } else if (message instanceof Uint8Array) {
                    update = message;
                } else if (typeof message === 'string') {
                    // Try to handle string messages (not standard for Yjs, but just in case)
                    console.warn('Received string message instead of binary');
                    try {
                        // Try to parse as base64 or JSON
                        const buf = Buffer.from(message, 'base64');
                        update = new Uint8Array(buf);
                    } catch (e) {
                        console.error('Could not convert string message to binary update');
                        return;
                    }
                } else {
                    console.error('Unsupported message format:', typeof message);
                    return;
                }

                // Apply update to document
                Y.applyUpdate(doc, update);

                // Broadcast to all other clients on this document
                clients.forEach((client, cid) => {
                    if (cid !== clientId && client.readyState === WebSocket.OPEN) {
                        client.send(update);
                    }
                });

                // Save after each update
                this.persistDocument(docName);
            } catch (err) {
                console.error('Error processing message:', err);
            }
        });

        // Handle disconnection
        ws.on('close', () => {
            console.log(`Client ${clientId} disconnected from '${docName}'`);

            // Clean up
            if (this.docs.has(docName)) {
                const docData = this.docs.get(docName)!;
                docData.clients.delete(clientId);

                // If no clients left, consider unloading the document from memory
                if (docData.clients.size === 0) {
                    // Save one last time before unloading
                    this.persistDocument(docName);
                    // Optional: Unload from memory if memory is a concern
                    // this.docs.delete(docName);
                }
            }

            this.connections.delete(ws);
        });
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