const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8002;

// Configuración del pool de conexiones a MySQL
const dbPool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'agro_productos',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Endpoints requeridos por AgroCusco Directo
app.get('/productos', async (req, res) => {
    try {
        const [rows] = await dbPool.query('SELECT * FROM productos');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener productos" });
    }
});

app.post('/productos', async (req, res) => {
    const { nombre, categoria, precio, stock, zona } = req.body;
    try {
        const [result] = await dbPool.query(
            'INSERT INTO productos (nombre, categoria, precio, stock, zona) VALUES (?, ?, ?, ?, ?)',
            [nombre, categoria, precio, stock, zona]
        );
        res.status(201).json({ message: "Producto creado", id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Error al crear producto" });
    }
});

app.put('/productos/:id', (req, res) => {
    // Pendiente: Lógica de actualización completa
    res.json({ message: `Producto ${req.params.id} actualizado` });
});

app.patch('/productos/:id/stock', async (req, res) => {
    const { cantidad } = req.body; // Cantidad a descontar o sumar
    try {
        const [result] = await dbPool.query(
            'UPDATE productos SET stock = stock - ? WHERE id = ?',
            [cantidad, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: "Producto no encontrado" });
        res.json({ message: `Stock del producto ${req.params.id} modificado` });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar stock" });
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: "OK", service: "productos-service" });
});

app.listen(PORT, () => {
    console.log(`Servidor de productos corriendo en el puerto ${PORT}`);
});