# 🦔 Sonic Deal Dash: Distributed System

Un sistema distribuido multiplataforma diseñado para el seguimiento de ofertas de la franquicia *Sonic the Hedgehog* en Steam, integración de récords mundiales (Speedruns) y un motor de predicción de ofertas con alertas asíncronas.

Este proyecto forma parte de la **Evidencia 4** para la carrera de **Desarrollo de Software Multiplataforma** en **UTCH BIS**.

---

##  Arquitectura del Sistema

El sistema sigue un modelo de **Arquitectura Orientada a Servicios (SOA)** y un patrón **BFF (Backend For Frontend)** para la optimización de datos.

### Componentes:
1.  **Frontend Web (Cliente):** Interfaz responsiva construida con Bootstrap 5 y animaciones dinámicas mediante Anime.js.
2.  **Core API (Servidor):** API Gateway construida en Node.js/Express que realiza composición de datos (API Composition) consumiendo CheapShark y Speedrun.com.
3.  **Prediction Worker (Microservicio):** Worker independiente que procesa la base de datos de forma asíncrona para despachar notificaciones SMTP.
4.  **Supabase (Persistencia):** Base de datos PostgreSQL en la nube para la gestión de la Wishlist global.



---

##  Tech Stack

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | HTML5, JavaScript (ES6+), Bootstrap 5 | Interfaz de usuario y lógica del cliente. |
| **Backend** | Node.js, Express | Lógica de negocio y composición de APIs externas. |
| **Database** | Supabase (PostgreSQL) | Persistencia de datos distribuida. |
| **Animación** | Anime.js | Microinteracciones y visualización de datos. |
| **Alertas** | Nodemailer | Motor de notificaciones asíncronas. |

---

##  Funcionalidades Clave

* **Live Deals:** Seguimiento en tiempo real de precios en Steam mediante la API de CheapShark.
* **Speedrun Integration:** Vinculación directa con las tablas de clasificación oficiales de Speedrun.com.
* **Intelligent Filtering:** Sistema de normalización de datos para diferenciar entre juegos base y contenido descargable (DLC).
* **Real-time Tracking:** Panel dinámico que refleja el estado actual de la base de datos de Supabase.
* **Asynchronous Alerts:** Envío de correos electrónicos de simulación cuando se detectan registros en la lista de deseados.

---

##  Requisitos e Instalación

### Requisitos:
* Node.js v20+
* Cuenta de Supabase (URL y API Key)

### Instalación:
1. Clonar el repositorio:
   ```bash
   git clone [https://github.com/JBertrandP/sonic-deal-dash.git](https://github.com/JBertrandP/sonic-deal-dash.git)