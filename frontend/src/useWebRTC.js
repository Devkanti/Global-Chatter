import { useState, useRef, useEffect, useCallback } from 'react';
import { socket } from './socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export function useWebRTC(currentUser) {
  const [callState, setCallState] = useState('idle'); // idle, ringing, incoming, connected
  const [callType, setCallType] = useState('video'); // video, audio
  const [callerName, setCallerName] = useState('');
  const [activeRoomId, setActiveRoomId] = useState('');
  
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pcRef = useRef(null);

  const cleanupCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setCallerName('');
    setActiveRoomId('');
    setIsMuted(false);
    setIsVideoOff(false);
  }, [localStream]);

  const initLocalStream = async (type) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      return null;
    }
  };

  const createPeerConnection = (roomId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:signal', { roomId, signal: { type: 'candidate', candidate: event.candidate } });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    return pc;
  };

  // INITIATE CALL (Outgoing)
  const initiateCall = async (roomId, targetName, type) => {
    setCallType(type);
    setCallerName(targetName);
    setActiveRoomId(roomId);
    setCallState('ringing');

    const stream = await initLocalStream(type);
    if (!stream) {
      cleanupCall();
      return;
    }

    socket.emit('call:initiate', { roomId, type });
  };

  // ACCEPT CALL (Incoming)
  const acceptCall = async () => {
    const stream = await initLocalStream(callType);
    if (!stream) return;

    setCallState('connected');
    const pc = createPeerConnection(activeRoomId);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    socket.emit('call:accept', { roomId: activeRoomId });
  };

  // DECLINE CALL
  const declineCall = () => {
    socket.emit('call:decline', { roomId: activeRoomId });
    cleanupCall();
  };

  // END CALL
  const endCall = () => {
    socket.emit('call:end', { roomId: activeRoomId });
    cleanupCall();
  };

  // TOGGLES
  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // SOCKET LISTENERS
  useEffect(() => {
    const handleIncoming = ({ roomId, type, callerName }) => {
      if (callState !== 'idle') {
        // Already in a call, busy!
        socket.emit('call:decline', { roomId });
        return;
      }
      setCallType(type);
      setCallerName(callerName);
      setActiveRoomId(roomId);
      setCallState('incoming');
    };

    const handleAccepted = async () => {
      if (callState !== 'ringing') return;
      setCallState('connected');
      
      const pc = createPeerConnection(activeRoomId);
      if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      }

      // We are the caller, we create the offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call:signal', { roomId: activeRoomId, signal: { type: 'offer', offer } });
    };

    const handleDeclined = () => {
      cleanupCall();
      alert('Call was declined or user is busy.');
    };

    const handleEnded = () => {
      cleanupCall();
    };

    const handleSignal = async ({ signal }) => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('call:signal', { roomId: activeRoomId, signal: { type: 'answer', answer } });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
        } else if (signal.type === 'candidate') {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:declined', handleDeclined);
    socket.on('call:ended', handleEnded);
    socket.on('call:signal', handleSignal);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:declined', handleDeclined);
      socket.off('call:ended', handleEnded);
      socket.off('call:signal', handleSignal);
    };
  }, [callState, activeRoomId, localStream, cleanupCall]);

  return {
    callState,
    callType,
    callerName,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo
  };
}
