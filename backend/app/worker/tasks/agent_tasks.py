"""Agent execution tasks - durable via Dramatiq + Redis."""
import dramatiq
import logging

logger = logging.getLogger("neura.worker.agents")

@dramatiq.actor(
    queue_name="agents",
    max_retries=3,
    min_backoff=5000,
    max_backoff=120000,
    time_limit=300_000,  # 5 min
    store_results=True,
)
def run_agent(task_id: str, agent_type: str, params: dict):
    """Execute an agent task. Survives worker crashes."""
    from backend.app.services.agents import agent_service_v2

    try:
        agent_service_v2.execute_task_sync(task_id, agent_type, params)
        logger.info("agent_task_completed", extra={"event": "agent_task_completed", "task_id": task_id})
    except Exception as exc:
        logger.exception("agent_task_failed", extra={"event": "agent_task_failed", "task_id": task_id})
        raise
