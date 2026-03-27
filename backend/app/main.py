from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.initiatives.router import router as initiatives_router

app = FastAPI(
    title="IA360° Dashboard API",
    description="API do Dashboard de Priorização de Iniciativas IA360°",
    version="1.0.0",
)

# =============================================
# AGENTE INFOSEC: CORS restrito ao frontend
# Sem wildcard (*) — apenas a origem autorizada
# =============================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# Rotas
app.include_router(initiatives_router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "ia360-dashboard-api"}
