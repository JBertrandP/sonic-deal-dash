require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer'); // Importación de Nodemailer

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// 1. ENDPOINTS DE LA WISHLIST Y PREDICCIÓN

// Guardado, Predicción Heurística y Generación de Correo 
app.post('/api/wishlist', async (req, res) => {
    try {
        const gameName = req.body.game_name;
        const userEmail = req.body.user_email;

        console.log(` Iniciando Motor de Predicción para: ${gameName}`);

        // 1. OBTENER PRECIO REAL DE CHEAPSHARK
        const csRes = await fetch(`https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(gameName)}&limit=1`);
        const csData = await csRes.json();
        
        let salePrice = "59.99"; // Valor por defecto
        let normalPrice = "59.99";
        let predictionMsg = " El juego no está en nuestro radar principal. Mantendremos el monitoreo estándar.";

        if (csData.length > 0) {
            salePrice = csData[0].cheapest;
            // Buscar el detalle de la oferta para ver el precio normal original
            const dealRes = await fetch(`https://www.cheapshark.com/api/1.0/deals?id=${csData[0].cheapestDealID}`);
            const dealData = await dealRes.json();
            normalPrice = dealData.gameInfo.retailPrice;

            // 2. LÓGICA DE PREDICCIÓN HEURÍSTICA
            const discount = ((normalPrice - salePrice) / normalPrice) * 100;
            
            if (discount >= 50) {
                predictionMsg = " PREDICCIÓN: ¡Oferta Extrema! Recomendamos la COMPRA INMEDIATA. Es poco probable que baje más este año.";
            } else if (discount >= 20) {
                predictionMsg = " PREDICCIÓN: Descuento moderado. Buena oportunidad, pero si esperas a las rebajas de verano podría bajar más.";
            } else {
                predictionMsg = " PREDICCIÓN: Precio casi completo. NO COMPRES AÚN. Te avisaremos cuando haya un bajón histórico.";
            }
        }

        // 3. GUARDAR EN SUPABASE (Con el precio real)
        const dbPayload = {
            game_name: gameName,
            user_email: userEmail,
            current_price: salePrice,
            world_record_time: "N/A"
        };

        await fetch(`${SUPABASE_URL}/rest/v1/wishlist`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dbPayload)
        });

        // 4. GENERAR CORREO CON ETHEREAL
        let testAccount = await nodemailer.createTestAccount();
        let transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
        });

        let info = await transporter.sendMail({
            from: '"Sonic AI Predictor 🦔" <alerts@sonicdeals.com>',
            to: userEmail,
            subject: ` Análisis y Predicción para ${gameName}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 2px solid #0dcaf0; border-radius: 10px;">
                    <h2 style="color: #0dcaf0;">Reporte de Radar Sonic 🦔</h2>
                    <p>Has añadido <b>${gameName}</b> a tu lista de rastreo.</p>
                    <hr>
                    <p>💰 Precio Actual: <b style="color: #198754; font-size: 18px;">$${salePrice} USD</b></p>
                    <p>📉 Precio Normal: <del>$${normalPrice} USD</del></p>
                    <hr>
                    <h3 style="color: #ffc107;">Análisis de la IA:</h3>
                    <p style="font-size: 16px; font-weight: bold;">${predictionMsg}</p>
                </div>
            `
        });

        const emailUrl = nodemailer.getTestMessageUrl(info);

        res.status(201).json({ message: 'Proceso completado', emailUrl: emailUrl });

    } catch (error) {
        console.error("Error en la predicción:", error);
        res.status(500).json({ error: error.message });
    }
});

