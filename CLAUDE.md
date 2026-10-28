# Video EPS — Application d'analyse vidéo pour l'EPS

## Description
Application PWA d'analyse vidéo pour l'Éducation Physique et Sportive (gymnastique, athlétisme, acrosport, etc.).
Permet de filmer les élèves, revoir leurs mouvements au ralenti, et annoter les vidéos avec des outils de dessin (segments d'alignement, flèches d'impulsion, traits à main levée).

## Version et distribution

- **Version** : 1.0 (versionCode 2, versionName "1.0")
- **Package Android** : `fr.eps.videoepsv2`
- **Release GitHub** : [v1.0](https://github.com/msjeps/VIDEO_EPS/releases/tag/v1.0) — publiée le 2026-10-28
- **Lien de téléchargement permanent** : `https://github.com/msjeps/VIDEO_EPS/releases/latest/download/VideoEPS.apk`
- **Clone du dépôt public** : `~/Documents/APPLI EPS/APPLI EPS/video eps/`
- **Clé de signature** : `videoepsv2-release.keystore` (SHA-256 : `9b9b0644add5e236223c7192b40f714a5adfdc27f8252a8a5645ec7d0f33b32f`), protégée par `keystore.properties` (git-ignoré). Ne jamais la mettre dans le dépôt.
- **Web** : dépôt `msjeps/VIDEO_EPS` (GitHub Pages, `msjeps.github.io/VIDEO_EPS/`). Incrémenter `CACHE_NAME` de `sw.js` à chaque publication.

## Architecture

### Stack technique
- **React 19** + **TypeScript** — composants fonctionnels, hooks
- **Vite 6** — build & dev server
- **Tailwind CSS 4** — styles utilitaires, thème sombre
- **Konva / React-Konva** — canvas d'annotations (dessin vectoriel)
- **Lucide React** — icônes
- **Motion (Framer Motion)** — animations & transitions
- **Capacitor 8** — wrapper Android (APK)

### Structure du projet
```
EPSetVIDEO/
├── index.html                  # Point d'entrée HTML + meta PWA + CSP
├── public/
│   ├── manifest.webmanifest    # Manifest PWA
│   ├── sw.js                   # Service Worker (cache offline)
│   ├── logo-outils-eps.png     # Logo pied de page outils-eps
│   ├── icon_192.png            # Icône PWA 192x192
│   └── icon_512.png            # Icône PWA 512x512
├── src/
│   ├── main.tsx                # Bootstrap React + enregistrement SW
│   ├── App.tsx                 # Composant racine, navigation, réglages, détection vidéos orphelines
│   ├── index.css               # Styles globaux Tailwind (polices système, pas de @import externe)
│   ├── types.ts                # Types TypeScript partagés
│   ├── constants.ts            # Constantes (vitesses, couleurs, réglages)
│   ├── db.ts                   # IndexedDB pour stockage vidéos local
│   └── components/
│       ├── VideoPlayer.tsx     # Lecteur vidéo (caméra, enregistrement, lecture, cleanup blob URLs)
│       └── AnnotationCanvas.tsx # Canvas d'annotations Konva
├── android/                    # Wrapper Capacitor Android
│   ├── app/build.gradle        # Signing via keystore.properties (git-ignoré)
│   └── app/src/main/AndroidManifest.xml  # allowBackup="false"
├── vite.config.ts              # Configuration Vite (pas de clé API exposée)
├── package.json                # Dépendances
└── tsconfig.json               # Configuration TypeScript
```

### Fichiers clés
| Fichier | Rôle |
|---------|------|
| `App.tsx` | Navigation (home/single/dual), panneau réglages, layout, détection vidéos orphelines au démarrage |
| `VideoPlayer.tsx` | Caméra, enregistrement, lecture, contrôles vitesse, upload galerie, nettoyage blob URLs |
| `AnnotationCanvas.tsx` | Dessin sur vidéo : stylo, ligne, flèche, cercle, rectangle, segment alignement |
| `db.ts` | Abstraction IndexedDB : sauvegarde/chargement/suppression vidéos locales |
| `types.ts` | Types : Tool, Annotation, ViewMode, AppSettings |
| `constants.ts` | PLAYBACK_SPEEDS, COLORS, DEFAULT_SETTINGS |

## Contraintes

### RGPD — Obligatoire
- **100% offline** : aucune donnée ne quitte la tablette
- **Aucun serveur distant** : pas d'envoi vidéo, pas de tracking, pas de cookies tiers
- **Stockage local uniquement** : IndexedDB pour les vidéos, localStorage pour les réglages
- **Pas de compte utilisateur** : aucune authentification
- **`allowBackup="false"`** : les données de l'app ne sont pas extractibles via ADB/backup

### PWA
- Installable sur Android (Chrome) et iPad (Safari)
- Service Worker pour fonctionnement hors-ligne complet
- Manifest avec icônes 192x192 et 512x512

### Tablette
- Interface optimisée tactile : boutons min 48px, zones de tap 60px+
- Layout adaptatif pour écrans 10-13 pouces
- Mode paysage privilégié
- `playsInline` obligatoire pour iOS

## Fonctionnalités

### Enregistrement vidéo
- Caméra arrière (`facingMode: 'environment'`)
- Retardateur configurable (0-15 secondes)
- Format WebM (MediaRecorder API)

### Lecture vidéo
- Vitesses : ×0.25, ×0.5, ×0.75, ×1, ×1.5, ×2
- Lecture automatique après enregistrement (délai configurable 0-30s)
- Seek avant/arrière par pas de 5s
- Barre de progression interactive

### Annotations sur vidéo
- **Stylo** : trait à main levée
- **Ligne** : trait droit
- **Flèche** : pour impulsions/poussées
- **Segment d'alignement** : lignes horizontales/verticales avec guides (pour posture)
- **Cercle** et **Rectangle**
- **Gomme** : efface toutes les annotations
- 6 couleurs disponibles

### Gestion vidéos
- Suppression directe après visionnage
- Upload depuis la galerie de la tablette
- Stockage local IndexedDB (persistant entre sessions)
- **Détection des vidéos orphelines** : au démarrage, bandeau amber si des vidéos d'une session précédente interrompue sont détectées, avec bouton « Supprimer »

### Modes
- **Écran unique** : enregistrement + analyse sur un seul écran
- **Mode comparaison** : côte à côte (référence vs élève)

## Sécurité

### Audit (2026-10-28)
Rapport complet : `security-audit-reports/EPSetVIDEO/REPORT.md`

4 findings corrigés :
1. **High** : keystore + mots de passe en clair → `keystore.properties` git-ignoré, `.claude/settings.local.json` nettoyé et retiré du suivi
2. **Medium** : `allowBackup="true"` → passé à `false`
3. **Medium** : vidéos orphelines sans purge → détection au démarrage + bandeau de suppression
4. **Low** : Google Fonts `@import` externe → supprimé, polices système

Hardening supplémentaire : suppression `GEMINI_API_KEY` morte dans `vite.config.ts`, nettoyage blob URLs au démontage de `VideoPlayer`, `npm audit fix` (11 CVE résolues).

### Points positifs (audit)
- Aucun `dangerouslySetInnerHTML`/`eval`/`innerHTML` dans `src/`
- CSP strict : `script-src` sans `'unsafe-inline'`, `connect-src 'none'`
- Blob URLs correctement révoqués dans le flux principal
- `package-lock.json` pin exact, pas de scripts post-install

## Conformité charte outils-eps (2026-10-28)
- ✅ Version affichée sous le titre (`Version 1.0`)
- ✅ Pied de page outils-eps (logo + `https://outils-eps.fr par Nathalie Prenois`)
- ✅ Polices système (`'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`)
- N/A : stepper +/-, accès prof, sections colorées, CSV (pas applicable à une app vidéo)

## Commandes

```bash
npm run dev       # Serveur de développement (port 3000)
npm run build     # Build de production → dist/
npm run preview   # Prévisualisation du build
npm run lint      # Vérification TypeScript
```

## Points de test critiques
- ✅ 100% offline (Service Worker, localStorage, IndexedDB)
- ✅ Wake Lock API (écran actif pendant enregistrement/lecture)
- ✅ Build Vite optimisé pour P22T lent
- ✅ Animations CSS simples (pas de JS heavy)
- ✅ Rotation écran preserve état
- ✅ Vidéos orphelines détectées et supprimables au redémarrage
- ✅ Blob URLs nettoyés au démontage (pas de fuite mémoire)
- ✅ `allowBackup="false"` (données élèves RGPD)
- ✅ Keystore protégé par `keystore.properties` (git-ignoré)
- ✅ Pas de clé API, pas de police externe, pas de dépendance réseau

## Déploiement
1. `npm run build`
2. `npx cap sync android`
3. Build APK avec Android Studio (ou `./gradlew assembleRelease` avec `JAVA_HOME` Android Studio)
4. Signer avec `apksigner` (clé dans `keystore.properties`)
5. Release GitHub : `gh release create vX.Y ./VideoEPS.apk --title "vX.Y" --notes "..."`
6. Lien permanent : `https://github.com/msjeps/VIDEO_EPS/releases/latest/download/VideoEPS.apk`
