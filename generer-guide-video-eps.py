#!/usr/bin/env python3
"""Génère video-eps.pdf, le guide d'utilisation de Video EPS (EPSetVIDEO).
Usage : python3 generer-guide-video-eps.py   (reportlab requis, polices Arial de macOS)

La version affichée est lue dans src/App.tsx ("Version X.Y" sous le titre) : relancer le script à chaque version.
Le texte reprend l'aide intégrée de l'app (panneau « Aide & Fonctionnalités ») : à mettre à jour ici quand elle change.
Convention EPS : aucun tiret cadratin dans les documents générés."""
import os
import re
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle)

ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, 'video-eps.pdf')
with open(os.path.join(ICI, 'src', 'App.tsx'), encoding='utf-8') as f:
    VERSION = re.search(r'>Version ([0-9.]+)<', f.read()).group(1)

POL = '/System/Library/Fonts/Supplemental/'
pdfmetrics.registerFont(TTFont('F', POL + 'Arial.ttf'))
pdfmetrics.registerFont(TTFont('FB', POL + 'Arial Bold.ttf'))
pdfmetrics.registerFont(TTFont('FI', POL + 'Arial Italic.ttf'))
pdfmetrics.registerFont(TTFont('FM', POL + 'Courier New Bold.ttf'))
pdfmetrics.registerFontFamily('F', normal='F', bold='FB', italic='FI', boldItalic='FB')

INDIGO = colors.HexColor('#4338CA')     # indigo de l'app (text-indigo-400) assombri pour le texte sur fond blanc
INDIGO_BG = colors.HexColor('#EEF2FF')
EMERAUDE = colors.HexColor('#15803D')
ROUGE = colors.HexColor('#C62828')
GRIS = colors.HexColor('#555555')

corps = ParagraphStyle('corps', fontName='F', fontSize=9.3, leading=12.6, spaceAfter=4, textColor=colors.HexColor('#333333'))
puce = ParagraphStyle('puce', parent=corps, leftIndent=14, bulletIndent=3, spaceAfter=3)
titre = ParagraphStyle('titre', fontName='FB', fontSize=24, leading=28, textColor=colors.HexColor('#222222'))
sous = ParagraphStyle('sous', fontName='F', fontSize=10.5, leading=14, textColor=GRIS, spaceAfter=4)
h2 = ParagraphStyle('h2', fontName='FB', fontSize=13, leading=16, textColor=INDIGO, spaceBefore=9, spaceAfter=4, keepWithNext=1)
note = ParagraphStyle('note', parent=corps, fontSize=8.8, leading=12.2)


def P(t, st=corps):
    return Paragraph(t, st)


def B(t):
    return Paragraph(t, puce, bulletText='•')


def N(n, t):
    return Paragraph(t, puce, bulletText='%d.' % n)


def encadre(paragraphes):
    t = Table([[paragraphes]], colWidths=[170 * mm])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), INDIGO_BG), ('BOX', (0, 0), (-1, -1), 1, INDIGO),
                           ('LEFTPADDING', (0, 0), (-1, -1), 10), ('TOPPADDING', (0, 0), (-1, -1), 6),
                           ('BOTTOMPADDING', (0, 0), (-1, -1), 4)]))
    return t


def en_tete(canvas, doc):
    w, h = A4
    canvas.saveState()
    canvas.setFillColor(INDIGO)
    canvas.rect(0, h - 5 * mm, w, 5 * mm, stroke=0, fill=1)
    canvas.rect(0, 0, w, 5 * mm, stroke=0, fill=1)
    canvas.setFont('F', 8)
    canvas.setFillColor(GRIS)
    canvas.drawRightString(w - 20 * mm, 10 * mm,
                           "Guide d'utilisation - Video EPS - version %s - page %d" % (VERSION, doc.page))
    canvas.restoreState()


def lien_apk():
    return encadre([Paragraph(
        "<b>Téléchargement de l'APK</b> (Wi-Fi, <b>avant le cours</b>) :<br/>"
        '<font name="FM" size="8.5">https://github.com/msjeps/VIDEO_EPS/releases/latest/download/VideoEPS.apk</font><br/>'
        'Nom du fichier : <b>VideoEPS.apk</b>', corps)])


