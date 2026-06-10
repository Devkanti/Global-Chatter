import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, PhoneCall, Mic, MicOff, Video, VideoOff } from 'lucide-react';

export default function CallOverlay({ 
  callState, 
  callType, 
  callerName, 
  localStream, 
  remoteStream, 
  onAccept, 
  onDecline, 
  onEnd,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === 'idle') return null;

  return (
    <div className="call-overlay animate-fade-in">
      <div className="call-container">
        
        {/* Incoming Call Screen */}
        {callState === 'incoming' && (
          <div className="incoming-call-screen">
            <div className="pulse-ring"></div>
            <div className="avatar-large">{callerName?.[0]?.toUpperCase()}</div>
            <h2 className="caller-name">{callerName}</h2>
            <p className="call-status">Incoming {callType} call...</p>
            
            <div className="call-actions">
              <button className="btn-decline" onClick={onDecline}>
                <PhoneOff size={24} />
              </button>
              <button className="btn-accept" onClick={onAccept}>
                <Phone size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Ringing (Outgoing) Screen */}
        {callState === 'ringing' && (
          <div className="incoming-call-screen">
            <div className="avatar-large">{callerName?.[0]?.toUpperCase()}</div>
            <h2 className="caller-name">Calling {callerName}...</h2>
            <p className="call-status">Ringing...</p>
            
            <div className="call-actions">
              <button className="btn-decline" onClick={onEnd}>
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        )}

        {/* Connected Call Screen */}
        {callState === 'connected' && (
          <div className="connected-call-screen">
            {/* Remote Video / Audio */}
            {callType === 'video' ? (
              <video 
                ref={remoteVideoRef} 
                className="remote-video" 
                autoPlay 
                playsInline 
              />
            ) : (
              <div className="audio-only-screen">
                <div className="avatar-xl">{callerName?.[0]?.toUpperCase()}</div>
                <h2>{callerName}</h2>
                <p>00:00</p>
                <audio ref={remoteVideoRef} autoPlay />
              </div>
            )}

            {/* Local Video Mini-Window */}
            {callType === 'video' && localStream && (
              <video 
                ref={localVideoRef} 
                className={`local-video ${isVideoOff ? 'hidden' : ''}`} 
                autoPlay 
                playsInline 
                muted 
              />
            )}

            {/* Call Controls */}
            <div className="call-controls-bar">
              <button className={`control-btn ${isMuted ? 'disabled' : ''}`} onClick={onToggleMute}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              {callType === 'video' && (
                <button className={`control-btn ${isVideoOff ? 'disabled' : ''}`} onClick={onToggleVideo}>
                  {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}

              <button className="btn-end-call" onClick={onEnd}>
                <PhoneOff size={20} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
