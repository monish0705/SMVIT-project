from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_roles
from app.models.user import User
from app.models.work_order import WorkOrder
from app.schemas.incident import WorkOrderDetail

router = APIRouter(prefix="/work-orders", tags=["Work Orders"])

class UpdateWorkOrderRequest(BaseModel):
    status: Optional[str] = None
    checklist: Optional[List[Dict[str, Any]]] = None
    repair_notes: Optional[str] = None
    inspection_notes: Optional[str] = None

@router.get("", response_model=List[WorkOrderDetail])
def list_work_orders(
    status_filter: Optional[str] = None,
    team: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all maintenance work orders."""
    query = db.query(WorkOrder)
    if status_filter:
        query = query.filter(WorkOrder.status == status_filter)
    if team:
        query = query.filter(WorkOrder.assigned_team == team)
        
    orders = query.order_by(WorkOrder.created_at.desc()).all()
    return [{
        "id": o.id,
        "work_order_number": o.work_order_number,
        "title": o.title,
        "assigned_team": o.assigned_team,
        "assigned_inspector": o.assigned_inspector,
        "status": o.status,
        "checklist": o.checklist or [],
        "inspection_notes": o.inspection_notes,
        "repair_notes": o.repair_notes,
        "due_date": o.due_date,
        "created_at": o.created_at,
        "updated_at": o.updated_at
    } for o in orders]

@router.patch("/{order_id}", response_model=WorkOrderDetail)
def update_work_order(
    order_id: str,
    update_data: UpdateWorkOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["operator", "field_inspector", "admin"]))
):
    """Update work order status, inspection checklist, or repair notes."""
    wo = db.query(WorkOrder).filter(WorkOrder.id == order_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found.")

    if update_data.status:
        wo.status = update_data.status
    if update_data.checklist is not None:
        wo.checklist = update_data.checklist
    if update_data.repair_notes:
        wo.repair_notes = update_data.repair_notes
    if update_data.inspection_notes:
        wo.inspection_notes = update_data.inspection_notes

    db.commit()
    db.refresh(wo)
    return {
        "id": wo.id,
        "work_order_number": wo.work_order_number,
        "title": wo.title,
        "assigned_team": wo.assigned_team,
        "assigned_inspector": wo.assigned_inspector,
        "status": wo.status,
        "checklist": wo.checklist or [],
        "inspection_notes": wo.inspection_notes,
        "repair_notes": wo.repair_notes,
        "due_date": wo.due_date,
        "created_at": wo.created_at,
        "updated_at": wo.updated_at
    }

