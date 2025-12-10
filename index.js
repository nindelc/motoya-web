require('dotenv').config(); // Carga las variables del archivo .env (solo en local)
const express = require("express");
const app = express();
const cors = require("cors");
const { MercadoPagoConfig, Preference } = require("mercadopago");
const path = require("path");

app.use(express.json());
app.use(cors());

// 1. ARCHIVOS ESTÁTICOS (Tu Frontend)
// El servidor busca la carpeta 'www' y muestra el index.html automáticamente
// IMPORTANTE: Asegúrate de guardar 'payment_status.html' dentro de esta carpeta 'www'
app.use(express.static(path.join(__dirname, "www")));

// 2. CONFIGURACIÓN MERCADO PAGO SEGURA
// El servidor buscará la clave en las variables de entorno (Render o .env)
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN 
});

// 3. RUTA PARA CREAR EL PAGO
app.post("/create_preference", async (req, res) => {
    try {
        console.log("Datos recibidos:", req.body);

        const titulo = req.body.title || "Producto de Prueba (MotoYa)";
        const cantidad = Number(req.body.quantity) || 1;
        const precio = Number(req.body.price) || 100;

        // Detecta automáticamente si es localhost o Render para las redirecciones
        const protocol = req.protocol;
        const host = req.get('host');
        const baseURL = `${protocol}://${host}`;

        const body = {
            items: [
                {
                    title: titulo,
                    quantity: cantidad,
                    unit_price: precio,
                    currency_id: "ARS", 
                },
            ],
            // --- CAMBIO AQUÍ: Redirigimos todo al archivo payment_status.html ---
            back_urls: {
                success: `${baseURL}/payment_status.html`,
                failure: `${baseURL}/payment_status.html`,
                pending: `${baseURL}/payment_status.html`,
            },
            auto_return: "approved",
            // --------------------------------------------------------------------
            
            // IMPORTANTE: En Render deberás configurar MP_WEBHOOK_URL si quieres usar una externa,
            // o usar la autodetectada. Por defecto apuntamos a la ruta interna.
            notification_url: "https://motoya.ar/webhook", 
        };

        const preference = new Preference(client);
        const result = await preference.create({ body });

        console.log("✅ Preferencia creada ID:", result.id);
        
        res.json({ 
            id: result.id,
            init_point: result.init_point 
        });

    } catch (error) {
        console.error("❌ Error al crear preferencia:", error);
        res.status(500).json({ 
            error: "Error al crear la preferencia", 
            message: error.message 
        });
    }
});

// 4. WEBHOOK
app.post("/webhook", (req, res) => {
    const paymentId = req.query.id || req.body.data?.id;
    const topic = req.query.topic || req.body.type;
    
    console.log("🔔 Webhook recibido:", topic, paymentId);
    
    // Aquí podrías validar el pago consultando a Mercado Pago con el paymentId
    
    res.status(200).send("OK");
});

// 5. RUTAS FRONTEND (Cualquier otra ruta lleva al index.html)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "www", "index.html"));
});

// 6. INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});
