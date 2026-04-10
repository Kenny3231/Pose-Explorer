export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // 1. Paramètres Utilisateurs
    const id1 = url.searchParams.get('id1');
    const id2 = url.searchParams.get('id2');
    const n1 = url.searchParams.get('name1') || 'Utilisateur1';
    const n2 = url.searchParams.get('name2') || 'Utilisateur2';
    const mode = url.searchParams.get('mode') || 'solo';
    
    // 2. La Qualité (1 = Web, 2 = HD, 4 = Ultra)
    const scale = url.searchParams.get('scale') || '2';
    
    // 3. Le Chemin (dir) : On enlève les slashs inutiles si l'utilisateur se trompe
    let customDir = url.searchParams.get('dir') || 'bitmojis';
    customDir = customDir.replace(/^\/+|\/+$/g, ''); // Transforme "/images/avatar/" en "images/avatar"
    const targetDir = `/config/www/${customDir}`; // Résultat : /config/www/images/avatar

    if (!id1) {
        return new Response("echo 'Erreur : id1 manquant'", { status: 400 });
    }
    if (mode === 'duo' && !id2) {
        return new Response("echo 'Erreur : id2 manquant pour le mode Duo'", { status: 400 });
    }

    try {
        // Récupération des catalogues JSON
        let templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/public/templates_fr.json');
        if (!templateReq.ok) templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/templates_fr.json');
        
        const rawData = await templateReq.json();
        const soloList = rawData.imoji;
        const duoList = rawData.friends;

        // Début du script Bash pour Home Assistant
        let script = `#!/bin/bash\n`;
        script += `echo "--- DÉBUT DU TÉLÉCHARGEMENT DES BITMOJIS ---"\n`;
        script += `echo "Dossier cible : ${targetDir}"\n\n`;

        // Fonction utilitaire de nettoyage des noms
        const formatPoseName = (str) => {
            if (!str) return "pose";
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, " ").toLowerCase().replace(/[^a-z0-9 ]/g, "_").trim();
        };

        // Fonction pour générer le script d'un dossier Solo
        const generateSoloCommands = (list, id, name) => {
            let cmds = `echo "Création du dossier pour ${name}..."\n`;
            cmds += `mkdir -p "${targetDir}/${name}"\n`;
            const nameCount = {};
            
            for (let t of list) {
                let tag = formatPoseName(t.displayTag);
                nameCount[tag] = (nameCount[tag] || 0) + 1;
                const suf = nameCount[tag] === 1 ? "" : `_${nameCount[tag]}`;
                
                let imgUrl = t.src.replace('%s', id) + `?transparent=1&palette=1&scale=${scale}`;
                cmds += `wget -q -O "${targetDir}/${name}/${name}__${tag}${suf}.png" "${imgUrl}"\n`;
            }
            return cmds + "\n";
        };

        // ==========================================
        // LOGIQUE DES DOSSIERS (SOLO vs DUO)
        // ==========================================
        
        if (mode === 'solo') {
            // MODE SOLO : Juste le dossier de Utilisateur 1
            script += generateSoloCommands(soloList, id1, n1);
            
        } else {
            // MODE DUO : 3 Dossiers (User1, User2 et Duo)
            script += generateSoloCommands(soloList, id1, n1); // Dossier 1
            script += generateSoloCommands(soloList, id2, n2); // Dossier 2

            // Création du Dossier 3 (Duo)
            script += `echo "Création du dossier Duo..."\n`;
            script += `mkdir -p "${targetDir}/Duo"\n`;
            
            const nameCountDuo = {};
            for (let t of duoList) {
                let tag = formatPoseName(t.displayTag);
                nameCountDuo[tag] = (nameCountDuo[tag] || 0) + 1;
                const suf = nameCountDuo[tag] === 1 ? "" : `_${nameCountDuo[tag]}`;
                
                // Sens 1 : User1 + User2
                let urlDuo1 = t.src.replace('%s', id1);
                if(urlDuo1.includes('%s')) urlDuo1 = urlDuo1.replace('%s', id2);
                urlDuo1 += `?transparent=1&palette=1&scale=${scale}`;
                script += `wget -q -U "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -O "${targetDir}/Duo/${n1}__${n2}__${tag}${suf}.png" "${urlDuo1}"\n`;

                // Sens 2 : User2 + User1
                let urlDuo2 = t.src.replace('%s', id2);
                if(urlDuo2.includes('%s')) urlDuo2 = urlDuo2.replace('%s', id1);
                urlDuo2 += `?transparent=1&palette=1&scale=${scale}`;
                script += `wget -q -U "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -O "${targetDir}/Duo/${n2}__${n1}__${tag}${suf}.png" "${urlDuo2}"\n`;
            }
            script += "\n";
        }

        script += `echo "--- TÉLÉCHARGEMENT TERMINÉ AVEC SUCCÈS ! ---"\n`;

        return new Response(script, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

    } catch (error) {
        return new Response(`echo "Erreur interne de l'API : ${error.message}"`, { status: 500 });
    }
}