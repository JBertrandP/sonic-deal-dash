const API_URL = 'https://sonic-core-api.onrender.com';

// Manejar el formulario de la Wishlist
document.getElementById('wishlistForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const gameName = document.getElementById('gameName').value;
    const userEmail = document.getElementById('userEmail').value;
    const statusMsg = document.getElementById('statusMessage');
    const emailContainer = document.getElementById('emailLinkContainer');

    statusMsg.innerText = "🤖 Sonic procesando predicción y generando correo...";
    statusMsg.className = "mt-3 text-info fw-bold text-center";
    emailContainer.innerHTML = ''; 

    try {
        const response = await fetch(`${API_URL}/wishlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game_name: gameName, user_email: userEmail })
        });

        if (response.ok) {
            const data = await response.json();
            
            statusMsg.innerText = "¡Datos guardados y Predicción completada! ";
            statusMsg.className = "mt-3 text-success fw-bold text-center";
            
            // Botón para ver el correo
            emailContainer.innerHTML = `
                <a href="${data.emailUrl}" target="_blank" class="btn btn-warning btn-sm w-100 shadow-sm animate__animated animate__pulse animate__infinite">
                     Ver Correo de Predicción Generado!
                </a>
            `;

            document.getElementById('wishlistForm').reset();
            loadTrackingList(); // Recarga la lista de abajo para mostrar el precio real
        } else {
            statusMsg.innerText = "Error: Se bloqueó la señal. ";
            statusMsg.className = "mt-3 text-danger fw-bold text-center";
        }
    } catch (error) {
        statusMsg.innerText = "Error de conexión con la nube. ";
        statusMsg.className = "mt-3 text-danger fw-bold text-center";
    }
});

// 2. Medir la latencia 
async function checkHealth() {
    try {
        const start = performance.now();
        await fetch(`${API_URL}/health`);
        const end = performance.now();
        
        console.log("API Latency: " + (end - start).toFixed(2) + " ms"); 
    } catch (err) {
        console.error("La API está apagada");
    }
}

// Funcion auxiliar para dibujar las tarjetas HTML
function createCardHTML(game, showSpeedrunBtn) {
    // Generar botones de speedrun dinámicamente
    let speedrunButtonsHTML = '';
    if (showSpeedrunBtn && game.speedrun.has_runs) {
        game.speedrun.buttons.forEach(btn => {
            speedrunButtonsHTML += `<a href="${btn.url}" target="_blank" class="btn btn-outline-info btn-sm">${btn.label}</a>`;
        });
    } else if (showSpeedrunBtn) {

        // Por si algún juego base no tiene speedrun conocido
        speedrunButtonsHTML = `<button class="btn btn-outline-secondary btn-sm" disabled>⏱️ Sin Récords</button>`;
    }

    return `
        <div class="col sonic-card" style="opacity: 0;">
            <div class="card h-100 bg-secondary text-white ${showSpeedrunBtn ? 'border-info' : 'border-warning'} shadow">
                <img src="${game.thumb}" class="card-img-top" alt="${game.name}" style="height: 120px; object-fit: cover;">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title ${showSpeedrunBtn ? 'text-info' : 'text-warning'} fs-6">${game.name}</h5>
                    <p class="card-text fs-4 fw-bold text-light mt-auto mb-2">$${game.cheapest_price} USD</p>
                    <div class="d-grid gap-2">
                        <a href="${game.deal_link}" target="_blank" class="btn btn-success btn-sm">🛒 Comprar Oferta</a>
                        ${speedrunButtonsHTML}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Cargar el catálogo dividido
async function loadSonicCatalog() {
    const gridSpeedruns = document.getElementById('speedrunGrid');
    const gridDeals = document.getElementById('dealsGrid');
    
    try {
        const response = await fetch(`${API_URL}/sonic-games`);
        const data = await response.json();
        
        // Limpiar los contenedores
        gridSpeedruns.innerHTML = '';
        gridDeals.innerHTML = '';

        // Dibujar Lista 1 (Juegos con Speedruns)
        if (data.speedruns.length > 0) {
            data.speedruns.forEach(game => gridSpeedruns.innerHTML += createCardHTML(game, true));
        } else {
            gridSpeedruns.innerHTML = '<p class="text-muted">No hay juegos principales en oferta hoy.</p>';
        }

        // Dibujar Lista 2 (DLCs y Extras)
        if (data.deals.length > 0) {
            data.deals.forEach(game => gridDeals.innerHTML += createCardHTML(game, false));
        } else {
            gridDeals.innerHTML = '<p class="text-muted">No hay DLCs en oferta hoy.</p>';
        }

        // --- ANIMACIÓN CON ANIME.JS ---
        anime({
            targets: '.sonic-card',
            opacity: [0, 1],
            translateY: [30, 0],
            delay: anime.stagger(100),
            easing: 'easeOutQuad',
            duration: 600
        });

    } catch (error) {
        console.error("Error al cargar el catálogo:", error);
        gridSpeedruns.innerHTML = '<p class="text-danger">Error conectando con la base de datos de ofertas.</p>';
    }
}

// Traer los datos de Supabase y mostrarlos en pantalla
async function loadTrackingList() {
    const trackingList = document.getElementById('trackingList');
    try {
        const response = await fetch(`${API_URL}/wishlist`);
        const data = await response.json();

        trackingList.innerHTML = ''; 

        if (data.length === 0) {
            trackingList.innerHTML = '<li class="list-group-item bg-secondary text-warning border-info">Aún no estás trackeando ningún juego.</li>';
            return;
        }

        // Recorrer la base de datos y crear un elemento de lista por cada juego
        data.forEach(item => {
            trackingList.innerHTML += `
                <li class="list-group-item bg-secondary text-white border-info d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${item.game_name}</strong> <br>
                        <small class="text-info">Alerta a: ${item.user_email}</small>
                    </div>
                    <span class="badge bg-success rounded-pill">Target: $${item.current_price}</span>
                </li>
            `;
        });
    } catch (error) {
        console.error("Error al cargar tracking:", error);
        trackingList.innerHTML = '<li class="list-group-item bg-secondary text-danger border-info">Error al conectar con la base de datos.</li>';
    }
}

// Ejecutar la función al abrir la página
loadTrackingList();

loadSonicCatalog();
checkHealth();