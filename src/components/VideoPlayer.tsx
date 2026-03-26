import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Square,
  Play,
  Pause,
  Upload,
  Trash2,
  Download,
  Share2,
  Mic,
  MicOff,
  Timer,
  Pencil,
  ArrowRight,
  Circle as CircleIcon,
  Square as SquareIcon,
  Minus,
  Eraser,
  X,
  FastForward,
  Rewind,
  RulerIcon,
  SkipBack,
  SkipForward,
  Mail,
  FolderDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnnotationCanvas } from './AnnotationCanvas';
import { Tool, Annotation, AppSettings } from '../types';
import { COLORS, PLAYBACK_SPEEDS } from '../constants';
import { saveVideo, deleteVideo, VideoRecord } from '../db';

interface VideoPlayerProps {
  id: string;
  title: string;
  settings: AppSettings;
  onClose?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ id, title, settings, onClose }) => {
  const [mode, setMode] = useState<'idle' | 'recording' | 'playing' | 'review'>('idle');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlobRef, setVideoBlobRef] = useState<Blob | null>(null);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeTool, setActiveTool] = useState<Tool>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const safePlay = async (video: HTMLVideoElement | null) => {
    if (!video) return;
    try {
      await video.play();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Video play error:", err);
      }
    }
  };

  // Progress bar update loop
  const updateProgress = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      setProgress(videoRef.current.currentTime);
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(updateProgress);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [isPlaying, updateProgress]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await safePlay(videoRef.current);
      }
      setMode('idle');
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startRecording = async () => {
    if (!streamRef.current) return;

    // Build combined stream: video + optional audio mic
    const combinedStream = new MediaStream();
    streamRef.current.getVideoTracks().forEach(t => combinedStream.addTrack(t));

    if (settings.enableAudio) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = audioStream;
        audioStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      } catch (err) {
        console.warn("Micro non disponible, enregistrement sans audio:", err);
      }
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoBlobRef(blob);
      setMode('review');
      stopCamera();

      // Save to IndexedDB
      const videoId = `video_${Date.now()}`;
      setCurrentVideoId(videoId);
      const record: VideoRecord = {
        id: videoId,
        blob,
        name: `${title} - ${new Date().toLocaleTimeString('fr-FR')}`,
        createdAt: Date.now(),
      };
      saveVideo(record).catch(console.error);

      // Auto-playback
      if (settings.autoPlayback) {
        setTimeout(async () => {
          if (videoRef.current) {
            videoRef.current.srcObject = null;
            videoRef.current.src = url;
            videoRef.current.playbackRate = playbackSpeed;
            await safePlay(videoRef.current);
            setIsPlaying(true);
          }
        }, settings.playbackDelay * 1000);
      } else {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
        }
      }
    };

    recorder.start();
    setMode('recording');
  };

  const handleStartCapture = () => {
    if (settings.recordDelay > 0) {
      setIsCountingDown(true);
      setCountdown(settings.recordDelay);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsCountingDown(false);
            startRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      startRecording();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mode === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoBlobRef(file);
      setMode('review');
      stopCamera();

      const videoId = `video_${Date.now()}`;
      setCurrentVideoId(videoId);
      const record: VideoRecord = {
        id: videoId,
        blob: file,
        name: file.name,
        createdAt: Date.now(),
      };
      saveVideo(record).catch(console.error);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
      }
    }
  };

  const getVideoFileName = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `VideoEPS_${timestamp}.webm`;
  };

  const getVideoFile = () => {
    if (!videoBlobRef) return null;
    return new File([videoBlobRef], getVideoFileName(), { type: 'video/webm' });
  };

  // "Enregistrer sous..." — File System Access API (choix du dossier : local, Google Drive, etc.)
  // Fallback sur download classique si l'API n'est pas disponible (Firefox, Safari ancien)
  const saveToFolder = async () => {
    if (!videoBlobRef) return;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: getVideoFileName(),
          types: [
            {
              description: 'Vidéo WebM',
              accept: { 'video/webm': ['.webm'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(videoBlobRef);
        await writable.close();
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return; // L'utilisateur a annulé
      }
    }

    // Fallback: download classique
    const url = URL.createObjectURL(videoBlobRef);
    const a = document.createElement('a');
    a.href = url;
    a.download = getVideoFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Partage natif (AirDrop, Drive sur Android, WhatsApp, etc.)
  const shareVideo = async () => {
    const file = getVideoFile();
    if (!file) return;

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Video EPS',
          text: 'Vidéo d\'analyse EPS',
          files: [file],
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    // Fallback si pas de Web Share : ouvrir Enregistrer sous
    await saveToFolder();
  };

  const shareByEmail = () => {
    // Enregistrer d'abord puis ouvrir le client mail
    saveToFolder();
    const subject = encodeURIComponent('Vidéo analyse EPS');
    const body = encodeURIComponent('Veuillez trouver la vidéo d\'analyse EPS en pièce jointe (fichier téléchargé séparément).');
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  };

  const saveAndClear = async () => {
    await saveToFolder();
    await clearVideo();
  };

  const clearVideo = async () => {
    if (currentVideoId) {
      await deleteVideo(currentVideoId).catch(console.error);
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoBlobRef(null);
    setCurrentVideoId(null);
    setAnnotations([]);
    setActiveTool(null);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    setMode('idle');
    setShowDeleteConfirm(false);
    startCamera();
  };

  const togglePlay = async () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.playbackRate = playbackSpeed;
        await safePlay(videoRef.current);
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const seekRelative = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
      setProgress(videoRef.current.currentTime);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * duration;
    setProgress(videoRef.current.currentTime);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const formatTime = (t: number) => {
    if (!isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const tools: { id: Tool; icon: React.ComponentType<any>; label: string }[] = [
    { id: 'pen', icon: Pencil, label: 'Main levée' },
    { id: 'line', icon: Minus, label: 'Ligne' },
    { id: 'arrow', icon: ArrowRight, label: 'Flèche' },
    { id: 'segment', icon: RulerIcon, label: 'Segment alignement' },
    { id: 'circle', icon: CircleIcon, label: 'Cercle' },
    { id: 'rect', icon: SquareIcon, label: 'Rectangle' },
  ];

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black rounded-2xl overflow-hidden border-2 border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 md:p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${mode === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`} />
          {title}
        </h3>
        <div className="flex gap-2">
          {mode === 'review' && (
            <>
              <button
                onClick={() => setShowExportMenu(true)}
                className="p-3 bg-indigo-500/20 hover:bg-indigo-500 active:bg-indigo-600 text-indigo-400 hover:text-white rounded-full transition-colors touch-manipulation"
                title="Exporter / Partager"
              >
                <Share2 size={24} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 bg-red-500/20 hover:bg-red-500 active:bg-red-600 text-red-500 hover:text-white rounded-full transition-colors touch-manipulation"
                title="Supprimer"
              >
                <Trash2 size={24} />
              </button>
            </>
          )}
          {onClose && (
            <button onClick={onClose} className="p-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 rounded-full touch-manipulation">
              <X size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-6"
          >
            <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full space-y-5 text-center border border-zinc-700">
              <p className="text-lg font-bold text-white">Que faire de cette vidéo ?</p>
              <p className="text-sm text-zinc-400">Exportez, enregistrez en local ou supprimez la vidéo.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setShowExportMenu(true); }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold touch-manipulation min-h-[48px]"
                >
                  <Share2 size={22} />
                  Exporter / Partager
                </button>
                <button
                  onClick={saveAndClear}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 text-white rounded-xl font-bold touch-manipulation min-h-[48px]"
                >
                  <Download size={22} />
                  Enregistrer en local et fermer
                </button>
                <button
                  onClick={clearVideo}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl font-bold touch-manipulation min-h-[48px]"
                >
                  <Trash2 size={22} />
                  Supprimer
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 rounded-xl font-bold touch-manipulation min-h-[48px]"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Menu Overlay */}
      <AnimatePresence>
        {showExportMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-6"
          >
            <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full space-y-5 text-center border border-zinc-700">
              <Share2 size={40} className="mx-auto text-indigo-400" />
              <p className="text-lg font-bold text-white">Exporter la vidéo</p>
              <p className="text-sm text-zinc-400">La vidéo inclut le commentaire audio si le micro était activé.</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { shareVideo(); setShowExportMenu(false); }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-bold touch-manipulation min-h-[48px]"
                >
                  <Share2 size={22} />
                  Partager (Drive, AirDrop, etc.)
                </button>
                <button
                  onClick={() => { shareByEmail(); setShowExportMenu(false); }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold touch-manipulation min-h-[48px]"
                >
                  <Mail size={22} />
                  Envoyer par email
                </button>
                <button
                  onClick={async () => { await saveToFolder(); setShowExportMenu(false); }}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 active:bg-zinc-800 text-white rounded-xl font-bold touch-manipulation min-h-[48px]"
                >
                  <FolderDown size={22} />
                  Enregistrer sous...
                </button>
                <button
                  onClick={() => setShowExportMenu(false)}
                  className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400 rounded-xl font-bold touch-manipulation min-h-[48px]"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Area */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          muted={mode === 'idle' || mode === 'recording'}
          onEnded={() => {
            setIsPlaying(false);
            // Propose suppression après visionnage complet
            if (mode === 'review') {
              setShowDeleteConfirm(true);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          }}
          onTimeUpdate={() => {
            if (videoRef.current && !isPlaying) {
              setProgress(videoRef.current.currentTime);
            }
          }}
        />

        {/* Annotation Layer */}
        {mode === 'review' && activeTool && (
          <AnnotationCanvas
            width={dimensions.width}
            height={dimensions.height}
            tool={activeTool}
            color={activeColor}
            annotations={annotations}
            onAnnotationsChange={setAnnotations}
          />
        )}

        {/* Annotations display when no tool active */}
        {mode === 'review' && !activeTool && annotations.length > 0 && (
          <AnnotationCanvas
            width={dimensions.width}
            height={dimensions.height}
            tool={null}
            color={activeColor}
            annotations={annotations}
            onAnnotationsChange={setAnnotations}
            disabled
          />
        )}

        {/* Countdown Overlay */}
        <AnimatePresence>
          {isCountingDown && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            >
              <div className="text-9xl font-bold text-white drop-shadow-2xl">
                {countdown}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar (review mode) */}
      {mode === 'review' && duration > 0 && (
        <div
          ref={progressRef}
          className="h-3 bg-zinc-800 cursor-pointer touch-manipulation relative z-20"
          onClick={handleProgressClick}
          onTouchStart={handleProgressClick}
        >
          <div
            className="h-full bg-indigo-500 transition-none"
            style={{ width: `${(progress / duration) * 100}%` }}
          />
        </div>
      )}

      {/* Controls */}
      <div className="p-3 md:p-4 bg-zinc-900 border-t border-zinc-800 z-20">
        {/* Recording Controls */}
        {(mode === 'idle' || mode === 'recording') && (
          <div className="flex items-center justify-center gap-3">
            {mode === 'idle' && (
              <>
                <button
                  onClick={handleStartCapture}
                  className="flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-xl font-bold transition-transform active:scale-95 touch-manipulation min-h-[56px] text-base"
                >
                  <Camera size={28} />
                  ENREGISTRER
                </button>
                <label className="flex items-center gap-2 px-8 py-4 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white rounded-xl font-bold cursor-pointer transition-transform active:scale-95 touch-manipulation min-h-[56px] text-base">
                  <Upload size={28} />
                  GALERIE
                  <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </>
            )}
            {mode === 'recording' && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-xl font-bold animate-pulse transition-transform active:scale-95 touch-manipulation min-h-[56px] text-base"
              >
                <Square size={28} fill="black" />
                ARRÊTER
              </button>
            )}
          </div>
        )}

        {/* Review Controls */}
        {mode === 'review' && (
          <div className="space-y-3">
            {/* Playback controls row */}
            <div className="flex items-center justify-between gap-2">
              {/* Time display */}
              <div className="text-xs md:text-sm text-zinc-400 font-mono min-w-[80px]">
                {formatTime(progress)} / {formatTime(duration)}
              </div>

              {/* Center: transport controls */}
              <div className="flex items-center gap-2 md:gap-3">
                <button onClick={() => seekRelative(-5)} className="p-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 active:bg-zinc-600 touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center">
                  <Rewind size={22} />
                </button>
                <button onClick={() => seekRelative(-1)} className="p-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 active:bg-zinc-600 touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center">
                  <SkipBack size={22} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-full transition-transform active:scale-90 touch-manipulation"
                >
                  {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-0.5" />}
                </button>
                <button onClick={() => seekRelative(1)} className="p-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 active:bg-zinc-600 touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center">
                  <SkipForward size={22} />
                </button>
                <button onClick={() => seekRelative(5)} className="p-3 bg-zinc-800 rounded-xl hover:bg-zinc-700 active:bg-zinc-600 touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center">
                  <FastForward size={22} />
                </button>
              </div>

              {/* Speed selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider hidden md:block">Vitesse</span>
                <div className="flex gap-1">
                  {PLAYBACK_SPEEDS.map(s => (
                    <button
                      key={s}
                      onClick={() => setPlaybackSpeed(s)}
                      className={`px-2 py-1.5 md:px-3 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-colors touch-manipulation min-w-[40px] min-h-[36px] ${
                        playbackSpeed === s
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Annotation tools row */}
            <div className="flex items-center justify-between gap-2">
              {/* Colors */}
              <div className="flex gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setActiveColor(c)}
                    className={`w-9 h-9 md:w-10 md:h-10 rounded-full border-2 transition-transform touch-manipulation ${
                      activeColor === c ? 'scale-110 border-white' : 'border-transparent scale-90'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Tools */}
              <div className="flex gap-1">
                {tools.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTool(activeTool === t.id ? null : t.id)}
                    title={t.label}
                    className={`p-2.5 md:p-3 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center ${
                      activeTool === t.id ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-400'
                    }`}
                  >
                    <t.icon size={22} />
                  </button>
                ))}
                <button
                  onClick={() => setAnnotations([])}
                  className="p-2.5 md:p-3 rounded-lg hover:bg-red-500/20 active:bg-red-500/30 text-red-500 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Effacer tout"
                >
                  <Eraser size={22} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
