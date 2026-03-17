require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// NUEVO: Endpoint para LEER la Wishlist de Supabase
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

// ==========================================
// LÓGICA DE NEGOCIO Y NORMALIZACIÓN (CORREGIDA)
// ==========================================

function isExtraContent(gameName) {
    const lowerName = gameName.toLowerCase();
    
    // 1. BLACKLIST ESTRICTA: Si tiene estas palabras, se va a Extras SIN EXCEPCIÓN.
    const strictBlacklist = [
        'dlc', 'soundtrack', 'pack', 'expansion', 'costume', 'bundle', 
        'season pass', 'deluxe', 'battle', 'bonus', 'music', 'upgrade', 
        'encore', 'plus' // <-- Añadimos Plus y Battle
    ];
    
    // Si la blacklist lo atrapa, es DLC.
    if (strictBlacklist.some(keyword => lowerName.includes(keyword))) {
        return true; 
    }

    return false; // Si sobrevive, es juego base
}

// 2. Diccionario de Excepciones (MÚLTIPLES BOTONES - PARCHE FINAL)
function getManualSpeedrunLink(gameName) {
    const lowerName = gameName.toLowerCase();
    
    if (lowerName.includes('adventure dx')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/sadx' }];
    if (lowerName.includes('adventure 2')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/sa2b' }];
    if (lowerName.includes('episode 1') || lowerName.includes('episode i')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/s4e1' }];
    if (lowerName.includes('episode 2') || lowerName.includes('episode ii')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/s4e2' }];
    if (lowerName.includes('mania')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/sonic_mania' }];
    
    // FIX 1: Transformed (Abreviatura oficial SASRT)
    if (lowerName.includes('transformed')) return [{ label: ' ⏱️ Ver Récords', url: 'https://www.speedrun.com/asrt' }];
    
    // FIX 2: CrossWorlds (Búsqueda forzada exacta)
    if (lowerName.includes('crossworlds')) return [{ label: '⏱️ Ver Récords', url: 'https://www.speedrun.com/srcw' }];

    // FIX 3: Sonic X Shadow Generations (Links exactos para las versiones 2024)
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
                // Formato de Botón Único Dinámico
                return { has_runs: true, buttons: [{ label: '⏱️ Ver Récords', url: data.data[0].weblink }] };
            }
        }
        return { has_runs: false, buttons: [] };
    } catch (error) {
        return { has_runs: false, buttons: [] };
    }
}

// ENDPOINT PRINCIPAL
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