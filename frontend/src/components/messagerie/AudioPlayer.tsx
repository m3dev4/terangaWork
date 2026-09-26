import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  isMine: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, isMine }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 py-1 min-w-[200px] max-w-[260px] ${isMine ? 'text-white' : 'text-neutral-800'}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`
          w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer
          ${isMine
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-[#1b4b6b] hover:bg-[#143952] text-white'
          }
        `}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform & Scrubber */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="relative flex items-center h-4 group">
          {/* Waveform bars simulation */}
          <div className="absolute inset-0 flex items-center gap-0.5 pointer-events-none opacity-40">
            {[40, 70, 30, 90, 60, 100, 50, 80, 40, 70, 90, 30, 60, 100, 50, 80, 40, 60].map((h, i) => {
              const barPercent = (i / 18) * 100;
              const isPassed = barPercent <= progressPercent;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isMine
                      ? isPassed ? 'bg-white' : 'bg-white/40'
                      : isPassed ? 'bg-[#1b4b6b]' : 'bg-neutral-300'
                  }`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>

          {/* Invisible Range Input for seeking */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full opacity-0 cursor-pointer h-4 z-10"
          />
        </div>

        {/* Timer */}
        <div className={`flex justify-between text-[9.5px] font-mono ${isMine ? 'text-white/70' : 'text-neutral-400'}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
