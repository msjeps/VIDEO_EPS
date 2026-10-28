import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Columns,
  Settings,
  ChevronLeft,
  Clock,
  PlayCircle,
  Mic,
  Info,
  X,
  HelpCircle,
  Camera,
  Pencil,
  Share2,
  Gauge,
  Timer,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoPlayer } from './components/VideoPlayer';
import { ViewMode, AppSettings } from './types';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './constants';
import { getAllVideos, clearAllVideos } from './db';

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('Invalid settings format');
      }
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  }
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
  const [showHelp, setShowHelp] = useState(false);
  const [orphanedCount, setOrphanedCount] = useState(0);

  useEffect(() => {
    getAllVideos().then((videos) => {
      if (videos.length > 0) setOrphanedCount(videos.length);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    persistSettings(settings);
  }, [settings]);

  const clearOrphaned = async () => {
    await clearAllVideos();
    setOrphanedCount(0);
  };

  const handleBack = () => setViewMode('home');

  return (
    <div className="h-[100dvh] w-screen bg-zinc-950 font-sans text-zinc-100 flex flex-col overflow-hidden select-none">

      {/* Navigation Bar — safe area aware */}
      <header className="shrink-0 px-3 sm:px-4 md:px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 z-50"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)', paddingBottom: '8px' }}>
        <div className="flex items-center gap-2 sm:gap-3">
          {viewMode !== 'home' && (
            <button
              onClick={handleBack}
              className="p-2 sm:p-3 hover:bg-zinc-800 active:bg-zinc-700 rounded-full transition-colors touch-manipulation"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-indigo-400">
            Video <span className="text-white">EPS</span>
          </h1>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 sm:p-3 rounded-full transition-colors touch-manipulation ${showSettings ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-800 active:bg-zinc-700 text-zinc-400'}`}
        >
          <Settings size={24} />
        </button>
      </header>

      {/* Bandeau vidéos orphelines (session précédente interrompue) */}
      {orphanedCount > 0 && (
        <div className="shrink-0 px-3 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-amber-200">
            {orphanedCount} vidéo{orphanedCount > 1 ? 's' : ''} non supprimée{orphanedCount > 1 ? 's' : ''} (session précédente)
          </p>
          <button onClick={clearOrphaned} className="px-3 py-1.5 bg-amber-600 active:bg-amber-700 text-white text-xs font-bold rounded-lg touch-manipulation shrink-0">
            Supprimer
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {viewMode === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 gap-4 sm:gap-6 md:gap-10 overflow-y-auto"
            >
              <div className="text-center space-y-2 sm:space-y-3 max-w-2xl">
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white">Prêt pour l'analyse ?</h2>
                <p className="text-zinc-400 text-sm sm:text-base md:text-lg">Choisissez votre mode. Les vidéos restent sur votre appareil.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6 md:gap-8 w-full max-w-3xl">
                <button
                  onClick={() => setViewMode('single')}
                  className="group relative bg-zinc-900 border-2 border-zinc-800 hover:border-indigo-500 active:border-indigo-400 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6 transition-all touch-manipulation active:scale-[0.98]"
                >
                  <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Monitor size={32} className="sm:hidden" />
                    <Monitor size={44} className="hidden sm:block" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white mb-0.5 sm:mb-2">Écran Unique</h3>
                    <p className="text-zinc-500 text-xs sm:text-sm md:text-base hidden sm:block">Enregistrement direct ou analyse vidéo.</p>
                  </div>
                </button>

                <button
                  onClick={() => setViewMode('dual')}
                  className="group relative bg-zinc-900 border-2 border-zinc-800 hover:border-emerald-500 active:border-emerald-400 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6 transition-all touch-manipulation active:scale-[0.98]"
                >
                  <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl sm:rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Columns size={32} className="sm:hidden" />
                    <Columns size={44} className="hidden sm:block" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white mb-0.5 sm:mb-2">Comparaison</h3>
                    <p className="text-zinc-500 text-xs sm:text-sm md:text-base hidden sm:block">Référence vs performance en direct.</p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2 text-zinc-600 text-xs sm:text-sm font-medium uppercase tracking-widest">
                <Info size={14} />
                100% Offline & RGPD
              </div>
            </motion.div>
          )}

          {viewMode === 'single' && (
            <motion.div
              key="single"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full p-1 sm:p-2 md:p-4"
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
              className="h-full p-1 sm:p-2 md:p-4 flex flex-col md:flex-row gap-1 sm:gap-2 md:gap-4"
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
                className="absolute top-0 right-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-800 z-[70] shadow-2xl overflow-y-auto flex flex-col"
              >
                <div className="p-4 sm:p-6 md:p-8 flex-1">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2 sm:gap-3">
                      <Settings className="text-indigo-500" size={22} />
                      Réglages
                    </h2>
                    <button onClick={() => setShowSettings(false)} className="p-2 sm:p-3 hover:bg-zinc-800 active:bg-zinc-700 rounded-full touch-manipulation">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="space-y-6 sm:space-y-8">
                    {/* Auto Playback */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <PlayCircle className="text-zinc-400 shrink-0" size={20} />
                          <div className="min-w-0">
                            <p className="font-bold text-sm sm:text-base">Lecture Automatique</p>
                            <p className="text-xs sm:text-sm text-zinc-500 truncate">Après l'enregistrement</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings(s => ({ ...s, autoPlayback: !s.autoPlayback }))}
                          className={`w-14 h-8 shrink-0 rounded-full p-1 transition-colors touch-manipulation ${settings.autoPlayback ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                        >
                          <div className={`w-6 h-6 rounded-full bg-white transition-transform ${settings.autoPlayback ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {settings.autoPlayback && (
                        <div className="pl-7 sm:pl-9 space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm font-bold text-zinc-400">
                            <span>Délai avant lecture</span>
                            <span className="text-indigo-400">{settings.playbackDelay}s</span>
                          </div>
                          <input
                            type="range" min="0" max="30" step="1"
                            value={settings.playbackDelay}
                            onChange={(e) => setSettings(s => ({ ...s, playbackDelay: parseInt(e.target.value) }))}
                            className="w-full touch-manipulation"
                          />
                        </div>
                      )}
                    </div>

                    {/* Audio Recording */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Mic className="text-zinc-400 shrink-0" size={20} />
                        <div className="min-w-0">
                          <p className="font-bold text-sm sm:text-base">Micro</p>
                          <p className="text-xs sm:text-sm text-zinc-500 truncate">Commentaire audio de l'analyste</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSettings(s => ({ ...s, enableAudio: !s.enableAudio }))}
                        className={`w-14 h-8 shrink-0 rounded-full p-1 transition-colors touch-manipulation ${settings.enableAudio ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                      >
                        <div className={`w-6 h-6 rounded-full bg-white transition-transform ${settings.enableAudio ? 'translate-x-6' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Record Delay */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Clock className="text-zinc-400 shrink-0" size={20} />
                        <div>
                          <p className="font-bold text-sm sm:text-base">Retardateur</p>
                          <p className="text-xs sm:text-sm text-zinc-500">Délai avant la capture</p>
                        </div>
                      </div>
                      <div className="pl-7 sm:pl-9 space-y-2">
                        <div className="flex justify-between text-xs sm:text-sm font-bold text-zinc-400">
                          <span>Délai</span>
                          <span className="text-indigo-400">{settings.recordDelay}s</span>
                        </div>
                        <input
                          type="range" min="0" max="15" step="1"
                          value={settings.recordDelay}
                          onChange={(e) => setSettings(s => ({ ...s, recordDelay: parseInt(e.target.value) }))}
                          className="w-full touch-manipulation"
                        />
                      </div>
                    </div>

                    {/* Help button */}
                    <div className="pt-4 border-t border-zinc-800">
                      <button
                        onClick={() => setShowHelp(!showHelp)}
                        className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 active:bg-zinc-700 touch-manipulation transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-3">
                          <HelpCircle className="text-indigo-400" size={20} />
                          <span className="font-bold text-sm sm:text-base">Aide & Fonctionnalités</span>
                        </div>
                        <ChevronLeft size={18} className={`text-zinc-500 transition-transform ${showHelp ? '-rotate-90' : 'rotate-180'}`} />
                      </button>

                      <AnimatePresence>
                        {showHelp && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 space-y-4 text-sm text-zinc-300">
                              <div className="space-y-3">
                                <div className="flex gap-3 items-start">
                                  <Camera className="text-red-400 shrink-0 mt-0.5" size={18} />
                                  <div>
                                    <p className="font-bold text-white">Enregistrement</p>
                                    <p className="text-zinc-400">Filmez vos élèves avec la caméra arrière. Utilisez le retardateur pour vous laisser le temps de poser la tablette ou de vous éloigner.</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                  <Gauge className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                                  <div>
                                    <p className="font-bold text-white">Ralenti & Vitesse</p>
                                    <p className="text-zinc-400">Visionnez au ralenti (x0.25, x0.5, x0.75) ou en accéléré (x1.5, x2) pour analyser chaque phase du mouvement. Avancez image par image avec les boutons -1s / +1s.</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                  <Pencil className="text-yellow-400 shrink-0 mt-0.5" size={18} />
                                  <div>
                                    <p className="font-bold text-white">Annotations</p>
                                    <p className="text-zinc-400">Dessinez sur la vidéo pendant le visionnage : traits à main levée, lignes droites, flèches (impulsions/poussées), segments d'alignement (posture), cercles et rectangles. 6 couleurs disponibles.</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                  <Timer className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                                  <div>
                                    <p className="font-bold text-white">Lecture automatique</p>
                                    <p className="text-zinc-400">La vidéo peut se lancer automatiquement après l'enregistrement (délai réglable de 0 à 30s). Idéal pour projeter sur vidéoprojecteur juste après le passage de l'élève.</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                  <Mic className="text-purple-400 shrink-0 mt-0.5" size={18} />
                                  <div>
                                    <p className="font-bold text-white">Commentaire audio</p>
                                    <p className="text-zinc-400">Activez le micro pour enregistrer votre commentaire audio pendant la captation vidéo. L'audio est inclus dans la vidéo exportée.</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                  <Share2 className="text-blue-400 shrink-0 mt-0.5" size={18} />
                                  <div>
                                    <p className="font-bold text-white">Export & Partage</p>
                                    <p className="text-zinc-400">Partagez via AirDrop, Google Drive, email ou enregistrez dans le dossier de votre choix. Sur Android, le menu de partage donne accès à toutes vos applications.</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                  <Trash2 className="text-red-400 shrink-0 mt-0.5" size={18} />
                                  <div>
                                    <p className="font-bold text-white">Suppression RGPD</p>
                                    <p className="text-zinc-400">En fin de visionnage, l'application propose de supprimer la vidéo. Aucune donnée ne quitte votre appareil. Conforme au RGPD pour l'utilisation en collège et lycée.</p>
                                  </div>
                                </div>

                                <div className="flex gap-3 items-start">
                                  <Columns className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                                  <div>
                                    <p className="font-bold text-white">Mode Comparaison</p>
                                    <p className="text-zinc-400">Affichez deux vidéos côte à côte : une vidéo de référence et la performance de l'élève, pour comparer les mouvements en temps réel.</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="bg-indigo-500/10 p-3 sm:p-4 rounded-2xl flex gap-3 items-start">
                      <Info className="text-indigo-500 shrink-0 mt-0.5" size={18} />
                      <p className="text-xs sm:text-sm text-indigo-200/70 leading-relaxed">
                        100% offline. Vidéos stockées localement. Aucune donnée ne transite par internet. Conforme RGPD.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer credit */}
                <div className="shrink-0 p-4 text-center">
                  <p className="text-[11px] text-zinc-600">Nathalie Prenois</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
