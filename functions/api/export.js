import JSZip from 'jszip';

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    // Récupération des paramètres de l'URL
    const id1 = url.searchParams.get('id1');
    const name1 = url.searchParams.get('name1') || 'Avatar';
    const id2 = url.searchParams.get('id2');
    const mode = url.searchParams.get('mode') || 'solo';
    const scale = url.searchParams.get('scale') || '2';

    if (!id1) {
        return new Response("Erreur : l'identifiant (id1) est obligatoire.", { status: 400 });
    }

    const zip = new JSZip();

    try {
        // 1. Récupérer tes templates depuis ton propre GitHub
        const templateReq = await fetch('https://raw.githubusercontent.com/Kenny3231/Pose-Explorer/main/templates_fr.json');
        const templates = await templateReq.json();
        const list = mode === 'solo' ? templates.imoji : templates.friends;

        // 2. Préparer le téléchargement des images
        const promises = list.map(async (t) => {
            let imgUrl = t.src.replace('%s', id1);
            if (imgUrl.includes('%s') && id2) imgUrl = imgUrl.replace('%s', id2);
            imgUrl += `?transparent=1&palette=1&scale=${scale}`;

            try {
                // Fetch natif de Cloudflare
                const imgRes = await fetch(imgUrl);
                if (imgRes.ok) {
                    const arrayBuffer = await imgRes.arrayBuffer();
                    // On formate le nom proprement
                    const safeName = t.displayTag.replace(/[^a-zA-Z0-9]/g, "_");
                    zip.file(`${name1}__${safeName}.png`, arrayBuffer);
                }
            } catch (e) {
                console.log(`Erreur sur l'image ${t.displayTag}`);
            }
        });

        // Attendre que toutes les images soient téléchargées
        await Promise.all(promises);

        // 3. Générer le ZIP (format compatible Cloudflare)
        const zipContent = await zip.generateAsync({ type: "uint8array" });

        // 4. Renvoyer le fichier
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
