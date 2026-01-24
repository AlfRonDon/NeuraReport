"""Workflow API Routes.

REST API endpoints for workflow automation.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from backend.app.schemas.workflows.workflow import (
    ApprovalRequest,
    ConfigureTriggerRequest,
    CreateWorkflowRequest,
    ExecuteWorkflowRequest,
    ExecutionStatus,
    UpdateWorkflowRequest,
    WorkflowExecutionResponse,
    WorkflowListResponse,
    WorkflowResponse,
)
from backend.app.services.workflow.service import workflow_service

router = APIRouter(tags=["workflows"])


@router.post("", response_model=WorkflowResponse)
async def create_workflow(request: CreateWorkflowRequest):
    """Create a new workflow."""
    return await workflow_service.create_workflow(request)


@router.get("", response_model=WorkflowListResponse)
async def list_workflows(
    active_only: bool = Query(False, description="Only return active workflows"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List all workflows."""
    workflows, total = await workflow_service.list_workflows(
        active_only=active_only,
        limit=limit,
        offset=offset,
    )
    return WorkflowListResponse(workflows=workflows, total=total)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(workflow_id: str):
    """Get a workflow by ID."""
    workflow = await workflow_service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(workflow_id: str, request: UpdateWorkflowRequest):
    """Update a workflow."""
    workflow = await workflow_service.update_workflow(workflow_id, request)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """Delete a workflow."""
    deleted = await workflow_service.delete_workflow(workflow_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return {"status": "deleted", "id": workflow_id}


@router.post("/{workflow_id}/execute", response_model=WorkflowExecutionResponse)
async def execute_workflow(workflow_id: str, request: ExecuteWorkflowRequest):
    """Execute a workflow."""
    try:
        return await workflow_service.execute_workflow(
            workflow_id,
            input_data=request.input_data,
            async_execution=request.async_execution,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{workflow_id}/executions", response_model=list[WorkflowExecutionResponse])
async def list_executions(
    workflow_id: str,
    status: Optional[ExecutionStatus] = None,
    limit: int = Query(50, ge=1, le=200),
):
    """List executions for a workflow."""
    return await workflow_service.list_executions(
        workflow_id=workflow_id,
        status=status,
        limit=limit,
    )


@router.get("/executions/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_execution(execution_id: str):
    """Get execution status."""
    execution = await workflow_service.get_execution(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    return execution


@router.post("/executions/{execution_id}/approve")
async def approve_execution(execution_id: str, request: ApprovalRequest):
    """Approve or reject a pending approval."""
    result = await workflow_service.approve_execution(
        execution_id,
        node_id=request.node_id,
        approved=request.approved,
        comment=request.comment,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Pending approval not found")
    return result


@router.get("/approvals/pending")
async def get_pending_approvals(workflow_id: Optional[str] = None):
    """Get all pending approvals."""
    return await workflow_service.get_pending_approvals(workflow_id=workflow_id)


@router.post("/{workflow_id}/trigger", response_model=WorkflowResponse)
async def configure_trigger(workflow_id: str, request: ConfigureTriggerRequest):
    """Configure a workflow trigger."""
    from backend.app.schemas.workflows.workflow import UpdateWorkflowRequest, WorkflowTrigger

    workflow = await workflow_service.get_workflow(workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Add or update trigger
    new_trigger = WorkflowTrigger(type=request.trigger_type, config=request.config)
    triggers = list(workflow.triggers)

    # Replace existing trigger of same type or add new
    found = False
    for i, t in enumerate(triggers):
        if t.type == request.trigger_type:
            triggers[i] = new_trigger
            found = True
            break
    if not found:
        triggers.append(new_trigger)

    update_request = UpdateWorkflowRequest(triggers=triggers)
    return await workflow_service.update_workflow(workflow_id, update_request)
