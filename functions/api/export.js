import JSZip from 'jszip';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // Récupération des paramètres comme dans ton HTML
    const id1 = url.searchParams.get('id1');
    const name1 = url.searchParams.get('name1') || 'Avatar';
    const id2 = url.searchParams.get('id2');
    const name2 = url.searchParams.get('name2') || 'Ami';
    const mode = url.searchParams.get('mode') || 'solo';
    const scale = url.searchParams.get('scale') || '2';

    if (!id1) return new Response("Erreur : l'identifiant (id1) est obligatoire.", { status: 400 });

    const zip = new JSZip();

    try {
        // 1. Récupérer les templates (On essaie le chemin public, puis la racine)
        let templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/public/templates_fr.json');
        if (!templateReq.ok) {
            templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/templates_fr.json');
        }
        
        const templates = await templateReq.json();
        const list = mode === 'solo' ? templates.imoji : templates.friends;

        // Préparation des métadonnées comme dans ton HTML
        const metadataUser1 = [];
        const metadataDuo = [];
        const tasks = [];

        // 2. Préparation des URLs
        for (let t of list) {
            let imgUrl = t.src.replace('%s', id1);
            if (imgUrl.includes('%s') && id2) imgUrl = imgUrl.replace('%s', id2);
            imgUrl += `?transparent=1&palette=1&scale=${scale}`;

            let safeTag = t.displayTag.replace(/[^a-zA-Z0-9]/g, "_");
            let filename = "";

            if (mode === 'solo') {
                filename = `${name1}__${safeTag}.png`;
                metadataUser1.push({ fichier: filename, titre: t.displayTag });
            } else {
                filename = `Duo__${safeTag}.png`;
                metadataDuo.push({ fichier: filename, titre: t.displayTag });
            }

            tasks.push({ url: imgUrl, filename: filename, displayTag: t.displayTag });
        }

        let logErreurs = "";
        const batchSize = 10; // Exactement comme dans ton HTML

        // 3. Téléchargement par paquets de 10
        for (let i = 0; i < tasks.length; i += batchSize) {
            const batch = tasks.slice(i, i + batchSize);

            await Promise.all(batch.map(async (task) => {
                try {
                    // L'ASTUCE EST ICI : On fait croire qu'on est Google Chrome !
                    const imgRes = await fetch(task.url, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "image/webp,image/png,image/*,*/*;q=0.8",
                            "Referer": "https://www.google.com/"
                        }
                    });

                    if (imgRes.ok) {
                        const arrayBuffer = await imgRes.arrayBuffer();
                        zip.file(task.filename, arrayBuffer);
                    } else {
                        logErreurs += `[Erreur ${imgRes.status}] Image refusée : ${task.filename}\n`;
                    }
                } catch (e) {
                    logErreurs += `[Erreur Réseau] Impossible de charger : ${task.filename}\n`;
                }
            }));
        }

        // 4. Ajout des fichiers Metadata (Exactement comme ton HTML)
        if (mode === 'solo') {
            zip.file(`metadata_${name1}.json`, JSON.stringify(metadataUser1, null, 2));
        } else {
            zip.file(`metadata_Duo.json`, JSON.stringify(metadataDuo, null, 2));
        }

        if (logErreurs !== "") {
            zip.file("rapport_erreurs.txt", logErreurs);
        }

        // 5. Génération du ZIP final avec le même nom que ton HTML
        const zipContent = await zip.generateAsync({ type: "uint8array" });
        const finalZipName = mode === 'solo' ? name1 : 'Duo';

        return new Response(zipContent, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="PoseExplorer__${finalZipName}.zip"`
            }
        });

    } catch (error) {
        return new Response("Erreur critique du serveur : " + error.message, { status: 500 });
    }
}