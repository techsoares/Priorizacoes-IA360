import httpx
from base64 import b64encode

from app.config import settings


def _get_auth_header() -> dict:
    """Gera o header Basic Auth para a API do Jira Cloud."""
    credentials = f"{settings.jira_email}:{settings.jira_api_token}"
    encoded = b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded}", "Content-Type": "application/json"}


async def fetch_jira_issues() -> list[dict]:
    """
    Busca issues do projeto configurado no Jira.
    Usa POST /rest/api/3/search/jql (novo endpoint Atlassian).
    """
    jql = settings.jira_jql or f"project = {settings.jira_project_key} ORDER BY created DESC"
    url = f"{settings.jira_base_url}/rest/api/3/search/jql"

    payload = {
        "jql": jql,
        "maxResults": 100,
        "fields": ["summary", "status", "assignee", "components"],
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=_get_auth_header(), json=payload)
        response.raise_for_status()

    data = response.json()
    issues = []

    for issue in data.get("issues", []):
        fields = issue.get("fields", {})
        assignee = fields.get("assignee") or {}
        components = fields.get("components") or []
        cost_center = components[0]["name"] if components else ""
        issues.append({
            "jira_key": issue["key"],
            "summary": fields.get("summary", ""),
            "jira_status": fields.get("status", {}).get("name", ""),
            "assignee": assignee.get("displayName", ""),
            "cost_center": cost_center,
        })

    return issues
