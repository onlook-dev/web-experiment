import fs from 'fs';
import path from 'path';
import * as Y from 'yjs';

export class DocumentPersistence {
    private storageDir: string;

    constructor(storageDir: string) {
        this.storageDir = storageDir;
        this.ensureStorageDirectory();
    }

    private ensureStorageDirectory(): void {
        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
    }

    public loadDocument(docName: string, doc: Y.Doc): void {
        const storagePath = path.join(this.storageDir, `${docName}.bin`);
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

    public persistDocument(docName: string, doc: Y.Doc): void {
        console.log(`Persisting document '${docName}'`);
        this.persistDocumentState(docName, doc);
        this.saveDocumentText(docName, doc);
    }

    public persistDocumentState(docName: string, doc: Y.Doc): void {
        const persistedYDoc = Y.encodeStateAsUpdate(doc);
        const storagePath = path.join(this.storageDir, `${docName}.bin`);

        fs.writeFile(storagePath, persistedYDoc, err => {
            if (err) console.error(`Error saving document '${docName}':`, err);
            else console.log(`Document '${docName}' saved to disk`);
        });
    }

    public persistDocuments(docs: Map<string, { doc: Y.Doc }>): void {
        for (const [docName, { doc }] of docs.entries()) {
            this.persistDocument(docName, doc);
        }
    }

    public saveDocumentText(docName: string, doc: Y.Doc): void {
        const text = doc.getText('codemirror');
        const content = text.toString();
        const storagePath = path.join(this.storageDir, `${docName}.txt`);

        fs.writeFile(storagePath, content, 'utf8', err => {
            if (err) console.error(`Error saving text content for '${docName}':`, err);
            else console.log(`Text content for '${docName}' saved to disk`);
        });
    }

    public loadDocumentText(docName: string): string | null {
        const storagePath = path.join(this.storageDir, `${docName}.txt`);
        try {
            if (fs.existsSync(storagePath)) {
                const content = fs.readFileSync(storagePath, 'utf8');
                return content;
            }
        } catch (err) {
            console.error(`Error loading text content for '${docName}':`, err);
        }
        return null;
    }

    public saveDocumentTextAndState(docName: string, doc: Y.Doc): void {
        // Save both the Y.js state and the plain text content
        this.persistDocumentState(docName, doc);
        this.saveDocumentText(docName, doc);
    }
} 