require('dotenv').config();
const nodemailer = require('nodemailer');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function runPredictionWorker() {
    console.log("Sonic Prediction Worker está escaneando la base de datos...");

    try {
        // 1. Leemos la Wishlist de Supabase
        const response = await fetch(`${SUPABASE_URL}/rest/v1/wishlist?select=*`, {
            method: 'GET',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        
        const wishlist = await response.json();
        console.log(`📊 Se encontraron ${wishlist.length} registros para procesar.`);

        // 2. Configuramos el servicio de correo (Ethereal para pruebas gratis)
        let testAccount = await nodemailer.createTestAccount();
        let transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
        });

        // 3. Procesamos cada registro
        for (const entry of wishlist) {
            console.log(` Generando alerta para: ${entry.user_email} (Juego: ${entry.game_name})`);
            
            let info = await transporter.sendMail({
                from: '"Sonic Deal Dash 🦔" <alerts@sonicdeals.com>',
                to: entry.user_email,
                subject: ` ¡Oferta detectada para ${entry.game_name}!`,
                text: `¡Hola! Se ha detectado una baja de precio para ${entry.game_name}. ¡Corre a darle valioso dinero a SEGA!`,
                html: `<b>¡Hola!</b><br>Se ha detectado una baja de precio para <b>${entry.game_name}</b>.<br><br><a href="#">Haz clic aquí para ver la oferta</a>`
            });

            console.log(" Correo enviado a la cola de salida.");
            console.log(" Ver correo en vivo:", nodemailer.getTestMessageUrl(info));
        }

        console.log(" Tarea finalizada. El Worker entrará en reposo.");

    } catch (error) {
        console.error("❌ Error en el Worker:", error.message);
    }
}

runPredictionWorker();