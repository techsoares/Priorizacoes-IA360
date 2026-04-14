import { supabase } from './_lib/supabase.js'
import { get_current_user } from './_lib/auth.js'
import { localPriorityEvaluation } from './_lib/ai.js'
import {
    get_initiative_or_404,
    serialize_request,
    refresh_initiative_priority_scores,
    evaluate_request_for_initiative
} from './_lib/requestsHelper.js'

async function get_profile_name(email) {
    try {
        const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('email', email)
            .limit(1);
        if (data && data.length > 0) {
            return data[0].full_name || '';
        }
    } catch (e) {
        return "";
    }
    return "";
}

export default async function handler(req, res) {
    const authRecord = await get_current_user(req);
    if (authRecord.error) return res.status(authRecord.status).json({ detail: authRecord.error });
    const user = authRecord.user;

    if (req.method === 'GET') {
        try {
            const { data: request_rows } = await supabase
                .from('priority_requests')
                .select('*')
                .order('created_at', { ascending: false });
                
            const rows = request_rows || [];
            const initiative_ids = [...new Set(rows.map(r => r.initiative_id).filter(Boolean))];
            
            let initiatives_by_id = {};
            if (initiative_ids.length > 0) {
                const { data: initiatives } = await supabase
                    .from('initiatives')
                    .select('id, jira_key, summary, priority_final_score')
                    .in('id', initiative_ids);
                
                if (initiatives) {
                    initiatives.forEach(init => initiatives_by_id[init.id] = init);
                }
            }
            
            const result = rows.map(row => serialize_request(row, initiatives_by_id));
            return res.status(200).json(result);
        } catch (error) {
            return res.status(error.status || 500).json({ detail: error.detail || error.message });
        }
    } 
    else if (req.method === 'POST') {
        const payload = req.body;
        
        try {
            const initiative = await get_initiative_or_404(payload.initiative_id);
            const requester_email = user.email.toLowerCase().trim();
            const profile_name = await get_profile_name(requester_email);
            const requester_name = user.full_name || profile_name || requester_email.split('@')[0];
            
            const { data: existing } = await supabase
                .from('priority_requests')
                .select('id, status')
                .eq('initiative_id', payload.initiative_id)
                .eq('requester_email', requester_email)
                .limit(1);
                
            const existing_row = existing && existing.length > 0 ? existing[0] : null;
            
            if (existing_row && existing_row.status === 'active' && !payload.replace) {
                return res.status(409).json({ detail: "Você já possui um pedido ativo para esta iniciativa." });
            }
            
            let evaluation;
            try {
                evaluation = await evaluate_request_for_initiative(initiative, payload.reason.trim());
            } catch (error) {
                evaluation = localPriorityEvaluation(payload.reason.trim());
            }
            
            const now = new Date().toISOString();
            const upsert_data = {
                initiative_id: payload.initiative_id,
                requester_email: requester_email,
                requester_name: requester_name,
                reason: payload.reason.trim(),
                status: 'active',
                ai_model: evaluation.model,
                ai_delta_score: evaluation.delta_score,
                ai_confidence: evaluation.confidence,
                ai_rationale: evaluation.rationale,
                ai_mode: evaluation.mode,
                ai_payload: evaluation.raw,
                evaluated_at: now,
                updated_at: now,
            };
            
            const { data: upsert_result } = await supabase
                .from('priority_requests')
                .upsert(upsert_data, { onConflict: 'initiative_id,requester_email' })
                .select();
                
            let saved_request = upsert_result && upsert_result.length > 0 ? upsert_result[0] : null;
            
            if (!saved_request) {
                const { data: fetch_after } = await supabase
                    .from('priority_requests')
                    .select('*')
                    .eq('initiative_id', payload.initiative_id)
                    .eq('requester_email', requester_email)
                    .single();
                saved_request = fetch_after;
            }
            
            if (!saved_request) {
                return res.status(500).json({ detail: "Não foi possível recuperar o pedido após salvar." });
            }
            
            const updated_initiative = await refresh_initiative_priority_scores(payload.initiative_id, initiative);
            
            return res.status(200).json({
                request: serialize_request(saved_request, { [updated_initiative.id]: updated_initiative }),
                initiative: updated_initiative
            });
            
        } catch (error) {
            return res.status(error.status || 500).json({ detail: error.detail || error.message });
        }
    }
    
    return res.status(405).json({ detail: 'Method Not Allowed' });
}
