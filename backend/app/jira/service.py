from base64 import b64encode

import httpx

from app.config import settings


def _get_auth_header() -> dict:
    """Gera o header Basic Auth para a API do Jira Cloud."""
    credentials = f"{settings.jira_email}:{settings.jira_api_token}"
    encoded = b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}


def _extract_option_value(raw_value) -> str:
    if not raw_value:
        return ""
    if isinstance(raw_value, dict):
        return raw_value.get("value", "")
    if isinstance(raw_value, list):
        values = [
            item.get("value", "")
            for item in raw_value
            if isinstance(item, dict) and item.get("value")
        ]
        return ", ".join(values)
    return str(raw_value)


def _extract_first_option_value(raw_value) -> str:
    if not raw_value:
        return ""
    if isinstance(raw_value, list):
        for item in raw_value:
            if isinstance(item, dict) and item.get("value"):
                return item["value"]
        return ""
    return _extract_option_value(raw_value)


def _extract_number(raw_value) -> float:
    if raw_value is None or raw_value == "":
        return 0
    try:
        return float(raw_value)
    except (TypeError, ValueError):
        return 0


def _extract_progress_seconds(raw_value) -> float:
    if not isinstance(raw_value, dict):
        return 0
    return _extract_number(raw_value.get("progress"))


def _extract_text(raw_value) -> str:
    if raw_value is None:
        return ""
    if isinstance(raw_value, str):
        return raw_value
    if isinstance(raw_value, list):
        return "\n".join(filter(None, (_extract_text(item) for item in raw_value)))
    if isinstance(raw_value, dict):
        text = raw_value.get("text")
        if isinstance(text, str) and text.strip():
            return text
        content = raw_value.get("content")
        if isinstance(content, list):
            return "\n".join(filter(None, (_extract_text(item) for item in content)))
    return str(raw_value)


def _extract_user_display_name(raw_value) -> str:
    if not raw_value:
        return ""
    if isinstance(raw_value, dict):
        return raw_value.get("displayName", "") or raw_value.get("emailAddress", "")
    return str(raw_value)


_JIRA_FIELDS = ",".join([
    "summary",
    "project",
    "status",
    "priority",
    "assignee",
    "issuetype",
    "description",
    "created",
    "updated",
    "resolutiondate",
    "duedate",
    "statuscategorychangedate",
    "timeoriginalestimate",
    "aggregateprogress",
    "customfield_10015",
    "customfield_10201",
    "customfield_10934",
    "customfield_10935",
    "customfield_10936",
    "customfield_10937",
    "customfield_10938",
    "customfield_10949",
    "customfield_10950",
    "customfield_10951",
    "customfield_11085",
])


def _parse_issue(issue: dict, base: str) -> dict:
    fields = issue.get("fields", {})
    assignee = fields.get("assignee") or {}
    project = fields.get("project") or {}
    issue_type = fields.get("issuetype") or {}
    priority = fields.get("priority") or {}
    return {
        "jira_key": issue.get("key", ""),
        "jira_url": f"{base}/browse/{issue.get('key', '')}",
        "summary": fields.get("summary", ""),
        "project_key": project.get("key", ""),
        "project_name": project.get("name", ""),
        "cost_center": _extract_first_option_value(fields.get("customfield_10201")),
        "cost_center_responsible": _extract_user_display_name(fields.get("customfield_11085")),
        "category": _extract_option_value(fields.get("customfield_10951")),
        "item_type": issue_type.get("name", ""),
        "gain_type": _extract_option_value(fields.get("customfield_10950")),
        "gain": _extract_option_value(fields.get("customfield_10949")),
        "activity_type": _extract_option_value(fields.get("customfield_10934")),
        "tool": _extract_option_value(fields.get("customfield_10935")),
        "jira_status": (fields.get("status") or {}).get("name", ""),
        "jira_priority": priority.get("name", ""),
        "assignee": assignee.get("displayName", ""),
        "assignee_email": assignee.get("emailAddress", ""),
        "assignee_avatar_url": (assignee.get("avatarUrls") or {}).get("48x48", ""),
        "jira_description": _extract_text(fields.get("description")),
        "start_date": fields.get("customfield_10015"),
        "due_date": fields.get("duedate"),
        "status_updated_at": fields.get("statuscategorychangedate"),
        "resolution_date": fields.get("resolutiondate"),
        "jira_created_at": fields.get("created"),
        "jira_updated_at": fields.get("updated"),
        "time_saved_per_day": _extract_number(fields.get("customfield_10936")),
        "affected_people_count": _extract_number(fields.get("customfield_10937")),
        "execution_days_per_month": _extract_number(fields.get("customfield_10938")),
        "development_estimate_seconds": _extract_number(fields.get("timeoriginalestimate")),
        "time_spent_seconds": _extract_progress_seconds(fields.get("aggregateprogress")),
    }


async def fetch_jira_issues() -> list[dict]:
    """
    Busca issues do projeto configurado no Jira.
    Usa GET /rest/api/3/search/jql com paginação via nextPageToken.
    """
    jql = settings.jira_jql or f"project = {settings.jira_project_key} ORDER BY created DESC"
    base = settings.jira_base_url.rstrip("/")
    url = f"{base}/rest/api/3/search/jql"

    all_issues = []
    next_page_token: str | None = None

    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            params: dict = {
                "jql": jql,
                "maxResults": 100,
                "fields": _JIRA_FIELDS,
            }
            if next_page_token:
                params["nextPageToken"] = next_page_token

            response = await client.get(url, headers=_get_auth_header(), params=params)
            response.raise_for_status()

            data = response.json()
            batch = data.get("issues", [])
            all_issues.extend(_parse_issue(issue, base) for issue in batch)

            if data.get("isLast") or not batch:
                break
            next_page_token = data.get("nextPageToken")
            if not next_page_token:
                break

    return all_issues
