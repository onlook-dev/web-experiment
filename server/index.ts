import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a server-side YJS document handler
class YjsServerImpl {
    constructor() {
        this.docs = new Map(); // Map to store documents by name
        this.connections = new Map(); // Track all connections
        this.STORAGE_DIR = path.join(__dirname, 'yjs-docs');

        // Create storage directory if it doesn't exist
        if (!fs.existsSync(this.STORAGE_DIR)) {
            fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
        }

        // Set up periodic saving
        this.saveInterval = setInterval(() => this.persistAllDocuments(), 30000);
    }

    // Get or create a document
    getDocument(docName) {
        if (!this.docs.has(docName)) {
            const doc = new Y.Doc();
            this.docs.set(docName, {
                doc,
                clients: new Map()
            });

            // Try to load document from storage
            this.loadDocument(docName, doc);
        }
        return this.docs.get(docName);
    }

    // Load document from file
    loadDocument(docName, doc) {
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
    persistDocument(docName) {
        if (!this.docs.has(docName)) return;

        const { doc } = this.docs.get(docName);
        const persistedYDoc = Y.encodeStateAsUpdate(doc);
        const storagePath = path.join(this.STORAGE_DIR, `${docName}.bin`);

        fs.writeFile(storagePath, persistedYDoc, err => {
            if (err) console.error(`Error saving document '${docName}':`, err);
            else console.log(`Document '${docName}' saved to disk`);
        });
    }

    // Save all documents
    persistAllDocuments() {
        for (const docName of this.docs.keys()) {
            this.persistDocument(docName);
        }
    }

    // Handle a new WebSocket connection
    handleConnection(ws, req) {
        // Extract document name from URL or query params
        const url = new URL(req.url, `http://${req.headers.host}`);
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
        ws.on('message', (message) => {
            try {
                // Ensure message is Uint8Array
                let update;
                if (message instanceof ArrayBuffer) {
                    update = new Uint8Array(message);
                } else if (message instanceof Buffer) {
                    update = new Uint8Array(message);
                } else if (message instanceof Uint8Array) {
                    update = message;
                } else {
                    console.error('Unsupported message format:', typeof message);
                    return;
                }

                // Apply update to document
                Y.applyUpdate(doc, update);

                // Broadcast to all other clients on this document
                clients.forEach((client, cid) => {
                    if (cid !== clientId && client.readyState === ws.OPEN) {
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
                this.docs.get(docName).clients.delete(clientId);

                // If no clients left, consider unloading the document from memory
                if (this.docs.get(docName).clients.size === 0) {
                    // Save one last time before unloading
                    this.persistDocument(docName);
                    // Keep the document in memory for now, but could unload if memory is a concern
                    // this.docs.delete(docName);
                }
            }

            this.connections.delete(ws);
        });
    }

    // Close the server and clean up
    close() {
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
export const yjsServer = new YjsServerImpl();

// Main server code
const PORT = (process.env['PORT'] || 1234);
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws, req) => {
    // This handler will normalize messages before passing to the Yjs handler
    ws.on('message', (message) => {
        const arrayBuffer = message instanceof Uint8Array
            ? message.buffer
            : message;

        console.log('Received message type:', typeof arrayBuffer);
        // No need to do anything here as the Yjs handler will process the message
    });

    console.log('Connection established', req.url);
    yjsServer.handleConnection(ws, req);
});

console.log(`Yjs Server running on port ${PORT}`);

// Handle shutdown
process.on('SIGINT', () => {
    yjsServer.close();
    process.exit(0);
});