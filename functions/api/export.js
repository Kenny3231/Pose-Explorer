export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // 1. Paramètres Utilisateurs
    const id1 = url.searchParams.get('id1');
    const id2 = url.searchParams.get('id2');
    const n1 = url.searchParams.get('name1') || 'Utilisateur1';
    const n2 = url.searchParams.get('name2') || 'Utilisateur2';
    const mode = url.searchParams.get('mode') || 'solo';
    const scale = url.searchParams.get('scale') || '2';
    
    // 2. Gestion du chemin final
    let customDir = url.searchParams.get('dir') || 'bitmojis';
    customDir = customDir.replace(/^\/+|\/+$/g, '');
    const targetDir = `/config/www/${customDir}`;

    if (!id1) {
        return new Response("echo 'Erreur : id1 manquant'", { status: 400 });
    }
    if (mode === 'duo' && !id2) {
        return new Response("echo 'Erreur : id2 manquant pour le mode Duo'", { status: 400 });
    }

    try {
        let templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/public/templates_fr.json');
        if (!templateReq.ok) templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/templates_fr.json');
        
        const rawData = await templateReq.json();
        const soloList = rawData.imoji;
        const duoList = rawData.friends;

        let script = `#!/bin/bash\n`;
        script += `echo "--- DÉBUT DU TÉLÉCHARGEMENT DES BITMOJIS ---"\n`;
        script += `echo "IMPORTANT : Les images seront placées dans ${targetDir}"\n\n`;

        const formatPoseName = (str) => {
            if (!str) return "pose";
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, " ").toLowerCase().replace(/[^a-z0-9 ]/g, "_").trim();
        };

        const generateSoloCommands = (list, id, name) => {
            let cmds = `echo "Téléchargement des images de ${name}..."\n`;
            const nameCount = {};
            
            for (let t of list) {
                let tag = formatPoseName(t.displayTag);
                nameCount[tag] = (nameCount[tag] || 0) + 1;
                const suf = nameCount[tag] === 1 ? "" : `_${nameCount[tag]}`;
                
                let imgUrl = t.src.replace('%s', id) + `?transparent=1&palette=1&scale=${scale}`;
                cmds += `wget -q -U "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" -O "${targetDir}/${name}/${name}__${tag}${suf}.png" "${imgUrl}"\n`;
            }
            return cmds + "\n";
        };

        if (mode === 'solo') {
            script += generateSoloCommands(soloList, id1, n1);
        } else {
            script += generateSoloCommands(soloList, id1, n1);
            script += generateSoloCommands(soloList, id2, n2);

            script += `echo "Téléchargement des images Duo..."\n`;
            const nameCountDuo = {};
            
            for (let t of duoList) {
                let tag = formatPoseName(t.displayTag);
                nameCountDuo[tag] = (nameCountDuo[tag] || 0) + 1;
                const suf = nameCountDuo[tag] === 1 ? "" : `_${nameCountDuo[tag]}`;
                
                let urlDuo1 = t.src.replace('%s', id1);
                if(urlDuo1.includes('%s')) urlDuo1 = urlDuo1.replace('%s', id2);
                urlDuo1 += `?transparent=1&palette=1&scale=${scale}`;
                script += `wget -q -U "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -O "${targetDir}/Duo/${n1}__${n2}__${tag}${suf}.png" "${urlDuo1}"\n`;

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