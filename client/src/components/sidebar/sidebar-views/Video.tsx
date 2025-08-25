import React from "react";

interface VideoProps {
    stream: MediaStream;
    name?: string; // Optional: Display name for the participant
    isMy: boolean;
}

function Video({ stream, name = "Participant", isMy }: VideoProps) {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative w-60 h-40 bg-black rounded-lg overflow-hidden shadow-lg">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                muted={isMy}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-center py-1">
                {name}
            </div>
        </div>
    );
}

export default Video;
