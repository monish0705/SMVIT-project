from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class CopilotQueryRequest(BaseModel):
    query: str
    context_incident_id: Optional[str] = None

class CopilotToolResult(BaseModel):
    tool_name: str
    parameters: Dict[str, Any]
    output_summary: str
    data: Any

class CopilotQueryResponse(BaseModel):
    query: str
    answer: str
    tools_executed: List[CopilotToolResult] = []
    referenced_incidents: List[str] = []
    suggested_actions: List[str] = []

