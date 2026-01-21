"""
Worker pool - Manages concurrent job execution.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Optional

logger = logging.getLogger("neura.orchestration.worker")


@dataclass
class WorkItem:
    """A unit of work to be processed."""

    id: str
    fn: Callable[[], Awaitable[Any]]
    priority: int = 0  # Lower = higher priority


class WorkerPool:
    """
    A pool of async workers that process jobs.

    Features:
    - Configurable concurrency
    - Priority queue
    - Graceful shutdown
    """

    def __init__(
        self,
        max_workers: int = 4,
        queue_size: int = 100,
    ):
        self._max_workers = max_workers
        self._queue: asyncio.PriorityQueue = asyncio.PriorityQueue(maxsize=queue_size)
        self._workers: list[asyncio.Task] = []
        self._running = False
        self._shutdown_event = asyncio.Event()

    async def start(self) -> None:
        """Start the worker pool."""
        if self._running:
            return

        self._running = True
        self._shutdown_event.clear()

        for i in range(self._max_workers):
            worker = asyncio.create_task(
                self._worker_loop(i),
                name=f"worker-{i}",
            )
            self._workers.append(worker)

        logger.info(f"Worker pool started with {self._max_workers} workers")

    async def stop(self, timeout: float = 30.0) -> None:
        """Stop the worker pool gracefully."""
        if not self._running:
            return

        self._running = False
        self._shutdown_event.set()

        # Cancel all workers
        for worker in self._workers:
            worker.cancel()

        # Wait for workers to finish
        if self._workers:
            done, pending = await asyncio.wait(
                self._workers,
                timeout=timeout,
                return_when=asyncio.ALL_COMPLETED,
            )

            for task in pending:
                task.cancel()

        self._workers.clear()
        logger.info("Worker pool stopped")

    async def submit(
        self,
        id: str,
        fn: Callable[[], Awaitable[Any]],
        priority: int = 0,
    ) -> None:
        """Submit a work item to the pool."""
        if not self._running:
            raise RuntimeError("Worker pool is not running")

        item = WorkItem(id=id, fn=fn, priority=priority)
        await self._queue.put((priority, item))
        logger.debug(f"Submitted work item {id} with priority {priority}")

    async def _worker_loop(self, worker_id: int) -> None:
        """Main worker loop."""
        logger.debug(f"Worker {worker_id} started")

        while self._running:
            try:
                # Wait for work with timeout
                try:
                    _, item = await asyncio.wait_for(
                        self._queue.get(),
                        timeout=1.0,
                    )
                except asyncio.TimeoutError:
                    continue

                # Process the work item
                try:
                    logger.debug(f"Worker {worker_id} processing {item.id}")
                    await item.fn()
                    logger.debug(f"Worker {worker_id} completed {item.id}")
                except Exception as e:
                    logger.exception(f"Worker {worker_id} failed on {item.id}: {e}")
                finally:
                    self._queue.task_done()

            except asyncio.CancelledError:
                break

        logger.debug(f"Worker {worker_id} stopped")

    @property
    def pending_count(self) -> int:
        """Number of items waiting in the queue."""
        return self._queue.qsize()

    @property
    def is_running(self) -> bool:
        """Whether the pool is running."""
        return self._running
