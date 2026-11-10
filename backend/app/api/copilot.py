from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.copilot import CopilotQueryRequest, CopilotQueryResponse
from app.services.copilot_tools import execute_copilot_assistant

router = APIRouter(prefix="/assistant", tags=["AI Operations Copilot"])

@router.post("/chat", response_model=CopilotQueryResponse)
def chat_with_copilot(req: CopilotQueryRequest, db: Session = Depends(get_db)):
    """Controlled, tool-calling operational copilot querying live database records."""
    result = execute_copilot_assistant(db=db, query=req.query, context_id=req.context_incident_id)
    return CopilotQueryResponse(**result)

