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
        const binPath = path.join(this.storageDir, `${docName}.bin`);
        try {
            const persistedYDoc = fs.readFileSync(binPath);
            Y.applyUpdate(doc, persistedYDoc);
        } catch (err) {
            console.error(`Error loading document '${docName}':`, err);
        }
    }

    persistDocumentState(docName: string, doc: Y.Doc): void {
        const persistedYDoc = Y.encodeStateAsUpdate(doc);
        const storagePath = path.join(this.storageDir, `${docName}.bin`);

        // Test only
        this.saveDocumentText(docName, doc);
        // End test

        fs.writeFile(storagePath, persistedYDoc, err => {
            if (err) console.error(`Error saving document '${docName}':`, err);
        });
    }

    public persistDocuments(docs: Map<string, { doc: Y.Doc }>): void {
        for (const [docName, { doc }] of docs.entries()) {
            this.persistDocumentState(docName, doc);
        }
    }

    public saveDocumentText(docName: string, doc: Y.Doc): void {
        const text = doc.getText('code');
        const content = text.toString();
        const storagePath = '/Users/kietho/workplace/onlook/web/test-project/app/page.tsx';

        fs.writeFile(storagePath, content, 'utf8', err => {
            if (err) console.error(`Error saving text content for '${docName}':`, err);
        });
    }
}
