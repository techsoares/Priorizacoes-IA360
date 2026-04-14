export const RATIONALE_MAX_WORDS = 20;

export function normalizeRationale(value, fallback) {
    let cleaned = (value || '').trim().replace(/\s+/g, ' ');
    if (!cleaned || cleaned.toLowerCase() === 'none') {
        cleaned = fallback;
    }

    const words = cleaned.split(' ');
    if (words.length > RATIONALE_MAX_WORDS) {
        cleaned = words.slice(0, RATIONALE_MAX_WORDS).join(' ') + '...';
    }

    return cleaned;
}

export function extractJsonObject(text) {
    if (!text) return {};

    let cleaned = text.replace(/```(?:json)?\s*/g, '').trim();

    try {
        const result = JSON.parse(cleaned);
        if (typeof result === 'object' && result !== null) {
            return result;
        }
    } catch (e) {
        // ignore
    }

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            const result = JSON.parse(match[0]);
            if (typeof result === 'object' && result !== null) {
                return result;
            }
        } catch (e) {
            // ignore
        }
    }

    const partial = {};

    const deltaMatch = cleaned.match(/"delta_score"\s*:\s*(-?\d+(?:\.\d+)?)/);
    if (deltaMatch) {
        partial.delta_score = parseFloat(deltaMatch[1]);
    }

    const confMatch = cleaned.match(/"confidence"\s*:\s*([\d.]+)/);
    if (confMatch) {
        partial.confidence = parseFloat(confMatch[1]);
    }

    const ratMatch = cleaned.match(/"rationale"\s*:\s*"([^"]*)/);
    if (ratMatch) {
        let rationale = ratMatch[1].trim();
        if (rationale.endsWith(',')) {
            rationale = rationale.slice(0, -1);
        }
        if (rationale) {
            partial.rationale = rationale;
        }
    }

    return partial;
}

export function localPriorityEvaluation(reason) {
    const text = (reason || '').toLowerCase();
    let delta = 0;

    if (["urgente", "urgência", "urgencia", "prazo", "deadline", "risco", "cliente"].some(w => text.includes(w))) {
        delta += 5;
    }
    if (["receita", "faturamento", "economia", "custo", "produção", "producao", "produtividade"].some(w => text.includes(w))) {
        delta += 4;
    }
    if (["bloqueio", "dependência", "dependencia", "travado", "impede"].some(w => text.includes(w))) {
        delta += 3;
    }
    if (["multa", "compliance", "regulatório", "regulatorio", "contrato"].some(w => text.includes(w))) {
        delta += 3;
    }
    if (text.trim().length < 30) {
        delta -= 3;
    }

    const delta_score = Math.max(-15, Math.min(15, delta));

    return {
        delta_score: delta_score,
        confidence: 0.4,
        rationale: "Impacto e urgência avaliados localmente.",
        mode: "fallback",
        model: "local-fallback",
        raw: {},
    };
}

export async function evaluatePriorityRequest(payload) {
    if (!process.env.OPENROUTER_API_KEY) {
        return localPriorityEvaluation(payload.reason || "");
    }

    const roi = payload.roi_percent;
    const payback = payload.payback_months;
    const development_hours = payload.development_estimate_hours;
    const hours_saved = payload.hours_saved_month;

    const metricsLines = [];
    if (roi !== null && roi !== undefined) {
        metricsLines.push(`ROI: ${roi.toFixed(1)}% (maior = melhor)`);
    }
    if (payback !== null && payback !== undefined) {
        metricsLines.push(`Payback: ${payback.toFixed(1)} meses (menor = melhor)`);
    }
    if (development_hours !== null && development_hours !== undefined) {
        metricsLines.push(`Dev: ${development_hours.toFixed(0)}h (menor = melhor)`);
    }
    if (hours_saved !== null && hours_saved !== undefined) {
        metricsLines.push(`Economia: ${hours_saved.toFixed(1)}h/mês (maior = melhor)`);
    }

    const metricsText = metricsLines.length > 0 ? metricsLines.join(' | ') : "Sem métricas disponíveis";
    const userPrompt = `Iniciativa: ${payload.jira_key || ''} - ${payload.summary || ''}\n` +
        `Score base atual: ${(payload.priority_base_score || 0).toFixed(1)}/100\n` +
        `Métricas: ${metricsText}\n` +
        `Motivo principal: ${payload.reason || ''}\n\n` +
        'Retorne apenas JSON válido, sem markdown e sem texto extra:\n' +
        '{"delta_score": 0, "confidence": 0.0, "rationale": "frase curta"}\n' +
        "delta_score: inteiro entre -15 e 15\n" +
        "confidence: decimal entre 0.0 e 1.0\n" +
        `rationale: máximo ${RATIONALE_MAX_WORDS} palavras em português brasileiro`;

    const modelParam = process.env.OPENROUTER_MODEL || "anthropic/claude-opus-4-5";

    const headers = {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
    };
    if (process.env.OPENROUTER_SITE_URL) headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL;
    if (process.env.OPENROUTER_APP_NAME) headers["X-Title"] = process.env.OPENROUTER_APP_NAME;

    const body = {
        model: modelParam,
        temperature: 0,
        max_tokens: 160,
        messages: [
            {
                role: "system",
                content: "Você avalia pedidos de prioridade para iniciativas de IA. " +
                         "ROI alto é bom. Payback baixo é bom. Desenvolvimento baixo é bom. " +
                         "Horas economizadas altas são boas. " +
                         "delta_score acima de 8 só quando houver impacto financeiro claro e urgência real. " +
                         "Retorne somente JSON válido, sem markdown, sem texto extra. " +
                         `A rationale deve ser clara, em português brasileiro, com no máximo ${RATIONALE_MAX_WORDS} palavras.`
            },
            {
                role: "user",
                content: userPrompt
            }
        ]
    };

    let data;
    try {
        const AbortController = globalThis.AbortController;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return localPriorityEvaluation(payload.reason || "");
        }
        data = await response.json();
    } catch (err) {
        return localPriorityEvaluation(payload.reason || "");
    }

    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = extractJsonObject(content);
    if (!parsed || Object.keys(parsed).length === 0) {
        return localPriorityEvaluation(payload.reason || "");
    }

    let delta_score = parseFloat(parsed.delta_score);
    if (isNaN(delta_score)) delta_score = 0;

    let confidence = parseFloat(parsed.confidence);
    if (isNaN(confidence)) confidence = 0.6;

    const rationale = normalizeRationale(
        parsed.rationale || "",
        "Avaliação baseada nas métricas e no motivo."
    );

    return {
        delta_score: Math.max(-15, Math.min(15, Math.round(delta_score))),
        confidence: Math.max(0.0, Math.min(1.0, confidence)),
        rationale: rationale,
        mode: "openrouter",
        model: modelParam,
        raw: {
            content: content.substring(0, 300),
            parsed: parsed,
        },
    };
}
