"""
Tests for domain entities.
"""

import pytest
from backend.v2.domain.contracts import (
    Contract,
    Token,
    Mapping,
    TokenType,
    MappingSource,
    ContractBuilder,
    validate_contract,
)
from backend.v2.domain.reports import (
    Report,
    ReportConfig,
    Batch,
    RenderOutput,
    OutputFormat,
    render_html_with_tokens,
)
from backend.v2.domain.jobs import (
    Job,
    JobStep,
    JobStatus,
    StepStatus,
    JobStateMachine,
)


class TestContract:
    """Tests for Contract entities."""

    def test_create_token(self):
        token = Token(
            name="customer_name",
            token_type=TokenType.SCALAR,
            description="Customer name",
        )
        assert token.name == "customer_name"
        assert token.token_type == TokenType.SCALAR

    def test_create_mapping(self):
        mapping = Mapping(
            token_name="total",
            source=MappingSource.QUERY,
            query="SELECT SUM(amount) FROM orders",
            column="sum",
        )
        assert mapping.source == MappingSource.QUERY
        assert mapping.query is not None

    def test_contract_unmapped_tokens(self):
        contract = Contract(
            template_id="test",
            tokens=(
                Token(name="a", token_type=TokenType.SCALAR),
                Token(name="b", token_type=TokenType.SCALAR),
            ),
            mappings=(
                Mapping(token_name="a", source=MappingSource.STATIC, static_value="A"),
            ),
        )
        assert contract.unmapped_tokens == frozenset({"b"})

    def test_contract_serialization(self):
        contract = Contract(
            template_id="test",
            tokens=(Token(name="x", token_type=TokenType.SCALAR),),
            mappings=(
                Mapping(token_name="x", source=MappingSource.QUERY, query="SELECT 1"),
            ),
        )
        d = contract.to_dict()
        restored = Contract.from_dict(d)
        assert restored.template_id == "test"
        assert len(restored.tokens) == 1


class TestContractBuilder:
    """Tests for ContractBuilder."""

    def test_build_contract(self):
        builder = ContractBuilder("test_template")
        builder.add_token("name", TokenType.SCALAR)
        builder.add_token("items", TokenType.TABLE)
        builder.add_mapping("name", query="SELECT name FROM users")

        contract = builder.build()
        assert contract.template_id == "test_template"
        assert len(contract.tokens) == 2
        assert len(contract.mappings) == 1

    def test_extract_tokens_from_html(self):
        html = "<p>Hello {{name}}, you have {{count}} items.</p>"
        builder = ContractBuilder("test")
        builder.add_tokens_from_html(html)
        contract = builder.build()

        assert "name" in contract.token_names
        assert "count" in contract.token_names


class TestContractValidation:
    """Tests for contract validation."""

    def test_valid_contract(self):
        contract = Contract(
            template_id="test",
            tokens=(Token(name="x", token_type=TokenType.SCALAR),),
            mappings=(
                Mapping(token_name="x", source=MappingSource.STATIC, static_value="val"),
            ),
        )
        result = validate_contract(contract)
        assert result.valid

    def test_unmapped_required_token(self):
        contract = Contract(
            template_id="test",
            tokens=(Token(name="x", token_type=TokenType.SCALAR, required=True),),
            mappings=(),
        )
        result = validate_contract(contract)
        assert not result.valid
        assert any(e.code == "unmapped_required_token" for e in result.errors)


class TestTokenEngine:
    """Tests for token rendering."""

    def test_render_scalar_tokens(self):
        html = "<p>Hello {{name}}!</p>"
        result = render_html_with_tokens(html, values={"name": "World"})
        assert result == "<p>Hello World!</p>"

    def test_render_escapes_html(self):
        html = "<p>{{content}}</p>"
        result = render_html_with_tokens(html, values={"content": "<script>alert(1)</script>"})
        assert "<script>" not in result
        assert "&lt;script&gt;" in result

    def test_render_missing_token(self):
        html = "<p>{{missing}}</p>"
        result = render_html_with_tokens(html, values={})
        assert result == "<p></p>"


class TestJobStateMachine:
    """Tests for job state transitions."""

    def test_valid_transitions(self):
        sm = JobStateMachine(JobStatus.QUEUED)
        assert sm.start()
        assert sm.status == JobStatus.RUNNING
        assert sm.succeed()
        assert sm.status == JobStatus.SUCCEEDED

    def test_invalid_transition(self):
        sm = JobStateMachine(JobStatus.QUEUED)
        # Can't go directly to SUCCEEDED from QUEUED
        assert not sm.succeed()
        assert sm.status == JobStatus.QUEUED

    def test_terminal_state(self):
        sm = JobStateMachine(JobStatus.SUCCEEDED)
        assert sm.is_terminal
        # Can't transition from terminal state
        assert not sm.start()


class TestReportConfig:
    """Tests for ReportConfig."""

    def test_create_config(self):
        config = ReportConfig(
            template_id="test",
            connection_id="conn-1",
            output_formats=(OutputFormat.PDF, OutputFormat.DOCX),
        )
        assert config.template_id == "test"
        assert OutputFormat.PDF in config.output_formats

    def test_with_formats(self):
        config = ReportConfig(template_id="test")
        new_config = config.with_formats(OutputFormat.DOCX)
        assert OutputFormat.DOCX in new_config.output_formats
        assert OutputFormat.PDF not in new_config.output_formats
