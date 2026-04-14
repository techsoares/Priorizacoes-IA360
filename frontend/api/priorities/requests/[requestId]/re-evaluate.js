import { supabase } from '../../_lib/supabase.js'
import { get_current_user, require_admin } from '../../_lib/auth.js'
import { get_request_or_404, get_initiative_or_404, serialize_request, refresh_initiative_priority_scores, evaluate_request_for_initiative } from '../../_lib/requestsHelper.js'

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ detail: 'Method Not Allowed' });

    const authRecord = await get_current_user(req);
    if (authRecord.error) return res.status(authRecord.status).json({ detail: authRecord.error });
    
    const adminCheck = await require_admin(authRecord.user);
    if (adminCheck) return res.status(adminCheck.status).json({ detail: adminCheck.error });

    const { requestId } = req.query;

    try {
        const request_row = await get_request_or_404(requestId);
        const initiative = await get_initiative_or_404(request_row.initiative_id);

        const evaluation = await evaluate_request_for_initiative(initiative, request_row.reason || "");
        
        const now = new Date().toISOString();
        const { data: updated_request, error } = await supabase
            .from('priority_requests')
            .update({
                ai_model: evaluation.model,
                ai_delta_score: evaluation.delta_score,
                ai_confidence: evaluation.confidence,
                ai_rationale: evaluation.rationale,
                ai_mode: evaluation.mode,
                ai_payload: evaluation.raw,
                evaluated_at: now,
            })
            .eq('id', requestId)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ detail: error.message });
        }

        const updated_initiative = await refresh_initiative_priority_scores(request_row.initiative_id);

        return res.status(200).json({
            request: serialize_request(updated_request, { [updated_initiative.id]: updated_initiative }),
            initiative: updated_initiative
        });

    } catch (error) {
        return res.status(error.status || 500).json({ detail: error.detail || error.message });
    }
}
