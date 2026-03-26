# Video EPS — Application d'analyse vidéo pour l'EPS

## Description
Application PWA d'analyse vidéo pour l'Éducation Physique et Sportive (gymnastique, athlétisme, acrosport, etc.).
Permet de filmer les élèves, revoir leurs mouvements au ralenti, et annoter les vidéos avec des outils de dessin (segments d'alignement, flèches d'impulsion, traits à main levée).

## Architecture

### Stack technique
- **React 19** + **TypeScript** — composants fonctionnels, hooks
- **Vite 6** — build & dev server
- **Tailwind CSS 4** — styles utilitaires, thème sombre
- **Konva / React-Konva** — canvas d'annotations (dessin vectoriel)
- **Lucide React** — icônes
- **Motion (Framer Motion)** — animations & transitions

### Structure du projet
```
EPSetVIDEO/
├── index.html                  # Point d'entrée HTML + meta PWA
├── public/
│   ├── manifest.webmanifest    # Manifest PWA
│   ├── sw.js                   # Service Worker (cache offline)
│   ├── icon_192.png            # Icône PWA 192x192
│   └── icon_512.png            # Icône PWA 512x512
├── src/
│   ├── main.tsx                # Bootstrap React + enregistrement SW
│   ├── App.tsx                 # Composant racine, navigation, réglages
│   ├── index.css               # Styles globaux Tailwind
│   ├── types.ts                # Types TypeScript partagés
│   ├── constants.ts            # Constantes (vitesses, couleurs, réglages)
│   ├── db.ts                   # IndexedDB pour stockage vidéos local
│   └── components/
│       ├── VideoPlayer.tsx     # Lecteur vidéo principal (caméra, enregistrement, lecture)
│       └── AnnotationCanvas.tsx # Canvas d'annotations Konva
├── vite.config.ts              # Configuration Vite
├── package.json                # Dépendances
└── tsconfig.json               # Configuration TypeScript
```

### Fichiers clés
| Fichier | Rôle |
|---------|------|
| `App.tsx` | Navigation (home/single/dual), panneau réglages, layout |
| `VideoPlayer.tsx` | Caméra, enregistrement, lecture, contrôles vitesse, upload galerie |
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

### Modes
- **Écran unique** : enregistrement + analyse sur un seul écran
- **Mode comparaison** : côte à côte (référence vs élève)

## Commandes

```bash
npm run dev       # Serveur de développement (port 3000)
npm run build     # Build de production → dist/
npm run preview   # Prévisualisation du build
npm run lint      # Vérification TypeScript
```

## Déploiement
1. `npm run build`
2. Héberger le contenu de `dist/` sur un serveur HTTPS (GitHub Pages, Vercel, etc.)
3. Sur tablette : ouvrir dans Chrome/Safari → "Ajouter à l'écran d'accueil"
