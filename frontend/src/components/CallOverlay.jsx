import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PictureInPicture, Maximize, Minimize, SwitchCamera } from 'lucide-react';

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
  isScreenSharing,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleCamera
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const container = document.querySelector('.call-container');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.log(err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => console.log(err));
    }
  };

  const togglePiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (remoteVideoRef.current && callType === 'video') {
        await remoteVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error(err);
    }
  };

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
        
        {/* Local Video Background (for Video Calls) */}
        {callType === 'video' && localStream && (
          <video 
            ref={localVideoRef} 
            className={`local-video-bg ${callState === 'connected' ? 'pip-mode' : 'fullscreen-mode'} ${isVideoOff ? 'hidden' : ''}`} 
            autoPlay 
            playsInline 
            muted 
          />
        )}

        {/* Incoming Call Screen */}
        {callState === 'incoming' && (
          <div className={`incoming-call-screen ${callType === 'video' ? 'glass-overlay' : ''}`}>
            <div className="avatar-wrapper">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="avatar-large">{callerName?.[0]?.toUpperCase()}</div>
            </div>
            <h2 className="caller-name">{callerName}</h2>
            <p className="call-status">Incoming {callType} call...</p>
            
            <div className="call-actions">
              <button className="btn-decline" onClick={onDecline}>
                <PhoneOff size={24} />
              </button>
              <button className="btn-accept" onClick={onAccept}>
                {callType === 'video' ? <Video size={24} /> : <Phone size={24} />}
              </button>
            </div>
          </div>
        )}

        {/* Ringing (Outgoing) Screen */}
        {callState === 'ringing' && (
          <div className={`incoming-call-screen ${callType === 'video' ? 'glass-overlay' : ''}`}>
            <div className="avatar-wrapper">
              <div className="pulse-ring"></div>
              <div className="pulse-ring delay-1"></div>
              <div className="avatar-large">{callerName?.[0]?.toUpperCase()}</div>
            </div>
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
                <div className="audio-waves">
                  <div className="wave"></div>
                  <div className="wave delay-1"></div>
                  <div className="wave delay-2"></div>
                </div>
                <div className="avatar-xl">{callerName?.[0]?.toUpperCase()}</div>
                <h2 className="audio-caller-name">{callerName}</h2>
                <p className="audio-call-duration">Connected</p>
                <audio ref={remoteVideoRef} autoPlay />
              </div>
            )}

            {/* Call Controls */}
            <div className="call-controls-bar">
              <button className={`control-btn ${isMuted ? 'disabled' : ''}`} onClick={onToggleMute}>
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              
              {callType === 'video' && (
                <>
                  <button className="control-btn" onClick={onToggleCamera} title="Flip Camera">
                    <SwitchCamera size={20} />
                  </button>
                  <button className={`control-btn ${isVideoOff ? 'disabled' : ''}`} onClick={onToggleVideo} title="Toggle Video">
                    {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>
                  <button className={`control-btn ${isScreenSharing ? 'active' : ''}`} onClick={onToggleScreenShare} title="Screen Share">
                    {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
                  </button>
                  <button className="control-btn" onClick={togglePiP} title="Picture in Picture">
                    <PictureInPicture size={20} />
                  </button>
                  <button className="control-btn" onClick={toggleFullscreen} title="Fullscreen">
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                  </button>
                </>
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
