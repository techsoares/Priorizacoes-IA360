import { supabase } from '../../_lib/supabase.js'
import { get_current_user, require_admin } from '../../_lib/auth.js'
import { get_request_or_404, serialize_request, refresh_initiative_priority_scores } from '../../_lib/requestsHelper.js'

export default async function handler(req, res) {
    if (req.method !== 'PATCH') return res.status(405).json({ detail: 'Method Not Allowed' });

    const authRecord = await get_current_user(req);
    if (authRecord.error) return res.status(authRecord.status).json({ detail: authRecord.error });
    
    const adminCheck = await require_admin(authRecord.user);
    if (adminCheck) return res.status(adminCheck.status).json({ detail: adminCheck.error });

    const { requestId } = req.query;
    const { status } = req.body;

    if (!status || !['active', 'archived'].includes(status)) {
        return res.status(422).json({ detail: "Status must be 'active' or 'archived'" });
    }

    try {
        const request_row = await get_request_or_404(requestId);

        const { data: updated_request, error } = await supabase
            .from('priority_requests')
            .update({ status })
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
