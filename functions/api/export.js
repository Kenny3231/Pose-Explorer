import JSZip from 'jszip';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    const id1 = url.searchParams.get('id1');
    const name1 = url.searchParams.get('name1') || 'Avatar';
    const id2 = url.searchParams.get('id2');
    const mode = url.searchParams.get('mode') || 'solo';
    const scale = url.searchParams.get('scale') || '2';

    if (!id1) return new Response("Erreur : l'identifiant (id1) est obligatoire.", { status: 400 });

    const zip = new JSZip();
    let logErreurs = ""; // On prépare notre journal de bord

    try {
        // 1. Récupérer les templates
        const templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/public/templates_fr.json');
        const templates = await templateReq.json();
        const list = mode === 'solo' ? templates.imoji : templates.friends;

        // 2. Traitement par petits paquets de 10 (Batching)
        const batchSize = 10;
        
        for (let i = 0; i < list.length; i += batchSize) {
            const batch = list.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (t) => {
                let imgUrl = t.src.replace('%s', id1);
                if (imgUrl.includes('%s') && id2) imgUrl = imgUrl.replace('%s', id2);
                imgUrl += `?transparent=1&palette=1&scale=${scale}`;

                try {
                    const imgRes = await fetch(imgUrl);
                    if (imgRes.ok) {
                        const arrayBuffer = await imgRes.arrayBuffer();
                        const safeName = t.displayTag.replace(/[^a-zA-Z0-9]/g, "_");
                        zip.file(`${name1}__${safeName}.png`, arrayBuffer);
                    } else {
                        // L'image a été refusée (Ex: 404 non trouvée, ou 429 trop de requêtes)
                        logErreurs += `[Code ${imgRes.status}] Refusé par Bitmoji : ${t.displayTag}\n`;
                    }
                } catch (e) {
                    // Cloudflare a bloqué la requête
                    logErreurs += `[Erreur Serveur] Cloudflare a bloqué l'image : ${t.displayTag} (${e.message})\n`;
                }
            }));
        }

        // 3. Si on a eu des erreurs, on glisse le rapport dans le ZIP !
        if (logErreurs !== "") {
            zip.file("rapport_erreurs.txt", "Voici les images qui n'ont pas pu être téléchargées :\n\n" + logErreurs);
        }

        // 4. Générer le ZIP final
        const zipContent = await zip.generateAsync({ type: "uint8array" });

        return new Response(zipContent, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="poses_${name1}.zip"`
            }
        });

    } catch (error) {
        return new Response("Erreur interne du serveur : " + error.message, { status: 500 });
    }
}