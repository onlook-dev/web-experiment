import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import fs from "fs";
import * as encoding from 'lib0/encoding';
import path from "path";
import { fileURLToPath } from "url";
import { WebSocket } from "ws";
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as Y from 'yjs';
import { YjsServer } from "../src/yjs/yjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("YjsServer", () => {
    let server: YjsServer;
    let mockWs: WebSocket;
    let mockReq: any;

    beforeEach(() => {
        server = new YjsServer();

        mockWs = {
            binaryType: "",
            send: mock(() => { }),
            on: mock((event: string, callback: any) => { }),
            ping: mock(() => { }),
            close: mock(() => { }),
            readyState: WebSocket.OPEN,
        } as any;

        mockReq = {
            url: "ws://localhost:1234?document=test-doc",
            headers: {
                host: "localhost:1234"
            }
        };
    });

    afterEach(() => {
        server.close();
        // Clean up test documents
        const storageDir = path.join(__dirname, "../src/yjs/data");
        if (fs.existsSync(storageDir)) {
            const files = fs.readdirSync(storageDir);
            files.forEach(file => {
                if (file.startsWith("test-")) {
                    fs.unlinkSync(path.join(storageDir, file));
                }
            });
        }
    });

    test("should handle new connections", () => {
        server.handleConnection(mockWs, mockReq);
        expect(mockWs.binaryType).toBe("arraybuffer");
        expect(mockWs.on).toHaveBeenCalledTimes(3);
        expect(mockWs.send).toHaveBeenCalled();
    });

    test("should persist documents", async () => {
        server.handleConnection(mockWs, mockReq);

        // Create and apply an update to ensure there's content to persist
        const doc = new Y.Doc();
        const text = doc.getText("test");
        text.insert(0, "Hello, World!");
        const update = Y.encodeStateAsUpdate(doc);

        // Simulate update message
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        syncProtocol.writeUpdate(encoder, update);
        const message = encoding.toUint8Array(encoder);

        // Find and call the message handler
        const messageHandler = mockWs.on.mock.calls.find(call => call[0] === "message")[1];
        messageHandler(message);

        // Force a document save and wait a bit for the async operation
        server.persistAllDocuments();
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if file exists
        const docPath = path.join(__dirname, "../src/yjs/data/test-doc.bin");
        expect(fs.existsSync(docPath)).toBe(true);
    });

    test("should handle document updates", () => {
        const doc = new Y.Doc();
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        syncProtocol.writeSyncStep1(encoder, doc);
        const mockUpdate = encoding.toUint8Array(encoder);

        let messageHandler: Function;
        mockWs.on = mock((event: string, callback: any) => {
            if (event === "message") {
                messageHandler = callback;
            }
        });

        server.handleConnection(mockWs, mockReq);
        messageHandler(mockUpdate);
        expect(mockWs.send).toHaveBeenCalled();
    });

    test("should handle awareness updates", () => {
        const doc = new Y.Doc();
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 1);

        const awareness = new awarenessProtocol.Awareness(doc);
        awareness.setLocalState({ user: { name: "Test User" } });
        const update = awarenessProtocol.encodeAwarenessUpdate(awareness, [awareness.clientID]);
        encoding.writeVarUint8Array(encoder, update);

        const mockAwarenessUpdate = encoding.toUint8Array(encoder);

        let messageHandler: Function;
        mockWs.on = mock((event: string, callback: any) => {
            if (event === "message") {
                messageHandler = callback;
            }
        });

        server.handleConnection(mockWs, mockReq);
        messageHandler(mockAwarenessUpdate);
        expect(mockWs.send).toHaveBeenCalled();
    });
});
