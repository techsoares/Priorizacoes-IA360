import json
import re

import httpx

from app.config import settings

RATIONALE_MAX_WORDS = 20


def normalize_rationale(value: str, fallback: str) -> str:
    cleaned = re.sub(r"\s+", " ", (value or "").strip())
    if not cleaned or cleaned.lower() == "none":
        cleaned = fallback

    words = cleaned.split()
    if len(words) > RATIONALE_MAX_WORDS:
        cleaned = " ".join(words[:RATIONALE_MAX_WORDS]) + "..."

    return cleaned


def extract_json_object(text: str) -> dict:
    if not text:
        return {}

    cleaned = re.sub(r"```(?:json)?\s*", "", text).strip()

    try:
        result = json.loads(cleaned)
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", cleaned, re.S)
    if match:
        try:
            result = json.loads(match.group(0))
            if isinstance(result, dict):
                return result
        except json.JSONDecodeError:
            pass

    partial = {}

    match = re.search(r'"delta_score"\s*:\s*(-?\d+(?:\.\d+)?)', cleaned)
    if match:
        try:
            partial["delta_score"] = float(match.group(1))
        except ValueError:
            pass

    match = re.search(r'"confidence"\s*:\s*([\d.]+)', cleaned)
    if match:
        try:
            partial["confidence"] = float(match.group(1))
        except ValueError:
            pass

    match = re.search(r'"rationale"\s*:\s*"([^"]*)', cleaned)
    if match:
        rationale = match.group(1).strip().rstrip(",")
        if rationale:
            partial["rationale"] = rationale

    return partial


def local_priority_evaluation(reason: str) -> dict:
    text = (reason or "").lower()
    delta = 0

    if any(word in text for word in ["urgente", "urgência", "urgencia", "prazo", "deadline", "risco", "cliente"]):
        delta += 5
    if any(word in text for word in ["receita", "faturamento", "economia", "custo", "produção", "producao", "produtividade"]):
        delta += 4
    if any(word in text for word in ["bloqueio", "dependência", "dependencia", "travado", "impede"]):
        delta += 3
    if any(word in text for word in ["multa", "compliance", "regulatório", "regulatorio", "contrato"]):
        delta += 3
    if len(text.strip()) < 30:
        delta -= 3

    return {
        "delta_score": int(max(-15, min(15, delta))),
        "confidence": 0.4,
        "rationale": "Impacto e urgência avaliados localmente.",
        "mode": "fallback",
        "model": "local-fallback",
        "raw": {},
    }


async def evaluate_priority_request(payload: dict) -> dict:
    if not settings.openrouter_api_key:
        return local_priority_evaluation(payload.get("reason", ""))

    roi = payload.get("roi_percent")
    payback = payload.get("payback_months")
    development_hours = payload.get("development_estimate_hours")
    hours_saved = payload.get("hours_saved_month")

    metrics_lines = []
    if roi is not None:
        metrics_lines.append(f"ROI: {roi:.1f}% (maior = melhor)")
    if payback is not None:
        metrics_lines.append(f"Payback: {payback:.1f} meses (menor = melhor)")
    if development_hours is not None:
        metrics_lines.append(f"Dev: {development_hours:.0f}h (menor = melhor)")
    if hours_saved is not None:
        metrics_lines.append(f"Economia: {hours_saved:.1f}h/mês (maior = melhor)")

    metrics_text = " | ".join(metrics_lines) if metrics_lines else "Sem métricas disponíveis"
    user_prompt = (
        f"Iniciativa: {payload.get('jira_key')} - {payload.get('summary')}\n"
        f"Score base atual: {payload.get('priority_base_score', 0):.1f}/100\n"
        f"Métricas: {metrics_text}\n"
        f"Motivo principal: {payload.get('reason', '')}\n\n"
        'Retorne apenas JSON válido, sem markdown e sem texto extra:\n'
        '{"delta_score": 0, "confidence": 0.0, "rationale": "frase curta"}\n'
        "delta_score: inteiro entre -15 e 15\n"
        "confidence: decimal entre 0.0 e 1.0\n"
        f"rationale: máximo {RATIONALE_MAX_WORDS} palavras em português brasileiro"
    )

    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    if settings.openrouter_site_url:
        headers["HTTP-Referer"] = settings.openrouter_site_url
    if settings.openrouter_app_name:
        headers["X-Title"] = settings.openrouter_app_name

    body = {
        "model": settings.openrouter_model,
        "temperature": 0,
        "max_tokens": 160,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Você avalia pedidos de prioridade para iniciativas de IA. "
                    "ROI alto é bom. Payback baixo é bom. Desenvolvimento baixo é bom. "
                    "Horas economizadas altas são boas. "
                    "delta_score acima de 8 só quando houver impacto financeiro claro e urgência real. "
                    "Retorne somente JSON válido, sem markdown, sem texto extra. "
                    f"A rationale deve ser clara, em português brasileiro, com no máximo {RATIONALE_MAX_WORDS} palavras."
                ),
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
    }

    try:
        timeout = httpx.Timeout(connect=2.0, read=5.0, write=4.0, pool=4.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=body,
            )
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError:
        return local_priority_evaluation(payload.get("reason", ""))

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    parsed = extract_json_object(content)
    if not parsed:
        return local_priority_evaluation(payload.get("reason", ""))

    try:
        delta_score = float(parsed.get("delta_score", 0))
    except (TypeError, ValueError):
        delta_score = 0.0

    try:
        confidence = float(parsed.get("confidence", 0.6))
    except (TypeError, ValueError):
        confidence = 0.6

    rationale = normalize_rationale(
        str(parsed.get("rationale") or ""),
        "Avaliação baseada nas métricas e no motivo.",
    )

    return {
        "delta_score": int(max(-15, min(15, round(delta_score)))),
        "confidence": max(0.0, min(1.0, round(confidence, 2))),
        "rationale": rationale,
        "mode": "openrouter",
        "model": settings.openrouter_model,
        "raw": {
            "content": content[:300],
            "parsed": parsed,
        },
    }
