const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.json());

const PORT = process.env.PORT || 8002;

// Endpoints requeridos por el proyecto AgroCusco Directo:
app.get('/productos', (req, res) => {
    res.json({ message: "Lista de productos" });
});

app.post('/productos', (req, res) => {
    res.status(201).json({ message: "Producto creado" });
});

app.put('/productos/:id', (req, res) => {
    res.json({ message: `Producto ${req.params.id} actualizado` });
});

app.patch('/productos/:id/stock', (req, res) => {
    res.json({ message: `Stock del producto ${req.params.id} modificado` });
});

// Endpoint de monitoreo de salud (health check) requerido
app.get('/health', (req, res) => {
    res.status(200).json({ status: "OK", service: "productos-service" });
});

app.listen(PORT, () => {
    console.log(`Servidor de productos corriendo en el puerto ${PORT}`);
});