from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

app = FastAPI(title="Notificaciones Service - AgroCusco Directo")

db_notificaciones = []

class NotificacionSchema(BaseModel):
    usuario: str
    mensaje: str
    tipo: str = "PEDIDO"

@app.get("/health")
def health_check():
    return {"status": "UP", "service": "notificaciones-service"}

@app.post("/notificaciones", status_code=status.HTTP_201_CREATED)
def enviar_notificacion(notificacion: NotificacionSchema):
    if not notificacion.usuario or not notificacion.mensaje:
        raise HTTPException(status_code=400, detail="El usuario y mensaje son obligatorios")

    nueva = {
        "id": len(db_notificaciones) + 1,
        "usuario": notificacion.usuario,
        "mensaje": notificacion.mensaje,
        "tipo": notificacion.tipo,
        "estado": "ENVIADO"
    }
    db_notificaciones.append(nueva)
    return nueva

@app.get("/notificaciones/{usuario}")
def obtener_notificaciones(usuario: str):
    user_notifs = [n for n in db_notificaciones if n["usuario"] == usuario]
    return {"usuario": usuario, "notificaciones": user_notifs, "total": len(user_notifs)}