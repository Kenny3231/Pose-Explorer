export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    const id1 = url.searchParams.get('id1');
    const id2 = url.searchParams.get('id2');
    const n1 = url.searchParams.get('name1') || 'Utilisateur1';
    const n2 = url.searchParams.get('name2') || 'Utilisateur2';
    const mode = url.searchParams.get('mode') || 'solo';
    const scale = url.searchParams.get('scale') || '2';
    
    let customDir = url.searchParams.get('dir') || 'bitmojis';
    customDir = customDir.replace(/^\/+|\/+$/g, '');
    const targetDir = `/config/www/${customDir}`;

    if (!id1) return new Response("echo 'Erreur : id1 manquant'\n", { status: 400 });

    try {
        let templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/public/templates_fr.json');
        if (!templateReq.ok) templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/templates_fr.json');
        
        const rawData = await templateReq.json();
        const soloList = rawData.imoji;
        const duoList = rawData.friends;

        const formatPoseName = (str) => {
            if (!str) return "pose";
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, " ").toLowerCase().replace(/[^a-z0-9 ]/g, "_").trim();
        };

        let script = "#!/bin/bash\n";
        script += "echo '--- DEBUT DU TELECHARGEMENT ---'\n";

        if (mode === 'solo') {
            const processSolo = (list, id, name) => {
                let cmds = `echo 'Traitement de ${name}...'\n`;
                let metadata = [];
                const nameCount = {};

                for (let t of list) {
                    let tag = formatPoseName(t.displayTag);
                    nameCount[tag] = (nameCount[tag] || 0) + 1;
                    const suf = nameCount[tag] === 1 ? "" : `_${nameCount[tag]}`;
                    const filename = `${name}__${tag}${suf}.png`;
                    
                    let imgUrl = t.src.replace('%s', id) + `?transparent=1&palette=1&scale=${scale}`;
                    cmds += `wget -q -U "Mozilla/5.0" -O "${targetDir}/${name}/${filename}" "${imgUrl}"\n`;
                    metadata.push({ fichier: filename, titre: t.displayTag });
                }
                
                // Utilisation de <<'EOF' (avec quotes) pour protéger le JSON
                cmds += `echo 'Génération du fichier JSON pour ${name}...'\n`;
                cmds += `cat <<'EOF' > "${targetDir}/${name}/metadata_${name}.json"\n${JSON.stringify(metadata, null, 2)}\nEOF\n`;
                return cmds;
            };

            script += processSolo(soloList, id1, n1);
            if (id2) script += processSolo(soloList, id2, n2);

        } else {
            // MODE DUO
            let metadataDuo = [];
            const nameCountDuo = {};

            script += `echo 'Traitement Duo...'\n`;
            for (let t of duoList) {
                let tag = formatPoseName(t.displayTag);
                nameCountDuo[tag] = (nameCountDuo[tag] || 0) + 1;
                const suf = nameCountDuo[tag] === 1 ? "" : `_${nameCountDuo[tag]}`;
                
                const f1 = `${n1}__${n2}__${tag}${suf}.png`;
                let u1 = t.src.replace('%s', id1).replace('%s', id2) + `?transparent=1&palette=1&scale=${scale}`;
                script += `wget -q -U "Mozilla/5.0" -O "${targetDir}/Duo/${f1}" "${u1}"\n`;
                metadataDuo.push({ fichier: f1, titre: t.displayTag });

                const f2 = `${n2}__${n1}__${tag}${suf}.png`;
                let u2 = t.src.replace('%s', id2).replace('%s', id1) + `?transparent=1&palette=1&scale=${scale}`;
                script += `wget -q -U "Mozilla/5.0" -O "${targetDir}/Duo/${f2}" "${u2}"\n`;
                metadataDuo.push({ fichier: f2, titre: t.displayTag });
            }
            script += `echo 'Génération du fichier JSON Duo...'\n`;
            script += `cat <<'EOF' > "${targetDir}/Duo/metadata_Duo.json"\n${JSON.stringify(metadataDuo, null, 2)}\nEOF\n`;
        }

        script += "echo '--- TERMINE AVEC SUCCES ---'\n";

        return new Response(script, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });

    } catch (error) {
        return new Response(`echo 'Erreur : ${error.message}'\n`, { status: 500 });
    }
}