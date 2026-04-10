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

    // 1. Chargement des données (Templates)
    let templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/public/templates_fr.json');
    if (!templateReq.ok) templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/templates_fr.json');
    const rawData = await templateReq.json();

    // Fonction de nettoyage identique pour tout le monde
    // Elle garde les espaces mais enlève les accents et caractères risqués
    const cleanName = (str) => {
        if (!str) return "pose";
        return str.normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/'/g, " ")
                  .toLowerCase()
                  .replace(/[^a-z0-9 ]/g, "_")
                  .trim();
    };

    // --- PARTIE A : GÉNÉRATION DU JSON (type=json) ---
    if (type === 'json') {
        const user = url.searchParams.get('user') || '1';
        const list = mode === 'solo' ? rawData.imoji : rawData.friends;
        let metadata = [];
        const nameCount = {};
        const currentName = user === '1' ? n1 : n2;

        for (let t of list) {
            let tag = cleanName(t.displayTag);
            nameCount[tag] = (nameCount[tag] || 0) + 1;
            const suf = nameCount[tag] === 1 ? "" : `_${nameCount[tag]}`;
            
            if (mode === 'solo') {
                metadata.push({
                    fichier: `${currentName}__${tag}${suf}.png`,
                    titre: t.displayTag,
                    mots_cles: t.keywords || "",
                    categories: t.categories || []
                });
            } else {
                metadata.push({
                    fichier: `${n1}__${n2}__${tag}${suf}.png`,
                    titre: t.displayTag,
                    mots_cles: t.keywords || "",
                    categories: t.categories || []
                });
                metadata.push({
                    fichier: `${n2}__${n1}__${tag}${suf}.png`,
                    titre: t.displayTag,
                    mots_cles: t.keywords || "",
                    categories: t.categories || []
                });
            }
        }
        return new Response(JSON.stringify(metadata, null, 2), {
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
    }

    // --- PARTIE B : GÉNÉRATION DU SCRIPT (Défaut) ---
    const targetDir = `/config/www/${dir.replace(/^\/+|\/+$/g, '')}`;
    let script = "#!/bin/bash\n\n";
    script += "echo '--- DEBUT DU TELECHARGEMENT ---'\n";
    
    // URL de base pour que le script puisse s'appeler lui-même pour les JSON
    const apiBase = `https://${url.hostname}/api/export?id1=${id1}&id2=${id2}&name1=${n1}&name2=${n2}&mode=${mode}&type=json`;

    const buildCmds = (list, id, name, userNum) => {
        let out = `echo 'Dossier : ${name}'\n`;
        const counts = {};
        for (let t of list) {
            let tag = cleanName(t.displayTag);
            counts[tag] = (counts[tag] || 0) + 1;
            const suf = counts[tag] === 1 ? "" : `_${counts[tag]}`;
            const fileName = `${name}__${tag}${suf}.png`;
            const imgUrl = t.src.replace('%s', id) + `?transparent=1&palette=1&scale=${scale}`;
            
            // INDISPENSABLE : Les guillemets autour du chemin de destination
            out += `wget -q -U "Mozilla/5.0" -O "${targetDir}/${name}/${fileName}" "${imgUrl}"\n`;
        }
        out += `wget -q -O "${targetDir}/${name}/metadata_${name}.json" "${apiBase}&user=${userNum}"\n`;
        return out;
    };

    if (mode === 'solo') {
        script += buildCmds(rawData.imoji, id1, n1, '1');
        if (id2) script += buildCmds(rawData.imoji, id2, n2, '2');
    } else {
        // En mode Duo on fait les 3
        script += buildCmds(rawData.imoji, id1, n1, '1');
        script += buildCmds(rawData.imoji, id2, n2, '2');
        script += "echo 'Dossier : Duo'\n";
        const countsDuo = {};
        for (let t of rawData.friends) {
            let tag = cleanName(t.displayTag);
            countsDuo[tag] = (countsDuo[tag] || 0) + 1;
            const suf = countsDuo[tag] === 1 ? "" : `_${countsDuo[tag]}`;
            
            const u1 = t.src.replace('%s', id1).replace('%s', id2) + `?transparent=1&palette=1&scale=${scale}`;
            script += `wget -q -U "Mozilla/5.0" -O "${targetDir}/Duo/${n1}__${n2}__${tag}${suf}.png" "${u1}"\n`;
            
            const u2 = t.src.replace('%s', id2).replace('%s', id1) + `?transparent=1&palette=1&scale=${scale}`;
            script += `wget -q -U "Mozilla/5.0" -O "${targetDir}/Duo/${n2}__${n1}__${tag}${suf}.png" "${u2}"\n`;
        }
        script += `wget -q -O "${targetDir}/Duo/metadata_Duo.json" "${apiBase}"\n`;
    }

    script += "echo '--- TERMINE ---'\n";

    return new Response(script, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}