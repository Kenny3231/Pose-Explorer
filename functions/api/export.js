export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    const id1 = url.searchParams.get('id1');
    const id2 = url.searchParams.get('id2');
    const n1 = url.searchParams.get('name1') || 'Utilisateur1';
    const n2 = url.searchParams.get('name2') || 'Utilisateur2';
    const mode = url.searchParams.get('mode') || 'solo';
    const scale = url.searchParams.get('scale') || '2';
    const dir = url.searchParams.get('dir') || 'bitmojis';
    const type = url.searchParams.get('type'); 

    // 1. Chargement des données
    let templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/public/templates_fr.json');
    if (!templateReq.ok) templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/templates_fr.json');
    const rawData = await templateReq.json();

    // Nettoyage : On garde les espaces, on enlève juste les caractères interdits pour les fichiers
    const formatPoseName = (str) => {
        if (!str) return "pose";
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, " ").toLowerCase().replace(/[^a-z0-9 ]/g, "_").trim();
    };

    // --- PARTIE 2 : GENERATION DU JSON (TYPE=JSON) ---
    if (type === 'json') {
        const user = url.searchParams.get('user') || '1';
        const list = mode === 'solo' ? rawData.imoji : rawData.friends;
        let metadata = [];
        const nameCount = {};
        const currentName = user === '1' ? n1 : n2;

        for (let t of list) {
            let tag = formatPoseName(t.displayTag);
            nameCount[tag] = (nameCount[tag] || 0) + 1;
            const suf = nameCount[tag] === 1 ? "" : `_${nameCount[tag]}`;
            
            if (mode === 'solo') {
                const filename = `${currentName}__${tag}${suf}.png`;
                metadata.push({ 
                    fichier: filename, 
                    titre: t.displayTag, 
                    mots_cles: t.keywords || "", 
                    categories: t.categories || [] 
                });
            } else {
                // Mode Duo : on génère les deux sens dans le même JSON
                const f1 = `${n1}__${n2}__${tag}${suf}.png`;
                metadata.push({ fichier: f1, titre: t.displayTag, mots_cles: t.keywords || "", categories: t.categories || [] });
                const f2 = `${n2}__${n1}__${tag}${suf}.png`;
                metadata.push({ fichier: f2, titre: t.displayTag, mots_cles: t.keywords || "", categories: t.categories || [] });
            }
        }
        return new Response(JSON.stringify(metadata, null, 2), { headers: { 'Content-Type': 'application/json' } });
    }

    // --- PARTIE 3 : GENERATION DU SCRIPT BASH ---
    const targetDir = `/config/www/${dir.replace(/^\/+|\/+$/g, '')}`;
    let script = "#!/bin/bash\n";
    const apiBase = `https://pose-explorer.pages.dev/api/export?id1=${id1}&id2=${id2}&name1=${n1}&name2=${n2}&mode=${mode}&type=json`;

    const generateDownloadCommands = (list, id, name, userNum) => {
        let cmds = `echo 'Téléchargement images ${name}...'\n`;
        const nameCount = {};
        for (let t of list) {
            let tag = formatPoseName(t.displayTag);
            nameCount[tag] = (nameCount[tag] || 0) + 1;
            const suf = nameCount[tag] === 1 ? "" : `_${nameCount[tag]}`;
            let imgUrl = t.src.replace('%s', id) + `?transparent=1&palette=1&scale=${scale}`;
            // On utilise des guillemets pour wget à cause des espaces
            cmds += `wget -q -U "Mozilla/5.0" -O "${targetDir}/${name}/${name}__${tag}${suf}.png" "${imgUrl}"\n`;
        }
        cmds += `echo 'Récupération du JSON metadata_${name}.json...'\n`;
        cmds += `wget -q -O "${targetDir}/${name}/metadata_${name}.json" "${apiBase}&user=${userNum}"\n`;
        return cmds;
    };

    if (mode === 'solo') {
        script += generateDownloadCommands(rawData.imoji, id1, n1, '1');
        if (id2) script += generateDownloadCommands(rawData.imoji, id2, n2, '2');
    } else {
        script += generateDownloadCommands(rawData.imoji, id1, n1, '1');
        script += generateDownloadCommands(rawData.imoji, id2, n2, '2');
        script += `echo 'Téléchargement images Duo...'\n`;
        const nameCountDuo = {};
        for (let t of rawData.friends) {
            let tag = formatPoseName(t.displayTag);
            nameCountDuo[tag] = (nameCountDuo[tag] || 0) + 1;
            const suf = nameCountDuo[tag] === 1 ? "" : `_${nameCountDuo[tag]}`;
            let u1 = t.src.replace('%s', id1).replace('%s', id2) + `?transparent=1&palette=1&scale=${scale}`;
            script += `wget -q -U "Mozilla/5.0" -O "${targetDir}/Duo/${n1}__${n2}__${tag}${suf}.png" "${u1}"\n`;
            let u2 = t.src.replace('%s', id2).replace('%s', id1) + `?transparent=1&palette=1&scale=${scale}`;
            script += `wget -q -U "Mozilla/5.0" -O "${targetDir}/Duo/${n2}__${n1}__${tag}${suf}.png" "${u2}"\n`;
        }
        script += `echo 'Récupération du JSON metadata_Duo.json...'\n`;
        script += `wget -q -O "${targetDir}/Duo/metadata_Duo.json" "${apiBase}"\n`;
    }

    script += "echo '--- TERMINE AVEC SUCCES ---'\n";
    return new Response(script, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}