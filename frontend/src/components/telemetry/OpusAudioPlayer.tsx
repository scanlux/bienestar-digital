'use client';

import React, { useRef, useState, useEffect } from 'react';
import { FileItem } from './RemoteFileTable';

interface OpusAudioPlayerProps {
  deviceId: string;
  file: FileItem | null;
  onClose: () => void;
}

export const OpusAudioPlayer: React.FC<OpusAudioPlayerProps> = ({
  deviceId,
  file,
  onClose
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioUrl = file
    ? `/api/telemetry/file-content?deviceId=${encodeURIComponent(deviceId)}&filePath=${encodeURIComponent(file.relativePath || file.name || file.path)}`
    : '';

  useEffect(() => {
    if (!file || !audioUrl) return;

    setAudioError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);

    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch((err) => {
        console.warn('Auto-play blocked or error loading audio:', err);
        setIsPlaying(false);
      });
    }
  }, [file, audioUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    audioRef.current.muted = nextMute;
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  if (!file) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-4xl bg-gray-900 text-white rounded-2xl p-4 shadow-2xl z-50 border border-gray-800 backdrop-blur-md bg-opacity-95 transition-all animate-slideUp">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onError={() => setAudioError('No se pudo reproducir el archivo de audio. Verifique el formato en el servidor.')}
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* File Info */}
        <div className="flex items-center gap-3 w-full sm:w-1/3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
            🎙️
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-white truncate" title={file.name}>
              {file.name}
            </div>
            <div className="text-[11px] text-gray-400 font-mono truncate">
              {deviceId}
            </div>
          </div>
        </div>

        {/* Player Controls & Seekbar */}
        <div className="flex-1 w-full flex flex-col items-center gap-2">
          {/* Play/Pause & Speed Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayPause}
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold flex items-center justify-center transition-transform hover:scale-105 shadow-md"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* Speed Pills */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1 text-[11px] font-semibold text-gray-300">
              {[1, 1.25, 1.5, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-2 py-0.5 rounded ${
                    playbackRate === speed ? 'bg-emerald-600 text-white font-bold' : 'hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Seekbar */}
          <div className="w-full flex items-center gap-3 text-[11px] font-mono text-gray-400">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume & Close */}
        <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
          {/* Volume Control */}
          <div className="hidden md:flex items-center gap-2">
            <button onClick={toggleMute} className="text-gray-400 hover:text-white text-xs">
              {isMuted || volume === 0 ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center font-bold text-base transition-colors"
          >
            &times;
          </button>
        </div>
      </div>

      {audioError && (
        <div className="mt-2 text-center text-[11px] font-medium text-rose-400 bg-rose-950/40 py-1 px-3 rounded-lg">
          {audioError}
        </div>
      )}
    </div>
  );
};
