"""
Tests for pipeline framework.
"""

import pytest
import asyncio
from backend.v2.core import Ok, Err, DomainError
from backend.v2.pipelines.base import Pipeline, Step, PipelineContext


class TestPipeline:
    """Tests for Pipeline execution."""

    @pytest.mark.asyncio
    async def test_simple_pipeline(self):
        """Test a pipeline with successful steps."""

        async def step1(ctx: PipelineContext):
            ctx.set("value", 1)
            return Ok("step1 done")

        async def step2(ctx: PipelineContext):
            value = ctx.get("value", 0)
            ctx.set("value", value + 1)
            return Ok("step2 done")

        pipeline = Pipeline(
            name="test",
            steps=[
                Step(name="step1", fn=step1),
                Step(name="step2", fn=step2),
            ],
        )

        ctx = PipelineContext()
        result = await pipeline.execute(ctx)

        assert result.success
        assert ctx.get("value") == 2
        assert "step1" in result.completed_steps
        assert "step2" in result.completed_steps

    @pytest.mark.asyncio
    async def test_pipeline_with_failure(self):
        """Test a pipeline where a step fails."""

        async def step1(ctx: PipelineContext):
            return Ok("ok")

        async def step2(ctx: PipelineContext):
            return Err(DomainError(code="fail", message="Step 2 failed"))

        async def step3(ctx: PipelineContext):
            # Should not be called
            ctx.set("step3_called", True)
            return Ok("ok")

        pipeline = Pipeline(
            name="test",
            steps=[
                Step(name="step1", fn=step1),
                Step(name="step2", fn=step2),
                Step(name="step3", fn=step3),
            ],
        )

        ctx = PipelineContext()
        result = await pipeline.execute(ctx)

        assert not result.success
        assert result.failed_step == "step2"
        assert ctx.get("step3_called") is None

    @pytest.mark.asyncio
    async def test_pipeline_with_guard(self):
        """Test that guards can skip steps."""

        async def conditional_step(ctx: PipelineContext):
            ctx.set("conditional_ran", True)
            return Ok("ok")

        pipeline = Pipeline(
            name="test",
            steps=[
                Step(
                    name="conditional",
                    fn=conditional_step,
                    guard=lambda ctx: ctx.get("run_conditional", False),
                ),
            ],
        )

        # Without flag - should skip
        ctx1 = PipelineContext()
        result1 = await pipeline.execute(ctx1)
        assert result1.success
        assert ctx1.get("conditional_ran") is None

        # With flag - should run
        ctx2 = PipelineContext(data={"run_conditional": True})
        result2 = await pipeline.execute(ctx2)
        assert result2.success
        assert ctx2.get("conditional_ran") is True

    @pytest.mark.asyncio
    async def test_pipeline_cancellation(self):
        """Test that cancellation stops the pipeline."""

        async def slow_step(ctx: PipelineContext):
            await asyncio.sleep(10)  # Long wait
            return Ok("done")

        pipeline = Pipeline(
            name="test",
            steps=[Step(name="slow", fn=slow_step)],
        )

        ctx = PipelineContext()
        ctx.cancelled = True

        result = await pipeline.execute(ctx)
        assert not result.success

    @pytest.mark.asyncio
    async def test_step_with_retry(self):
        """Test that steps can retry on failure."""
        call_count = {"value": 0}

        async def flaky_step(ctx: PipelineContext):
            call_count["value"] += 1
            if call_count["value"] < 3:
                return Err(DomainError(code="flaky", message="Try again"))
            return Ok("finally worked")

        step = Step(
            name="flaky",
            fn=flaky_step,
            retries=3,
            retry_delay_seconds=0.01,
        )

        ctx = PipelineContext()
        result = await step.execute(ctx)

        assert result.success
        assert call_count["value"] == 3


class TestPipelineContext:
    """Tests for PipelineContext."""

    def test_get_set(self):
        ctx = PipelineContext()
        ctx.set("key", "value")
        assert ctx.get("key") == "value"
        assert ctx.get("missing", "default") == "default"

    def test_mark_step_complete(self):
        ctx = PipelineContext()
        ctx.mark_step_complete("step1")
        ctx.mark_step_complete("step2")
        ctx.mark_step_complete("step1")  # Duplicate should be ignored

        assert ctx.completed_steps == ["step1", "step2"]

    def test_add_error(self):
        ctx = PipelineContext()
        error = DomainError(code="test", message="Test error")
        ctx.add_error(error)

        assert len(ctx.errors) == 1
        assert ctx.errors[0].code == "test"
