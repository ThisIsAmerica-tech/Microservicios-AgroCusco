from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "UP"

def test_enviar_notificacion_ok():
    payload = {"usuario": "comprador1", "mensaje": "Tu pedido #1 fue confirmado", "tipo": "PEDIDO"}
    response = client.post("/notificaciones", json=payload)
    assert response.status_code == 201
    assert response.json()["estado"] == "ENVIADO"

def test_obtener_notificaciones_usuario():
    client.post("/notificaciones", json={"usuario": "productor1", "mensaje": "Nuevo pedido recibido"})
    response = client.get("/notificaciones/productor1")
    assert response.status_code == 200
    assert response.json()["total"] >= 1