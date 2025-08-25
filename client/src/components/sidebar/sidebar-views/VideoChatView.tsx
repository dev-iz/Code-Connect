import { useEffect, useRef, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import useResponsive from "@/hooks/useResponsive";
import Video from "./Video";
import Peer from "peerjs";
import { BiCamera, BiCameraOff, BiMicrophone, BiMicrophoneOff } from "react-icons/bi";
import { MdCallEnd } from "react-icons/md";

function VideoChatView() {
    const { viewHeight } = useResponsive();
    const [myStream, setMyStream] = useState<MediaStream | null>(null);
    const [streams, setStreams] = useState<{
        username: string;
        socketId: string;
        stream: MediaStream
    }[]>([]);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isMicOn, setIsMicOn] = useState(true);
    const [inCall, setInCall] = useState(false);
    const { socket } = useSocket();
    const myPeer = useRef<Peer | null>(null);
    const userMetadata = useRef<{
        username: string
        roomId: string
        socketId: string
    }[]>([]);


    const startStream = async () => {
        try {
            if (!socket.id) return;
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true,
            });
            myPeer.current = new Peer(socket.id);
            setMyStream(stream);
        } catch (error) {
            console.error("Failed to access media devices:", error);
        }
    };

    useEffect(() => {
        if (!myStream || !myPeer.current) return;

        // Handle incoming calls
        myPeer.current.on("call", (call) => {
            console.log("Received a call");
            call.answer(myStream); // Answer the call with the user's stream
            call.on("stream", (userVideoStream) => {
                console.log("Adding new user stream");
                setStreams(prev => {
                    const isDuplicate = prev.some(p => p.stream.id === userVideoStream.id)
                    console.log(userMetadata)
                    if (!isDuplicate) {
                        return [...prev, { username: (userMetadata.current.find(user => user.socketId === call.peer)?.username || ""), stream: userVideoStream, socketId: call.peer }]
                    }
                    return prev;
                });
            });
        });

        myPeer.current.on("open", (id) => {
            console.log("Peer Id: ", id)
            socket.emit("join-video-chat");
        })

        socket.on("all users", users => {
            userMetadata.current = users;
        })

        // Listen for when another user connects and initiate a call to them
        socket.on("user-connected-peer", (userId) => {
            if (myPeer.current) {
                const call = myPeer.current.call(userId, myStream!); // Call the user with your stream
                if (!call) {
                    console.log("No call connection")
                    return;
                }
                call.on("stream", (userVideoStream) => {
                    console.log("Adding connected user's stream");
                    setStreams(prev => {
                        const isDuplicate = prev.some(p => p.stream.id === userVideoStream.id)
                        if (!isDuplicate) {
                            return [...prev, { username: (userMetadata.current.find(user => user.socketId === userId)?.username || ""), stream: userVideoStream, socketId: userId }]
                        }
                        return prev;
                    });
                });
            }
        });

        // Listen for when another user disconnects
        socket.on("user-disconnected-peer", (userId) => {
            console.log("User disconnected:", userId);
            setStreams((prev) => prev.filter((stream) => stream.socketId !== userId)); // Remove their stream
        });

        return () => {
            socket.off("user-connected-peer");
            socket.off("user-disconnected-peer");
        };
    }, [socket, myStream]);

    // End the call and cleanup
    const handleEndCall = () => {
        if (myPeer.current) {
            myPeer.current.destroy(); // Destroy the peer connection
        }
        if (myStream) {
            myStream.getTracks().forEach((track) => track.stop()); // Stop tracks to release resources
            setMyStream(null)
        }
        setStreams([]); // Clear all streams from state
        setInCall(false);
        socket.emit("leave-video-chat-peer", socket.id); // Notify the server that the user has left
    };

    return (
        <div
            className="flex h-full w-full flex-col gap-2 p-4"
            style={{ height: viewHeight }}
        >
            <h1 className="view-title">Video Chat</h1>
            <div className="relative flex flex-col items-center justify-center bg-gray-900 p-4 rounded-lg shadow-lg w-full h-full overflow-auto">
                {inCall && <div className="absolute bottom-[90px] right-4">
                    <Video stream={myStream!} name={userMetadata.current.find(user => user.socketId === socket.id)?.username} isMy={true} />
                </div>}
                {!inCall && (
                    <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700" onClick={_ => {
                        startStream();
                        setInCall(true)
                    }}>
                        Join Video Chat
                    </button>
                )}
                {inCall && <div className="flex flex-wrap justify-start items-start h-full w-full">
                    {streams.map(({ username, stream }, index) => (
                        <Video key={index} stream={stream} name={username} isMy={false} />
                    ))}
                </div>}
                {inCall && <div className="flex space-x-2 absolute bottom-10">
                    <button
                        className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 flex gap-2 items-center justify-center"
                        onClick={handleEndCall}
                    >
                        End Call
                        <MdCallEnd />
                    </button>
                    <button className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex justify-center items-center gap-2" onClick={_ => {
                        myStream?.getVideoTracks().forEach(track => track.enabled = !track.enabled);
                        setIsCameraOn(prev => !prev)
                    }}>
                        Camera
                        {isCameraOn ?
                            <BiCamera /> :
                            <BiCameraOff />
                        }
                    </button>
                    <button className="bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 flex justify-center items-center gap-2" onClick={_ => {
                        myStream?.getAudioTracks().forEach(track => track.enabled = !track.enabled)
                        setIsMicOn(prev => !prev)
                    }}>
                        Mute
                        {
                            isMicOn ?
                                <BiMicrophone />
                                : <BiMicrophoneOff />
                        }
                    </button>
                </div>}
            </div>

        </div >
    );
}

export default VideoChatView;
