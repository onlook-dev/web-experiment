import fs from 'fs';
import path from 'path';
import * as Y from 'yjs';

const YJS_DOC_NAME = 'codemirror';
const TEXT_FILE_PATH = "/Users/kietho/workplace/onlook/web/test-project/app/page.tsx";

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
        const txtPath = TEXT_FILE_PATH;

        console.log(txtPath);
        try {
            // Check if both files exist
            if (fs.existsSync(txtPath) && fs.existsSync(binPath)) {
                const txtStats = fs.statSync(txtPath);
                const binStats = fs.statSync(binPath);

                // If text file is newer, use its content
                if (txtStats.mtime > binStats.mtime) {
                    const textContent = fs.readFileSync(txtPath, 'utf8');
                    doc.getText(YJS_DOC_NAME).delete(0, doc.getText(YJS_DOC_NAME).length);
                    doc.getText(YJS_DOC_NAME).insert(0, textContent);
                } else {
                    // Load binary state as before
                    const persistedYDoc = fs.readFileSync(binPath);
                    Y.applyUpdate(doc, persistedYDoc);
                }
            } else if (fs.existsSync(txtPath)) {
                // Only text file exists
                const textContent = fs.readFileSync(txtPath, 'utf8');
                doc.getText(YJS_DOC_NAME).insert(0, textContent);
            } else if (fs.existsSync(binPath)) {
                // Only binary file exists
                const persistedYDoc = fs.readFileSync(binPath);
                Y.applyUpdate(doc, persistedYDoc);
            }
        } catch (err) {
            console.error(`Error loading document '${docName}':`, err);
        }
    }

    public persistDocument(docName: string, doc: Y.Doc): void {
        this.persistDocumentState(docName, doc);
        this.saveDocumentText(docName, doc);
    }

    public persistDocumentState(docName: string, doc: Y.Doc): void {
        const persistedYDoc = Y.encodeStateAsUpdate(doc);
        const storagePath = path.join(this.storageDir, `${docName}.bin`);

        fs.writeFile(storagePath, persistedYDoc, err => {
            if (err) console.error(`Error saving document '${docName}':`, err);
        });
    }

    public persistDocuments(docs: Map<string, { doc: Y.Doc }>): void {
        for (const [docName, { doc }] of docs.entries()) {
            this.persistDocument(docName, doc);
        }
    }

    public saveDocumentText(docName: string, doc: Y.Doc): void {
        const text = doc.getText(YJS_DOC_NAME);
        const content = text.toString();
        const storagePath = TEXT_FILE_PATH;

        fs.writeFile(storagePath, content, 'utf8', err => {
            if (err) console.error(`Error saving text content for '${docName}':`, err);
        });
    }

    public loadDocumentText(docName: string): string | null {
        const storagePath = path.join(this.storageDir, TEXT_FILE_PATH);
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