// LEER la Wishlist de Supabase 
app.get('/api/wishlist', async (req, res) => {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/wishlist?select=*`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => { res.json({ status: 'Everything cool', timestamp: new Date() }); });


// 2. LÓGICA DE NEGOCIO Y NORMALIZACIÓN 


function isExtraContent(gameName) {
    const lowerName = gameName.toLowerCase();
    
    const strictBlacklist = [
        'dlc', 'soundtrack', 'pack', 'expansion', 'costume', 'bundle', 
        'season pass', 'deluxe', 'battle', 'bonus', 'music', 'upgrade', 
        'encore', 'plus'
    ];
    
    if (strictBlacklist.some(keyword => lowerName.includes(keyword))) {
        return true; 
    }
    return false;
}

function getManualSpeedrunLink(gameName) {
    const lowerName = gameName.toLowerCase();
    
    if (lowerName.includes('adventure dx')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/sadx' }];
    if (lowerName.includes('adventure 2')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/sa2b' }];
    if (lowerName.includes('episode 1') || lowerName.includes('episode i')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/s4e1' }];
    if (lowerName.includes('episode 2') || lowerName.includes('episode ii')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/s4e2' }];
    if (lowerName.includes('mania')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/sonic_mania' }];
    if (lowerName.includes('transformed')) return [{ label: ' ⏱️ Ver Récords', url: 'https://www.speedrun.com/asrt' }];
    if (lowerName.includes('crossworlds')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/srcw' }];

    if (lowerName.includes('sonic x shadow')) {
        return [
            { label: '⏱️ Ver Récords Sonic Gen (2024)', url: 'https://www.speedrun.com/sonic_generations_2024' },
            { label: '⏱️ Ver Récords Shadow Gen', url: 'https://www.speedrun.com/shadow_generations' }
        ];
    }
    return null;
}

async function getSpeedrunInfo(searchName) {
    try {
        const cleanName = searchName.replace('™', '').replace('©', '').split(':')[0].trim();
        const response = await fetch(`https://www.speedrun.com/api/v1/games?name=${encodeURIComponent(cleanName)}&max=1`);
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const foundName = data.data[0].names.international.toLowerCase();
            if (foundName.includes('sonic')) {
                return { has_runs: true, buttons: [{ label: '⏱️ Ver Récords', url: data.data[0].weblink }] };
            }
        }
        return { has_runs: false, buttons: [] };
    } catch (error) {
        return { has_runs: false, buttons: [] };
    }
}


// 3. ENDPOINT PRINCIPAL (API COMPOSITION)

app.get('/api/sonic-games', async (req, res) => {
    try {
        const cheapSharkResponse = await fetch('https://www.cheapshark.com/api/1.0/games?title=sonic&limit=100');
        const gamesData = await cheapSharkResponse.json();

        const filteredGames = gamesData.filter(game => {
            const name = game.external.toLowerCase();
            return name.startsWith('sonic') && !name.includes('sonicomi') && 
                   !name.includes('tapsonic') && !name.includes('super sonic racer') && 
                   !name.includes('sonic wings');
        });

        const sonicCatalog = await Promise.all(filteredGames.map(async (game) => {
            const isExtra = isExtraContent(game.external);
            let speedrunData = { has_runs: false, buttons: [] };

            if (!isExtra) {
                const manualButtons = getManualSpeedrunLink(game.external);
                if (manualButtons) {
                    speedrunData = { has_runs: true, buttons: manualButtons };
                } else {
                    speedrunData = await getSpeedrunInfo(game.external);
                }
            }

            return {
                name: game.external,
                cheapest_price: game.cheapest,
                deal_link: `https://www.cheapshark.com/redirect?dealID=${game.cheapestDealID}`,
                thumb: game.thumb,
                speedrun: speedrunData,
                is_extra: isExtra
            };
        }));

        const mainGames = sonicCatalog.filter(game => !game.is_extra);
        const extraDeals = sonicCatalog.filter(game => game.is_extra);

        res.status(200).json({ total_results: sonicCatalog.length, speedruns: mainGames, deals: extraDeals });

    } catch (error) {
        res.status(500).json({ error: "Falla al componer APIs" });
    }
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });