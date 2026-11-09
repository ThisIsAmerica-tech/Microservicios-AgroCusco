const request = require('supertest');

// Simulamos la conexión a MySQL para que el test corra rápido y sin errores de red
jest.mock('mysql2/promise', () => {
    const mPool = {
        query: jest.fn().mockResolvedValue([[{ id: 1, nombre: "Papa Nativa", precio: 2.50, stock: 50 }]])
    };
    return { createPool: jest.fn(() => mPool) };
});

const app = require('../src/server');

describe('Pruebas del Microservicio de Productos', () => {

    test('test_listar_productos: Consulta del catálogo responde 200 con la lista', async () => {
        const res = await request(app).get('/productos');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0].nombre).toBe("Papa Nativa");
    });

    test('test_health_check: Verifica que el endpoint de salud responda 200', async () => {
        const res = await request(app).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('OK');
    });
});