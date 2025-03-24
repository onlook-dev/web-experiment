import { Editor } from '@/components/Editor';
import { Frame } from '@/components/Frame';

export default function Home() {
    return (
        <div className="flex flex-row items-center justify-center h-screen">
            <div className="w-1/2 h-full">
                <Frame />
            </div>
            <div className="w-1/2 h-full">
                <Editor />
            </div>
        </div>
    );
}
