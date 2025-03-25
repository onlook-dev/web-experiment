export const GestureScreen = ({ remote }: { remote?: any }) => {
    const handleMouseMove = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!remote) return;
        await remote.mouseMove(e.clientX, e.clientY);
    }

    return (
        <div className="w-full h-full bg-red-500/10 absolute top-0 left-0"
            onMouseMove={handleMouseMove}
        ></div>
    )
};
