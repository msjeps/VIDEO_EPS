import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Columns,
  Settings,
  ChevronLeft,
  Clock,
  PlayCircle,
  Mic,
  Video,
  Info,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoPlayer } from './components/VideoPlayer';
import { ViewMode, AppSettings } from './types';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './constants';

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function persistSettings(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  const handleBack = () => setViewMode('home');

  return (
    <div className="h-screen w-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col overflow-hidden select-none">

      {/* Navigation Bar */}
      <header className="h-14 md:h-16 px-4 md:px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md z-50">
        <div className="flex items-center gap-3">
          {viewMode !== 'home' && (
            <button
              onClick={handleBack}
              className="p-3 hover:bg-zinc-800 active:bg-zinc-700 rounded-full transition-colors touch-manipulation"
            >
              <ChevronLeft size={28} />
            </button>
          )}
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-indigo-400">
            Video <span className="text-white">EPS</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-3 rounded-full transition-colors touch-manipulation ${showSettings ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400'}`}
          >
            <Settings size={28} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col items-center justify-center p-6 md:p-8 gap-8 md:gap-12"
            >
              <div className="text-center space-y-3 max-w-2xl">
                <h2 className="text-3xl md:text-5xl font-bold text-white">Prêt pour l'analyse ?</h2>
                <p className="text-zinc-400 text-base md:text-lg">Choisissez votre mode de travail. Toutes les vidéos sont traitées localement et ne quittent jamais votre tablette.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full max-w-5xl">
                {/* Single Mode Card */}
                <button
                  onClick={() => setViewMode('single')}
                  className="group relative h-56 md:h-80 bg-zinc-900 border-2 border-zinc-800 hover:border-indigo-500 active:border-indigo-400 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center gap-4 md:gap-6 transition-all touch-manipulation active:scale-[0.98]"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                    <Monitor size={44} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Écran Unique</h3>
                    <p className="text-zinc-500 text-sm md:text-base">Enregistrement direct ou analyse d'une vidéo de la galerie.</p>
                  </div>
                  <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center">
                      <ChevronLeft size={28} className="rotate-180" />
                    </div>
                  </div>
                </button>

                {/* Dual Mode Card */}
                <button
                  onClick={() => setViewMode('dual')}
                  className="group relative h-56 md:h-80 bg-zinc-900 border-2 border-zinc-800 hover:border-emerald-500 active:border-emerald-400 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center gap-4 md:gap-6 transition-all touch-manipulation active:scale-[0.98]"
                >
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                    <Columns size={44} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Mode Comparaison</h3>
                    <p className="text-zinc-500 text-sm md:text-base">Comparez une vidéo de référence avec une performance en direct.</p>
                  </div>
                  <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                      <ChevronLeft size={28} className="rotate-180" />
                    </div>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2 text-zinc-600 text-sm font-medium uppercase tracking-widest">
                <Info size={16} />
                Application 100% Offline & RGPD
              </div>
            </motion.div>
          )}

          {viewMode === 'single' && (
            <motion.div
              key="single"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full p-2 md:p-4"
            >
              <VideoPlayer id="main" title="Analyse Vidéo" settings={settings} />
            </motion.div>
          )}

          {viewMode === 'dual' && (
            <motion.div
              key="dual"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full p-2 md:p-4 flex flex-col md:flex-row gap-2 md:gap-4"
            >
              <div className="flex-1 h-full min-h-0">
                <VideoPlayer id="ref" title="Référence" settings={settings} />
              </div>
              <div className="flex-1 h-full min-h-0">
                <VideoPlayer id="student" title="Élève" settings={settings} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="absolute top-0 right-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-[70] p-6 md:p-8 shadow-2xl overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-8 md:mb-12">
                  <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                    <Settings className="text-indigo-500" />
                    Réglages
                  </h2>
                  <button onClick={() => setShowSettings(false)} className="p-3 hover:bg-zinc-800 active:bg-zinc-700 rounded-full touch-manipulation">
                    <X size={28} />
                  </button>
                </div>

                <div className="space-y-8 md:space-y-10">
                  {/* Auto Playback */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <PlayCircle className="text-zinc-400" size={24} />
                        <div>
                          <p className="font-bold text-base">Lecture Automatique</p>
                          <p className="text-sm text-zinc-500">Lancer la vidéo après l'enregistrement</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings(s => ({ ...s, autoPlayback: !s.autoPlayback }))}
                        className={`w-16 h-9 rounded-full p-1 transition-colors touch-manipulation ${settings.autoPlayback ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`w-7 h-7 rounded-full bg-white transition-transform ${settings.autoPlayback ? 'translate-x-7' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {settings.autoPlayback && (
                      <div className="pl-9 space-y-2">
                        <div className="flex justify-between text-sm font-bold text-zinc-400">
                          <span>Délai avant lecture</span>
                          <span className="text-indigo-400">{settings.playbackDelay}s</span>
                        </div>
                        <input
                          type="range" min="0" max="30" step="1"
                          value={settings.playbackDelay}
                          onChange={(e) => setSettings(s => ({ ...s, playbackDelay: parseInt(e.target.value) }))}
                          className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 touch-manipulation"
                        />
                      </div>
                    )}
                  </div>

                  {/* Audio Recording */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mic className="text-zinc-400" size={24} />
                        <div>
                          <p className="font-bold text-base">Micro (commentaire audio)</p>
                          <p className="text-sm text-zinc-500">Enregistrer la voix de l'analyste pendant la vidéo</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings(s => ({ ...s, enableAudio: !s.enableAudio }))}
                        className={`w-16 h-9 rounded-full p-1 transition-colors touch-manipulation ${settings.enableAudio ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`w-7 h-7 rounded-full bg-white transition-transform ${settings.enableAudio ? 'translate-x-7' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Record Delay */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Clock className="text-zinc-400" size={24} />
                      <div>
                        <p className="font-bold text-base">Retardateur</p>
                        <p className="text-sm text-zinc-500">Délai avant le début de la capture</p>
                      </div>
                    </div>
                    <div className="pl-9 space-y-2">
                      <div className="flex justify-between text-sm font-bold text-zinc-400">
                        <span>Délai</span>
                        <span className="text-indigo-400">{settings.recordDelay}s</span>
                      </div>
                      <input
                        type="range" min="0" max="15" step="1"
                        value={settings.recordDelay}
                        onChange={(e) => setSettings(s => ({ ...s, recordDelay: parseInt(e.target.value) }))}
                        className="w-full h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-zinc-800">
                    <div className="bg-indigo-500/10 p-4 rounded-2xl flex gap-4 items-start">
                      <Info className="text-indigo-500 shrink-0 mt-1" />
                      <p className="text-sm text-indigo-200/70 leading-relaxed">
                        Application 100% offline. Les vidéos sont stockées localement sur votre tablette via IndexedDB. Aucune donnée ne transite par internet. Conforme RGPD.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