def contenu():
    s = []
    s.append(P("Guide d'utilisation", titre))
    s.append(P("Video EPS : enregistrement et analyse vidéo pour l'EPS (version %s)" % VERSION, sous))
    ligne = Table([['']], colWidths=[170 * mm], rowHeights=[2])
    ligne.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 1.5, EMERAUDE)]))
    s += [ligne, Spacer(1, 4)]

    s.append(P("À quoi sert l'application ?", h2))
    s.append(P("<b>Video EPS</b> permet de filmer les élèves pendant une prestation (gymnastique, athlétisme, "
               "acrosport...), de revoir le mouvement au ralenti et de l'annoter directement sur l'écran "
               "(traits, flèches, segments d'alignement) pour analyser la technique avec la classe."))
    s.append(P("Elle fonctionne <b>entièrement hors connexion</b> : les vidéos restent stockées sur la tablette, "
               "aucune donnée n'est envoyée sur internet ni vers un serveur."))

    s.append(P('Installation', h2))
    s.append(P("<b>Tablette Android, fichier APK</b> (recommandé pour la flotte, à faire en Wi-Fi avant le cours) :"))
    s.append(N(1, "Téléchargez le fichier <b>VideoEPS.apk</b> sur la tablette (encadré ci-dessous)."))
    s.append(N(2, "Ouvrez le fichier téléchargé. Android demande d'autoriser les sources inconnues : acceptez, "
                  "uniquement pour cette installation."))
    s.append(N(3, "Appuyez sur <b>Installer</b> puis <b>Ouvrir</b>. Une nouvelle version s'installe par-dessus la "
                  "précédente sans perdre les vidéos enregistrées."))
    s.append(Spacer(1, 3))
    s.append(lien_apk())
    s.append(Spacer(1, 5))
    s.append(P("<b>Autre option, via Chrome (application web)</b> : ouvrez l'adresse du site, appuyez sur les "
               "trois points en haut à droite, puis « Ajouter à l'écran d'accueil ». Après une mise à jour, "
               "ouvrez l'application deux fois avec une connexion pour voir la nouvelle version."))
    s.append(P("<b>iPhone / iPad</b> : ouvrez la même adresse dans <b>Safari</b> (obligatoire sur iOS), appuyez "
               "sur Partager, puis « Sur l'écran d'accueil »."))

    s.append(P('Prise en main rapide', h2))
    s.append(N(1, "Appuyez sur le bouton d'enregistrement (acceptez l'autorisation caméra et micro au premier "
                  "lancement)."))
    s.append(N(2, "Réglez si besoin un retardateur (0 à 15 secondes) pour avoir le temps de poser la tablette ou "
                  "de vous éloigner."))
    s.append(N(3, "Filmez la prestation avec la caméra arrière."))
    s.append(N(4, "La lecture peut démarrer automatiquement après l'enregistrement (délai réglable de 0 à 30s), "
                  "pratique pour projeter juste après le passage de l'élève."))
    s.append(N(5, "Revoyez au ralenti et annotez le mouvement directement sur la vidéo."))
    s.append(N(6, "Partagez ou exportez la vidéo, puis supprimez-la pour respecter le RGPD."))
    s.append(P("L'écran reste allumé pendant l'enregistrement et la lecture (Wake Lock)."))

    s.append(P('Fonctionnalités détaillées', h2))
    s.append(B("<b>Enregistrement</b> : caméra arrière, retardateur configurable (0 à 15s), format vidéo WebM."))
    s.append(B("<b>Ralenti et vitesse</b> : lecture à ×0,25, ×0,5, ×0,75, ×1, ×1,5 ou ×2 pour analyser chaque "
               "phase du mouvement. Avance et retour par pas de 5 secondes, barre de progression interactive."))
    s.append(B("<b>Annotations</b> : trait à main levée, ligne droite, flèche (impulsions/poussées), segment "
               "d'alignement avec guides (posture), cercle et rectangle. 6 couleurs disponibles, gomme pour tout "
               "effacer."))
    s.append(B("<b>Lecture automatique</b> : la vidéo peut se lancer seule après l'enregistrement (délai réglable "
               "de 0 à 30s), idéal pour un retour immédiat sur vidéoprojecteur."))
    s.append(B("<b>Commentaire audio</b> : le micro peut être activé pour enregistrer un commentaire pendant la "
               "captation ; l'audio est inclus dans la vidéo."))
    s.append(B("<b>Export et partage</b> : AirDrop, Google Drive, e-mail ou enregistrement dans le dossier de "
               "votre choix. Sur Android, le menu de partage donne accès à toutes les applications installées."))
    s.append(B("<b>Mode comparaison</b> : deux vidéos affichées côte à côte (une vidéo de référence et la "
               "prestation de l'élève) pour comparer les mouvements en temps réel."))

    s.append(P('Gestion des vidéos et stockage', h2))
    s.append(B("Les vidéos sont stockées localement sur la tablette (IndexedDB) et restent disponibles entre les "
               "séances."))
    s.append(B("Vous pouvez importer une vidéo depuis la galerie de la tablette (par exemple une vidéo de "
               "référence filmée au préalable)."))
    s.append(B("<b>Vidéos orphelines</b> : si l'application s'est fermée brutalement pendant un enregistrement, "
               "un bandeau d'avertissement signale au démarrage les vidéos incomplètes d'une session précédente, "
               "avec un bouton pour les supprimer."))
    s.append(B("<b>Suppression RGPD</b> : en fin de visionnage, l'application propose de supprimer la vidéo. "
               "Pensez à le faire après chaque séance si la tablette est partagée entre classes."))

    s.append(P('Confidentialité', h2))
    s.append(P("Les vidéos des élèves ne quittent jamais la tablette tant que vous ne choisissez pas de les "
               "exporter vous-même : pas de compte, pas de serveur, pas de transmission réseau automatique. "
               "Pensez à effacer les vidéos en fin de séance si la tablette est partagée."))

    s.append(Spacer(1, 8))
    s.append(P("Video EPS, application développée par <b>Nathalie Prenois</b>, professeure EPS (Antibes), "
               "<b>https://outils-eps.fr</b>",
               ParagraphStyle('fin', parent=note, alignment=1, textColor=GRIS)))
    return s


doc = BaseDocTemplate(SORTIE, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=15 * mm,
                      bottomMargin=15 * mm, title="Guide d'utilisation - Video EPS",
                      author='Nathalie Prenois', subject='Video EPS version %s' % VERSION)
cadre = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id='f')
doc.addPageTemplates([PageTemplate(id='p', frames=[cadre], onPage=en_tete)])
doc.build(contenu())
print('OK', SORTIE, 'version', VERSION)
