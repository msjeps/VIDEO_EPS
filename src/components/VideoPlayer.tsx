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
  const [isScrubbing, setIsScrubbing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Sur Android (PowerVR GE8320), on contourne le bug GPU via canvas
  const isAndroid = /android/i.test(navigator.userAgent);

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
    try { await video.play(); } catch (err: any) {
      if (err.name !== 'AbortError') console.error("Video play error:", err);
    }
  };

  // Progress is now driven by onTimeUpdate on the video element

  // Permissions déjà accordées ? Évite de re-demander sur Android WebView
  const permissionGrantedRef = useRef(false);

  const startCamera = async () => {
    try {
      const isAndroidApp = !!(window as any).Capacitor?.isNativePlatform?.();
      const videoConstraints = isAndroidApp
        ? { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } };

      // Premier appel : demander vidéo + audio ensemble (une seule popup de permission)
      // Appels suivants : demander seulement la vidéo (permission déjà accordée)
      const needAudio = settings.enableAudio && !permissionGrantedRef.current;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: needAudio
      });
      permissionGrantedRef.current = true;

      if (needAudio) {
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioStreamRef.current = new MediaStream(audioTracks);
          audioTracks.forEach(t => stream.removeTrack(t));
        }
      }
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
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const getSupportedMimeType = () => {
    const isAndroid = /android/i.test(navigator.userAgent);
    // Sur Android : VP8 fonctionne bien. Sur Mac/desktop : VP9 ou H.264 évitent l'effet kaléidoscope VP8
    const types = isAndroid
      ? ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm']
      : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp9', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const startRecording = async () => {
    if (!streamRef.current) return;
    const combinedStream = new MediaStream();
    streamRef.current.getVideoTracks().forEach(t => combinedStream.addTrack(t));
    if (settings.enableAudio) {
      if (audioStreamRef.current && audioStreamRef.current.getAudioTracks().some(t => t.readyState === 'live')) {
        audioStreamRef.current.getAudioTracks().forEach(t => combinedStream.addTrack(t));
      } else {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStreamRef.current = audioStream;
          audioStream.getAudioTracks().forEach(t => combinedStream.addTrack(t));
        } catch (err) { console.warn("Micro non disponible:", err); }
      }
    }
    chunksRef.current = [];
    const mimeType = getSupportedMimeType();
    const recorderOptions: MediaRecorderOptions = {};
    if (mimeType) recorderOptions.mimeType = mimeType;
    // Sur Android (tablettes Lenovo), 1 Mbps évite les saccades au décodage VP8
    // Sur desktop/iOS, 2.5 Mbps pour une meilleure qualité
    const isAndroid = /android/i.test(navigator.userAgent);
    recorderOptions.videoBitsPerSecond = isAndroid ? 1000000 : 2500000;
    const recorder = new MediaRecorder(combinedStream, recorderOptions);
    const actualMime = recorder.mimeType || mimeType || 'video/webm';
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: actualMime });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url); setVideoBlobRef(blob); setMode('review'); stopCamera();
      const videoId = `video_${Date.now()}`;
      setCurrentVideoId(videoId);
      saveVideo({ id: videoId, blob, name: `${title} - ${new Date().toLocaleTimeString('fr-FR')}`, createdAt: Date.now() }).catch(console.error);
      if (settings.autoPlayback) {
        setTimeout(async () => {
          if (videoRef.current) {
            videoRef.current.srcObject = null; videoRef.current.src = url;
            videoRef.current.playbackRate = playbackSpeed;
            await safePlay(videoRef.current); setIsPlaying(true);
          }
        }, settings.playbackDelay * 1000);
      } else if (videoRef.current) {
        videoRef.current.srcObject = null; videoRef.current.src = url;
      }
    };
    recorder.start(1000); setMode('recording');
  };

  const handleStartCapture = () => {
    if (settings.recordDelay > 0) {
      setIsCountingDown(true); setCountdown(settings.recordDelay);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); setIsCountingDown(false); startRecording(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else { startRecording(); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mode === 'recording') mediaRecorderRef.current.stop();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url); setVideoBlobRef(file); setMode('review'); stopCamera();
    const videoId = `video_${Date.now()}`;
    setCurrentVideoId(videoId);
    saveVideo({ id: videoId, blob: file, name: file.name, createdAt: Date.now() }).catch(console.error);
    if (videoRef.current) { videoRef.current.srcObject = null; videoRef.current.src = url; }
  };

  const getVideoFileName = () => `VideoEPS_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.webm`;
  const getVideoFile = () => videoBlobRef ? new File([videoBlobRef], getVideoFileName(), { type: 'video/webm' }) : null;

  const saveToFolder = async () => {
    if (!videoBlobRef) return;
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: getVideoFileName(),
          types: [{ description: 'Vidéo WebM', accept: { 'video/webm': ['.webm'] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(videoBlobRef); await writable.close(); return;
      } catch (err: any) { if (err.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(videoBlobRef);
    const a = document.createElement('a'); a.href = url; a.download = getVideoFileName();
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const shareVideo = async () => {
    const file = getVideoFile();
    if (!file) return;
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ title: 'Video EPS', text: 'Vidéo d\'analyse EPS', files: [file] }); return; }
      catch (err: any) { if (err.name === 'AbortError') return; }
    }
    await saveToFolder();
  };

  const shareByEmail = () => {
    saveToFolder();
    window.open(`mailto:?subject=${encodeURIComponent('Vidéo analyse EPS')}&body=${encodeURIComponent('Vidéo d\'analyse EPS en pièce jointe (fichier téléchargé séparément).')}`, '_self');
  };

  const saveAndClear = async () => { await saveToFolder(); await clearVideo(); };

  const clearVideo = async () => {
    if (currentVideoId) await deleteVideo(currentVideoId).catch(console.error);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null); setVideoBlobRef(null); setCurrentVideoId(null);
    setAnnotations([]); setActiveTool(null); setIsPlaying(false);
    setProgress(0); setDuration(0); setMode('idle'); setShowDeleteConfirm(false);
    startCamera();
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.playbackRate = playbackSpeed;
      await safePlay(videoRef.current); setIsPlaying(true);
    } else { videoRef.current.pause(); setIsPlaying(false); }
  };

  const seekRelative = (s: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + s));
    setProgress(videoRef.current.currentTime);
  };

  const seekFromEvent = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!progressRef.current || !videoRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    videoRef.current.currentTime = ratio * duration;
    setProgress(videoRef.current.currentTime);
  };

  const handleScrubStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
    }
    seekFromEvent(e);

    const onMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault();
      seekFromEvent(ev);
    };
    const onEnd = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = playbackSpeed; }, [playbackSpeed]);

  // Sync dimensions canvas ↔ conteneur
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = dimensions.width;
      canvasRef.current.height = dimensions.height;
    }
  }, [dimensions]);

  // Boucle de rendu canvas (Android review mode uniquement)
  // Contourne le bug kaléidoscope du GPU PowerVR GE8320 en dessinant
  // chaque frame via CPU (drawImage) au lieu du pipeline GPU WebView.
  useEffect(() => {
    if (mode !== 'review' || !isAndroid) {
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawFrame = () => {
      if (canvas.width > 0 && canvas.height > 0 && video.readyState >= 2 && video.videoWidth > 0) {
        // createImageBitmap force la conversion YUV→RGBA sur le CPU
        // Corrige le rendu noir et blanc de drawImage(video) sur PowerVR GE8320
        createImageBitmap(video).then(bitmap => {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const scale = Math.min(canvas.width / bitmap.width, canvas.height / bitmap.height);
          const dx = (canvas.width - bitmap.width * scale) / 2;
          const dy = (canvas.height - bitmap.height * scale) / 2;
          ctx.drawImage(bitmap, dx, dy, bitmap.width * scale, bitmap.height * scale);
          bitmap.close();
        }).catch(() => {
          // Fallback si createImageBitmap non supporté
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        });
      }
      rafRef.current = requestAnimationFrame(drawFrame);
    };
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => { if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; } };
  }, [mode, isAndroid]);

  const formatTime = (t: number) => {
    if (!isFinite(t)) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };

  const tools: { id: Tool; icon: React.ComponentType<any>; label: string }[] = [
    { id: 'pen', icon: Pencil, label: 'Main levée' },
    { id: 'line', icon: Minus, label: 'Ligne' },
    { id: 'arrow', icon: ArrowRight, label: 'Flèche' },
    { id: 'segment', icon: RulerIcon, label: 'Alignement' },
    { id: 'circle', icon: CircleIcon, label: 'Cercle' },
    { id: 'rect', icon: SquareIcon, label: 'Rectangle' },
  ];

  // Shared button style for modals
  const modalBtn = "flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold touch-manipulation min-h-[48px] text-sm sm:text-base w-full";

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-800 sm:border-2 flex flex-col">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 px-2 py-1.5 sm:p-3 md:p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-white flex items-center gap-1.5 sm:gap-2">
          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${mode === 'recording' ? 'bg-red-500 animate-pulse' : 'bg-zinc-500'}`} />
          {title}
        </h3>
        <div className="flex gap-1 sm:gap-2">
          {mode === 'review' && (
            <>
              <button onClick={() => setShowExportMenu(true)} className="p-2 sm:p-3 bg-indigo-500/20 active:bg-indigo-600 text-indigo-400 rounded-full touch-manipulation">
                <Share2 size={20} />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 sm:p-3 bg-red-500/20 active:bg-red-600 text-red-500 rounded-full touch-manipulation">
                <Trash2 size={20} />
              </button>
            </>
          )}
          {onClose && (
            <button onClick={onClose} className="p-2 sm:p-3 bg-zinc-800 active:bg-zinc-600 rounded-full touch-manipulation">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-2xl p-5 sm:p-6 max-w-sm w-full space-y-4 text-center border border-zinc-700">
              <p className="text-base sm:text-lg font-bold text-white">Que faire de cette vidéo ?</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => { setShowDeleteConfirm(false); setShowExportMenu(true); }} className={`${modalBtn} bg-indigo-600 active:bg-indigo-700 text-white`}>
                  <Share2 size={20} /> Exporter / Partager
                </button>
                <button onClick={saveAndClear} className={`${modalBtn} bg-zinc-700 active:bg-zinc-800 text-white`}>
                  <Download size={20} /> Enregistrer et fermer
                </button>
                <button onClick={clearVideo} className={`${modalBtn} bg-red-600 active:bg-red-700 text-white`}>
                  <Trash2 size={20} /> Supprimer
                </button>
                <button onClick={() => {
                  setShowDeleteConfirm(false);
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    setProgress(0);
                  }
                }} className={`${modalBtn} bg-zinc-800 active:bg-zinc-600 text-zinc-400`}>
                  <Play size={20} /> Revoir
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Menu */}
      <AnimatePresence>
        {showExportMenu && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-2xl p-5 sm:p-6 max-w-sm w-full space-y-4 text-center border border-zinc-700">
              <Share2 size={36} className="mx-auto text-indigo-400" />
              <p className="text-base sm:text-lg font-bold text-white">Exporter la vidéo</p>
              <div className="flex flex-col gap-2.5">
                <button onClick={() => { shareVideo(); setShowExportMenu(false); }} className={`${modalBtn} bg-indigo-600 active:bg-indigo-700 text-white`}>
                  <Share2 size={20} /> Partager (Drive, AirDrop...)
                </button>
                <button onClick={() => { shareByEmail(); setShowExportMenu(false); }} className={`${modalBtn} bg-emerald-600 active:bg-emerald-700 text-white`}>
                  <Mail size={20} /> Envoyer par email
                </button>
                <button onClick={async () => { await saveToFolder(); setShowExportMenu(false); }} className={`${modalBtn} bg-zinc-700 active:bg-zinc-800 text-white`}>
                  <FolderDown size={20} /> Enregistrer sous...
                </button>
                <button onClick={() => setShowExportMenu(false)} className={`${modalBtn} bg-zinc-800 active:bg-zinc-600 text-zinc-400`}>
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Area */}
      <div className="relative flex-1 overflow-hidden min-h-0">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          preload="auto"
          style={isAndroid && mode === 'review'
            // Caché derrière le canvas (toujours actif pour l'audio et les contrôles)
            ? { position: 'absolute', opacity: 0, width: '100%', height: '100%' }
            : { transform: 'translateZ(0)' }
          }
          muted={mode === 'idle' || mode === 'recording'}
          onEnded={() => { setIsPlaying(false); if (mode === 'review') setShowDeleteConfirm(true); }}
          onLoadedMetadata={() => {
            if (!videoRef.current) return;
            if (videoRef.current.duration === Infinity || isNaN(videoRef.current.duration)) {
              // Bug connu WebM/MediaRecorder : durée non écrite dans l'en-tête.
              // Seeker à une position très loin force le navigateur à calculer la vraie durée.
              videoRef.current.currentTime = 1e10;
            } else {
              setDuration(videoRef.current.duration);
            }
          }}
          onDurationChange={() => {
            if (!videoRef.current) return;
            const d = videoRef.current.duration;
            if (isFinite(d) && d > 0) {
              setDuration(d);
            }
          }}
          onSeeked={() => {
            if (!videoRef.current) return;
            const d = videoRef.current.duration;
            if (isFinite(d) && d > 0 && videoRef.current.currentTime >= d - 1) {
              setDuration(d);
              videoRef.current.currentTime = 0;
            }
          }}
          onTimeUpdate={() => { if (videoRef.current) setProgress(videoRef.current.currentTime); }}
        />
        {/* Canvas de rendu Android : dessine les frames via CPU pour éviter le bug GPU PowerVR */}
        {isAndroid && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{
              display: mode === 'review' ? 'block' : 'none',
              zIndex: 1,
              pointerEvents: 'none', // Ne capture aucun événement tactile → annotations fonctionnelles
            }}
          />
        )}
        {mode === 'review' && activeTool && (
          <AnnotationCanvas width={dimensions.width} height={dimensions.height} tool={activeTool} color={activeColor} annotations={annotations} onAnnotationsChange={setAnnotations} />
        )}
        {mode === 'review' && !activeTool && annotations.length > 0 && (
          <AnnotationCanvas width={dimensions.width} height={dimensions.height} tool={null} color={activeColor} annotations={annotations} onAnnotationsChange={setAnnotations} disabled />
        )}
        <AnimatePresence>
          {isCountingDown && (
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
              <div className="text-7xl sm:text-9xl font-bold text-white drop-shadow-2xl">{countdown}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar with draggable thumb */}
      {mode === 'review' && duration > 0 && (
        <div ref={progressRef}
          className="relative h-8 sm:h-10 bg-zinc-900 cursor-pointer z-20 flex items-center select-none"
          style={{ touchAction: 'none' }}
          onMouseDown={handleScrubStart} onTouchStart={handleScrubStart}>
          {/* Track background */}
          <div className="absolute left-0 right-0 h-1.5 sm:h-2 bg-zinc-700 rounded-full mx-2" />
          {/* Filled track */}
          <div className="absolute left-0 h-1.5 sm:h-2 bg-indigo-500 rounded-full mx-2 transition-none"
            style={{ width: `calc(${(progress / duration) * 100}% - 8px)` }} />
          {/* Thumb */}
          <div className="absolute h-5 w-5 sm:h-6 sm:w-6 bg-indigo-500 rounded-full border-2 border-white shadow-lg transition-none -translate-x-1/2 pointer-events-none"
            style={{ left: `calc(8px + (100% - 16px) * ${progress / duration})` }} />
          {/* Time tooltip on scrub */}
          {isScrubbing && (
            <div className="absolute -top-8 bg-zinc-800 text-white text-xs font-mono px-2 py-1 rounded -translate-x-1/2 pointer-events-none"
              style={{ left: `calc(8px + (100% - 16px) * ${progress / duration})` }}>
              {formatTime(progress)}
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="shrink-0 p-2 sm:p-3 md:p-4 bg-zinc-900 border-t border-zinc-800 z-20">
        {/* Recording */}
        {(mode === 'idle' || mode === 'recording') && (
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {mode === 'idle' && (
              <>
                <button onClick={handleStartCapture}
                  className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-8 py-3 sm:py-4 bg-red-600 active:bg-red-700 text-white rounded-xl font-bold active:scale-95 touch-manipulation min-h-[48px] text-sm sm:text-base">
                  <Camera size={22} /> ENREGISTRER
                </button>
                <label className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-8 py-3 sm:py-4 bg-zinc-800 active:bg-zinc-600 text-white rounded-xl font-bold cursor-pointer active:scale-95 touch-manipulation min-h-[48px] text-sm sm:text-base">
                  <Upload size={22} /> GALERIE
                  <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </>
            )}
            {mode === 'recording' && (
              <button onClick={stopRecording}
                className="flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-black rounded-xl font-bold animate-pulse active:scale-95 touch-manipulation min-h-[48px] text-sm sm:text-base">
                <Square size={22} fill="black" /> ARRÊTER
              </button>
            )}
          </div>
        )}

        {/* Review Controls */}
        {mode === 'review' && (
          <div className="space-y-2 sm:space-y-3">
            {/* Row 1: Transport + Speed */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Time */}
              <div className="text-[10px] sm:text-xs text-zinc-500 font-mono shrink-0 w-[58px] sm:w-[80px]">
                {formatTime(progress)}/{formatTime(duration)}
              </div>

              {/* Transport */}
              <div className="flex items-center gap-1 sm:gap-2 justify-center flex-1">
                <button onClick={() => seekRelative(-5)} className="p-2 sm:p-3 bg-zinc-800 rounded-lg sm:rounded-xl active:bg-zinc-600 touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] flex items-center justify-center">
                  <Rewind size={18} />
                </button>
                <button onClick={() => seekRelative(-1)} className="p-2 sm:p-3 bg-zinc-800 rounded-lg sm:rounded-xl active:bg-zinc-600 touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] flex items-center justify-center">
                  <SkipBack size={18} />
                </button>
                <button onClick={togglePlay}
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center bg-indigo-600 active:bg-indigo-700 text-white rounded-full active:scale-90 touch-manipulation">
                  {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" className="ml-0.5" />}
                </button>
                <button onClick={() => seekRelative(1)} className="p-2 sm:p-3 bg-zinc-800 rounded-lg sm:rounded-xl active:bg-zinc-600 touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] flex items-center justify-center">
                  <SkipForward size={18} />
                </button>
                <button onClick={() => seekRelative(5)} className="p-2 sm:p-3 bg-zinc-800 rounded-lg sm:rounded-xl active:bg-zinc-600 touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-[48px] sm:min-h-[48px] flex items-center justify-center">
                  <FastForward size={18} />
                </button>
              </div>

              {/* Speed - scrollable on small screens */}
              <div className="flex gap-0.5 sm:gap-1 shrink-0 overflow-x-auto no-scrollbar">
                {PLAYBACK_SPEEDS.map(s => (
                  <button key={s} onClick={() => setPlaybackSpeed(s)}
                    className={`px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg font-bold text-[10px] sm:text-xs touch-manipulation min-w-[32px] sm:min-w-[38px] min-h-[30px] sm:min-h-[34px] ${
                      playbackSpeed === s ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 active:bg-zinc-600'
                    }`}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Colors + Tools — scrollable */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {/* Colors */}
              <div className="flex gap-1 shrink-0">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setActiveColor(c)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full border-2 touch-manipulation ${
                      activeColor === c ? 'scale-110 border-white' : 'border-transparent scale-90'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="w-px h-6 bg-zinc-700 shrink-0" />

              {/* Tools */}
              <div className="flex gap-0.5 sm:gap-1 shrink-0">
                {tools.map(t => (
                  <button key={t.id} onClick={() => setActiveTool(activeTool === t.id ? null : t.id)} title={t.label}
                    className={`p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center ${
                      activeTool === t.id ? 'bg-indigo-600 text-white' : 'bg-zinc-800 active:bg-zinc-600 text-zinc-400'
                    }`}>
                    <t.icon size={18} />
                  </button>
                ))}
                <button onClick={() => setAnnotations([])}
                  className="p-2 sm:p-2.5 md:p-3 rounded-md sm:rounded-lg active:bg-red-500/30 text-red-500 touch-manipulation min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center">
                  <Eraser size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
