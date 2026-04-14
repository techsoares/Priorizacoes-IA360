import { supabase } from './supabase.js'
import { buildPriorityFields, calculateMetrics } from './scoring.js'
import { evaluatePriorityRequest } from './ai.js'

export async function get_initiative_or_404(initiative_id) {
    const { data } = await supabase
        .from('initiatives')
        .select('*')
        .eq('id', initiative_id)
        .single();
    if (!data) throw { status: 404, detail: "Iniciativa não encontrada." };
    return data;
}

export async function get_request_or_404(request_id) {
    const { data } = await supabase
        .from('priority_requests')
        .select('*')
        .eq('id', request_id)
        .single();
    if (!data) throw { status: 404, detail: "Pedido de prioridade não encontrado." };
    return data;
}

export function serialize_request(request_row, initiatives_by_id) {
    const initiative = initiatives_by_id[request_row.initiative_id] || {};
    return {
        ...request_row,
        jira_key: initiative.jira_key || null,
        summary: initiative.summary || null,
        priority_final_score: initiative.priority_final_score || null,
    };
}

export async function refresh_initiative_priority_scores(initiative_id, initiative = null) {
    const init = initiative || await get_initiative_or_404(initiative_id);
    
    const { data: active_requests } = await supabase
        .from('priority_requests')
        .select('*')
        .eq('initiative_id', initiative_id)
        .eq('status', 'active');
        
    const requests = active_requests || [];
    const aggregated_request_score = requests.reduce((acc, item) => acc + parseFloat(item.ai_delta_score || 0), 0);
    
    const priority_fields = buildPriorityFields(init, aggregated_request_score, requests.length);
    priority_fields.priority_score_updated_at = new Date().toISOString();
    
    const { data: updated } = await supabase
        .from('initiatives')
        .update(priority_fields)
        .eq('id', initiative_id)
        .select();
        
    return updated && updated.length > 0 ? updated[0] : { ...init, ...priority_fields };
}

export async function evaluate_request_for_initiative(initiative, reason) {
    const metrics = calculateMetrics(initiative);
    const breakdown = initiative.priority_score_breakdown || {};
    
    const payload = {
        jira_key: initiative.jira_key,
        summary: initiative.summary,
        priority_base_score: initiative.priority_base_score || breakdown.base_score || 0,
        roi_percent: metrics.roi_percent,
        payback_months: metrics.payback_months,
        development_estimate_hours: metrics.development_estimate_hours,
        hours_saved_month: metrics.total_hours_saved,
        reason: reason,
    };
    
    return await evaluatePriorityRequest(payload);
}
