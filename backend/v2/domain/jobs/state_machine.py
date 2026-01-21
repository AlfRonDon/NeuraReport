"""
Job state machine - Valid state transitions for jobs.

Prevents invalid state changes and documents the job lifecycle.
"""

from __future__ import annotations

from .entities import JobStatus, StepStatus


# Valid state transitions for jobs
JOB_TRANSITIONS: dict[JobStatus, set[JobStatus]] = {
    JobStatus.QUEUED: {JobStatus.RUNNING, JobStatus.CANCELLED},
    JobStatus.RUNNING: {JobStatus.SUCCEEDED, JobStatus.FAILED, JobStatus.CANCELLED},
    JobStatus.SUCCEEDED: set(),  # Terminal
    JobStatus.FAILED: set(),  # Terminal
    JobStatus.CANCELLED: set(),  # Terminal
}

# Valid state transitions for steps
STEP_TRANSITIONS: dict[StepStatus, set[StepStatus]] = {
    StepStatus.QUEUED: {StepStatus.RUNNING, StepStatus.SKIPPED},
    StepStatus.RUNNING: {StepStatus.SUCCEEDED, StepStatus.FAILED},
    StepStatus.SUCCEEDED: set(),  # Terminal
    StepStatus.FAILED: set(),  # Terminal
    StepStatus.SKIPPED: set(),  # Terminal
}


def can_transition(current: JobStatus, target: JobStatus) -> bool:
    """Check if a job state transition is valid."""
    return target in JOB_TRANSITIONS.get(current, set())


def can_transition_step(current: StepStatus, target: StepStatus) -> bool:
    """Check if a step state transition is valid."""
    return target in STEP_TRANSITIONS.get(current, set())


class JobStateMachine:
    """
    State machine for job lifecycle management.

    Ensures jobs follow valid state transitions and tracks history.
    """

    def __init__(self, initial_status: JobStatus = JobStatus.QUEUED):
        self._status = initial_status
        self._history: list[tuple[JobStatus, JobStatus]] = []

    @property
    def status(self) -> JobStatus:
        return self._status

    @property
    def is_terminal(self) -> bool:
        return self._status.is_terminal

    @property
    def history(self) -> list[tuple[JobStatus, JobStatus]]:
        return list(self._history)

    def transition(self, target: JobStatus) -> bool:
        """
        Attempt to transition to a new state.

        Returns True if transition was successful, False if invalid.
        """
        if not can_transition(self._status, target):
            return False

        self._history.append((self._status, target))
        self._status = target
        return True

    def start(self) -> bool:
        """Transition from QUEUED to RUNNING."""
        return self.transition(JobStatus.RUNNING)

    def succeed(self) -> bool:
        """Transition from RUNNING to SUCCEEDED."""
        return self.transition(JobStatus.SUCCEEDED)

    def fail(self) -> bool:
        """Transition from RUNNING to FAILED."""
        return self.transition(JobStatus.FAILED)

    def cancel(self) -> bool:
        """Transition to CANCELLED (from QUEUED or RUNNING)."""
        return self.transition(JobStatus.CANCELLED)


class StepStateMachine:
    """State machine for step lifecycle management."""

    def __init__(self, initial_status: StepStatus = StepStatus.QUEUED):
        self._status = initial_status

    @property
    def status(self) -> StepStatus:
        return self._status

    def transition(self, target: StepStatus) -> bool:
        if not can_transition_step(self._status, target):
            return False
        self._status = target
        return True

    def start(self) -> bool:
        return self.transition(StepStatus.RUNNING)

    def succeed(self) -> bool:
        return self.transition(StepStatus.SUCCEEDED)

    def fail(self) -> bool:
        return self.transition(StepStatus.FAILED)

    def skip(self) -> bool:
        return self.transition(StepStatus.SKIPPED)
