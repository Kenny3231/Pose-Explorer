import JSZip from 'jszip';

// Les mêmes fonctions de nettoyage que dans ton HTML
function formatPoseName(str) {
    if (!str) return "pose";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/'/g, " ").toLowerCase().replace(/[^a-z0-9 ]/g, "_").trim();
}

function normalizeStr(str) {
    if (!str) return "";
    return str.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // Récupération de tous tes paramètres
    const id1 = url.searchParams.get('id1');
    const id2 = url.searchParams.get('id2');
    const n1 = url.searchParams.get('name1') || 'Utilisateur1';
    const n2 = url.searchParams.get('name2') || 'Utilisateur2';
    const mode = url.searchParams.get('mode') || 'solo';
    const scale = url.searchParams.get('scale') || '2';
    const search = normalizeStr(url.searchParams.get('search') || '');
    const categoryInput = normalizeStr(url.searchParams.get('categoryInput') || '');

    if (!id1 || (mode === 'duo' && !id2)) {
        return new Response("Erreur : Les IDs Bitmoji sont manquants.", { status: 400 });
    }

    const zip = new JSZip();

    try {
        // 1. Récupération des données (templates)
        let templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/public/templates_fr.json');
        if (!templateReq.ok) {
            templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/templates_fr.json');
        }
        
        const rawData = await templateReq.json();
        const list = mode === 'solo' ? rawData.imoji : rawData.friends;

        // Filtre identique à ton HTML
        const filteredList = list.filter(t => {
            const normalizedKeywords = normalizeStr(t.keywords);
            const matchSearch = normalizedKeywords.includes(search);
            let matchCategory = true;
            if (categoryInput !== '') {
                matchCategory = t.categories && t.categories.some(c => normalizeStr(c).includes(categoryInput));
            }
            return matchSearch && matchCategory;
        });

        // 2. ÉTAPE 1 du HTML : Préparer les tâches, les dossiers et les métadonnées
        const tasks = [];
        const nameCount = {};
        const metadataUser1 = []; 
        const metadataUser2 = []; 
        const metadataDuo = [];
        
        let f1, f2;
        if(mode === 'solo') { 
            f1 = zip.folder(n1); 
            f2 = zip.folder(n2); 
        }

        for (let t of filteredList) {
            let tag = formatPoseName(t.displayTag);
            nameCount[tag] = (nameCount[tag] || 0) + 1;
            const suf = nameCount[tag] === 1 ? "" : `_${nameCount[tag]}`;
            
            const imgData = { titre: t.displayTag, mots_cles: t.keywords, categories: t.categories || [] };
            
            if (mode === 'solo') {
                // Pour l'utilisateur 1
                const filename1 = `${n1}__${tag}${suf}.png`;
                tasks.push({
                    url: t.src.replace('%s', id1) + `?transparent=1&palette=1&scale=${scale}`,
                    folder: f1,
                    filename: filename1
                });
                metadataUser1.push({ fichier: filename1, ...imgData });
                
                // Pour l'utilisateur 2
                if(id2) {
                    const filename2 = `${n2}__${tag}${suf}.png`;
                    tasks.push({
                        url: t.src.replace('%s', id2) + `?transparent=1&palette=1&scale=${scale}`,
                        folder: f2,
                        filename: filename2
                    });
                    metadataUser2.push({ fichier: filename2, ...imgData });
                }
            } else {
                // MODE DUO : Les deux sens !
                // Sens 1 : n1 puis n2
                let url1 = t.src.replace('%s', id1);
                if(url1.includes('%s')) url1 = url1.replace('%s', id2);
                
                const filenameDuo1 = `${n1}__${n2}__${tag}${suf}.png`;
                tasks.push({
                    url: url1 + `?transparent=1&palette=1&scale=${scale}`,
                    folder: zip,
                    filename: filenameDuo1
                });
                metadataDuo.push({ fichier: filenameDuo1, ...imgData });

                // Sens 2 : n2 puis n1
                let url2 = t.src.replace('%s', id2);
                if(url2.includes('%s')) url2 = url2.replace('%s', id1);
                
                const filenameDuo2 = `${n2}__${n1}__${tag}${suf}.png`;
                tasks.push({
                    url: url2 + `?transparent=1&palette=1&scale=${scale}`,
                    folder: zip,
                    filename: filenameDuo2
                });
                metadataDuo.push({ fichier: filenameDuo2, ...imgData });
            }
        }

        // 3. ÉTAPE 2 du HTML : Téléchargements en parallèle (par lots de 15)
        const BATCH_SIZE = 15;
        let logErreurs = "";

        for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
            const batch = tasks.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (task) => {
                try {
                    // On garde l'astuce "Google Chrome" pour ne pas se faire bloquer
                    const response = await fetch(task.url, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "image/webp,image/png,image/*,*/*;q=0.8"
                        }
                    });
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        task.folder.file(task.filename, arrayBuffer); // Sauvegarde dans le bon sous-dossier
                    } else {
                        logErreurs += `[Erreur ${response.status}] Image refusée : ${task.filename}\n`;
                    }
                } catch (e) {
                    logErreurs += `[Erreur Réseau] : ${task.filename}\n`;
                }
            }));
        }

        // 4. ÉTAPE 3 du HTML : Création finale du ZIP (avec les JSON au bon endroit)
        if (mode === 'solo') {
            f1.file(`metadata_${n1}.json`, JSON.stringify(metadataUser1, null, 2));
            if(id2) f2.file(`metadata_${n2}.json`, JSON.stringify(metadataUser2, null, 2));
        } else {
            zip.file(`metadata_Duo.json`, JSON.stringify(metadataDuo, null, 2));
        }

        if (logErreurs !== "") zip.file("rapport_erreurs.txt", logErreurs);

        const zipContent = await zip.generateAsync({ type: "uint8array" });
        const finalName = mode === 'solo' ? n1 : 'Duo';

        return new Response(zipContent, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="PoseExplorer__${finalName}.zip"`
            }
        });

    } catch (error) {
        return new Response("Erreur interne du serveur : " + error.message, { status: 500 });
    }
}