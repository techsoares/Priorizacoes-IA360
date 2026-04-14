import { supabase } from '../_lib/supabase.js'
import { get_current_user, require_admin } from '../_lib/auth.js'
import { get_request_or_404, refresh_initiative_priority_scores } from '../_lib/requestsHelper.js'

export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).json({ detail: 'Method Not Allowed' });

    const authRecord = await get_current_user(req);
    if (authRecord.error) return res.status(authRecord.status).json({ detail: authRecord.error });
    
    const adminCheck = await require_admin(authRecord.user);
    if (adminCheck) return res.status(adminCheck.status).json({ detail: adminCheck.error });

    const { requestId } = req.query;

    try {
        const request_row = await get_request_or_404(requestId);
        const initiative_id = request_row.initiative_id;

        const { error } = await supabase
            .from('priority_requests')
            .delete()
            .eq('id', requestId);

        if (error) {
            return res.status(500).json({ detail: error.message });
        }

        const updated_initiative = await refresh_initiative_priority_scores(initiative_id);
        return res.status(200).json({ initiative: updated_initiative });

    } catch (error) {
        return res.status(error.status || 500).json({ detail: error.detail || error.message });
    }
}
