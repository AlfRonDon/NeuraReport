"""
Pipeline base - Core pipeline execution framework.

A Pipeline is a sequence of Steps that execute in order.
Each step receives a context and can modify it for subsequent steps.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Awaitable, Callable, Generic, TypeVar

from ..core import Result, Ok, Err, DomainError, PipelineError
from ..core.events import Event, EventBus, StepStartedEvent, StepCompletedEvent

logger = logging.getLogger("neura.pipelines")

T = TypeVar("T")


@dataclass
class PipelineContext:
    """
    Shared context passed through pipeline steps.

    Steps can read from and write to the context to share data.
    The context also tracks execution metadata.
    """

    # Execution metadata
    pipeline_id: str = ""
    job_id: str | None = None
    correlation_id: str | None = None
    started_at: datetime | None = None

    # Shared data - steps write results here
    data: dict[str, Any] = field(default_factory=dict)

    # Configuration
    config: dict[str, Any] = field(default_factory=dict)

    # Tracking
    completed_steps: list[str] = field(default_factory=list)
    current_step: str | None = None
    errors: list[DomainError] = field(default_factory=list)

    # Cancellation support
    cancelled: bool = False

    def get(self, key: str, default: Any = None) -> Any:
        """Get a value from the context data."""
        return self.data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        """Set a value in the context data."""
        self.data[key] = value

    def mark_step_complete(self, step_name: str) -> None:
        """Mark a step as completed."""
        if step_name not in self.completed_steps:
            self.completed_steps.append(step_name)

    def add_error(self, error: DomainError) -> None:
        """Record an error."""
        self.errors.append(error)


@dataclass
class StepResult(Generic[T]):
    """Result of executing a single step."""

    success: bool
    value: T | None = None
    error: DomainError | None = None
    duration_ms: float = 0.0

    @classmethod
    def ok(cls, value: T, duration_ms: float = 0.0) -> StepResult[T]:
        return cls(success=True, value=value, duration_ms=duration_ms)

    @classmethod
    def fail(cls, error: DomainError, duration_ms: float = 0.0) -> StepResult[T]:
        return cls(success=False, error=error, duration_ms=duration_ms)


# Step function signatures
StepFn = Callable[[PipelineContext], Awaitable[Result[Any, DomainError]]]
SyncStepFn = Callable[[PipelineContext], Result[Any, DomainError]]
GuardFn = Callable[[PipelineContext], bool]


@dataclass
class Step:
    """
    A single step in a pipeline.

    Steps are async functions that take a context and return a Result.
    They can have guards (conditions for running) and rollback functions.
    """

    name: str
    fn: StepFn | SyncStepFn
    label: str = ""
    guard: GuardFn | None = None  # If returns False, step is skipped
    rollback: StepFn | SyncStepFn | None = None  # Called on pipeline failure
    timeout_seconds: float | None = None
    retries: int = 0
    retry_delay_seconds: float = 1.0

    def __post_init__(self):
        if not self.label:
            self.label = self.name.replace("_", " ").title()

    async def execute(self, ctx: PipelineContext) -> StepResult[Any]:
        """Execute this step with the given context."""
        start_time = datetime.now()

        # Check guard condition
        if self.guard and not self.guard(ctx):
            logger.info(f"Step {self.name} skipped (guard returned False)")
            return StepResult.ok(None)

        # Execute with retries
        last_error: DomainError | None = None
        for attempt in range(self.retries + 1):
            try:
                # Call the step function
                if asyncio.iscoroutinefunction(self.fn):
                    if self.timeout_seconds:
                        result = await asyncio.wait_for(
                            self.fn(ctx),
                            timeout=self.timeout_seconds,
                        )
                    else:
                        result = await self.fn(ctx)
                else:
                    result = self.fn(ctx)

                duration_ms = (datetime.now() - start_time).total_seconds() * 1000

                if isinstance(result, Ok):
                    return StepResult.ok(result.value, duration_ms)
                elif isinstance(result, Err):
                    last_error = result.error
                    if attempt < self.retries:
                        logger.warning(
                            f"Step {self.name} failed (attempt {attempt + 1}), retrying..."
                        )
                        await asyncio.sleep(self.retry_delay_seconds)
                        continue
                    return StepResult.fail(last_error, duration_ms)
                else:
                    # If step returns a non-Result, wrap it as Ok
                    return StepResult.ok(result, duration_ms)

            except asyncio.TimeoutError:
                duration_ms = (datetime.now() - start_time).total_seconds() * 1000
                return StepResult.fail(
                    PipelineError(
                        code="step_timeout",
                        message=f"Step {self.name} timed out after {self.timeout_seconds}s",
                        step=self.name,
                    ),
                    duration_ms,
                )
            except Exception as e:
                duration_ms = (datetime.now() - start_time).total_seconds() * 1000
                last_error = PipelineError(
                    code="step_exception",
                    message=str(e),
                    step=self.name,
                    cause=e,
                )
                if attempt < self.retries:
                    logger.warning(
                        f"Step {self.name} raised exception (attempt {attempt + 1}), retrying..."
                    )
                    await asyncio.sleep(self.retry_delay_seconds)
                    continue
                return StepResult.fail(last_error, duration_ms)

        # Should not reach here, but just in case
        return StepResult.fail(
            last_error or PipelineError(code="unknown", message="Unknown error", step=self.name)
        )


@dataclass
class PipelineResult:
    """Result of executing a complete pipeline."""

    success: bool
    context: PipelineContext
    completed_steps: list[str]
    failed_step: str | None = None
    error: DomainError | None = None
    duration_ms: float = 0.0


class Pipeline:
    """
    A sequence of steps that execute in order.

    Pipelines support:
    - Ordered execution of steps
    - Guard conditions to skip steps
    - Rollback on failure
    - Progress tracking via events
    - Cancellation
    """

    def __init__(
        self,
        name: str,
        steps: list[Step],
        event_bus: EventBus | None = None,
        on_error: StepFn | SyncStepFn | None = None,
        on_success: StepFn | SyncStepFn | None = None,
    ):
        self.name = name
        self.steps = steps
        self.event_bus = event_bus
        self.on_error = on_error
        self.on_success = on_success

    async def execute(self, ctx: PipelineContext) -> PipelineResult:
        """Execute all steps in order."""
        ctx.pipeline_id = self.name
        ctx.started_at = datetime.now()
        start_time = ctx.started_at

        completed_steps: list[str] = []
        failed_step: str | None = None
        final_error: DomainError | None = None

        for step in self.steps:
            # Check cancellation
            if ctx.cancelled:
                logger.info(f"Pipeline {self.name} cancelled before step {step.name}")
                break

            ctx.current_step = step.name

            # Emit step started event
            if self.event_bus:
                await self.event_bus.emit(
                    StepStartedEvent(
                        job_id=ctx.job_id or "",
                        step_name=step.name,
                        correlation_id=ctx.correlation_id,
                    )
                )

            # Execute the step
            result = await step.execute(ctx)

            if result.success:
                completed_steps.append(step.name)
                ctx.mark_step_complete(step.name)

                # Emit step completed event
                if self.event_bus:
                    await self.event_bus.emit(
                        StepCompletedEvent(
                            job_id=ctx.job_id or "",
                            step_name=step.name,
                            correlation_id=ctx.correlation_id,
                        )
                    )
            else:
                failed_step = step.name
                final_error = result.error
                ctx.add_error(final_error)
                logger.error(
                    f"Pipeline {self.name} failed at step {step.name}: {final_error}"
                )
                break

        # Calculate total duration
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000

        # Handle success/failure callbacks
        success = failed_step is None and not ctx.cancelled

        if success and self.on_success:
            try:
                if asyncio.iscoroutinefunction(self.on_success):
                    await self.on_success(ctx)
                else:
                    self.on_success(ctx)
            except Exception as e:
                logger.exception(f"Pipeline on_success handler failed: {e}")

        if not success and self.on_error:
            try:
                if asyncio.iscoroutinefunction(self.on_error):
                    await self.on_error(ctx)
                else:
                    self.on_error(ctx)
            except Exception as e:
                logger.exception(f"Pipeline on_error handler failed: {e}")

        # Rollback completed steps on failure
        if not success:
            await self._rollback(ctx, completed_steps)

        ctx.completed_steps = completed_steps

        return PipelineResult(
            success=success,
            context=ctx,
            completed_steps=completed_steps,
            failed_step=failed_step,
            error=final_error,
            duration_ms=duration_ms,
        )

    async def _rollback(self, ctx: PipelineContext, completed_steps: list[str]) -> None:
        """Execute rollback functions for completed steps in reverse order."""
        for step_name in reversed(completed_steps):
            step = next((s for s in self.steps if s.name == step_name), None)
            if step and step.rollback:
                try:
                    logger.info(f"Rolling back step {step_name}")
                    if asyncio.iscoroutinefunction(step.rollback):
                        await step.rollback(ctx)
                    else:
                        step.rollback(ctx)
                except Exception as e:
                    logger.exception(f"Rollback for step {step_name} failed: {e}")

    def get_step_names(self) -> list[str]:
        """Get names of all steps for progress tracking."""
        return [step.name for step in self.steps]

    def get_step_labels(self) -> list[tuple[str, str]]:
        """Get (name, label) pairs for all steps."""
        return [(step.name, step.label) for step in self.steps]
