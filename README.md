# 🎨 Pose Explorer

Une application web interactive et rapide permettant de rechercher, filtrer et télécharger des poses Bitmoji (Solo et Duo) en haute définition. 

## ✨ Fonctionnalités

* **Recherche Avancée :** Filtrage intelligent des poses ignorant les accents et les majuscules.
* **Support Bilingue :** Catalogue disponible en Français (FR) et en Anglais (EN).
* **Catégories Dynamiques :** Menu déroulant autocomplété listant toutes les catégories existantes.
* **Modes Solo & Duo :** Aperçu avec un ou deux personnages simultanément.
* **Export Massif :** Génération d'un fichier `.zip` depuis l'interface web (limité par le navigateur).
* **🤖 Export Automatique (Recommandé) :** Génération d'un script Bash pour une intégration directe et illimitée dans Home Assistant.

---

## 🤖 Intégration Home Assistant (Automatique)

Cette fonctionnalité permet de télécharger automatiquement l'intégralité des poses et les fichiers de métadonnées directement dans votre stockage Home Assistant sans intervention manuelle.

### Commande rapide
Exécutez cette commande dans votre terminal Home Assistant (Add-on "Terminal & SSH") :

```bash
curl -sL "https://pose-explorer.pages.dev/api/export?id1=VOTRE_ID&name1=Kenny&mode=solo&dir=bitmojis" | bash
```

### Paramètres de l'API
| Paramètre | Description | Valeurs possibles |
| :--- | :--- | :--- |
| `id1` | **(Requis)** ID Bitmoji principal | Ex: `103719...` |
| `id2` | ID Bitmoji ami (requis pour duo) | Ex: `284610...` |
| `name1` | Dossier/Préfixe utilisateur 1 | Défaut: `Utilisateur1` |
| `name2` | Dossier/Préfixe utilisateur 2 | Défaut: `Utilisateur2` |
| `mode` | Type de poses à récupérer | `solo` ou `duo` |
| `scale` | Qualité de l'image (1x, 2x, 4x) | `1`, `2`, `4` |
| `dir` | Dossier dans `/config/www/` | Défaut: `bitmojis` |

> [!IMPORTANT]
> **Pré-requis :** Avant de lancer la commande, assurez-vous de créer manuellement vos dossiers de destination dans `/config/www/` (ex: `/config/www/bitmojis/Kenny/`). Le script nécessite que les dossiers existent pour y déposer les fichiers `.png` et `.json`.

---

## 🛠️ Technologies Utilisées

* **Frontend :** HTML5, JavaScript (Vanilla), TailwindCSS (CDN), Lucide Icons.
* **Backend (Cloudflare Workers) :** API d'exportation dynamique pour la génération de scripts Bash et de métadonnées JSON.
* **Bibliothèques JS :** JSZip, FileSaver.js.

## 🚀 Installation & Utilisation locale

1.  **Cloner le dépôt :**
    ```bash
    git clone https://github.com/Kenny3231/Pose-Explorer.git
    cd Pose-Explorer
    ```
2.  **Lancer le projet :**
    Ouvrez simplement le fichier `index.html` dans votre navigateur.

## ⚠️ Disclaimer (Avertissement légal)

* Ce projet est une application non-officielle développée à des fins personnelles et éducatives uniquement.
* **Propriété intellectuelle :** Le nom "Bitmoji" ainsi que tous les visuels, avatars et logos associés sont la propriété exclusive de **Snap Inc. (Snapchat)**. Cette application n'est ni affiliée, ni approuvée, ni sponsorisée par Snap Inc.
* **Utilisation des ressources :** Cette interface utilise les points d'accès publics de l'API Bitmoji. L'utilisateur est responsable de l'usage qu'il fait des images générées.
* **Absence de garantie :** Le logiciel est fourni "tel quel", sans garantie d'aucune sorte. En aucun cas, l'auteur ne pourra être tenu responsable des dommages résultant de l'utilisation de ce logiciel.
