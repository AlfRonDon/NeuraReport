"""
Tests for core modules: Result, errors, events.
"""

import pytest
from backend.v2.core import Result, Ok, Err, DomainError, ValidationError, NotFoundError
from backend.v2.core.result import collect_results


class TestResult:
    """Tests for Result type."""

    def test_ok_is_ok(self):
        result = Ok(42)
        assert result.is_ok()
        assert not result.is_err()

    def test_ok_unwrap(self):
        result = Ok("hello")
        assert result.unwrap() == "hello"

    def test_err_is_err(self):
        result = Err("error")
        assert result.is_err()
        assert not result.is_ok()

    def test_err_unwrap_raises(self):
        result = Err("error")
        with pytest.raises(ValueError):
            result.unwrap()

    def test_ok_map(self):
        result = Ok(5)
        mapped = result.map(lambda x: x * 2)
        assert mapped.unwrap() == 10

    def test_err_map_noop(self):
        result = Err("error")
        mapped = result.map(lambda x: x * 2)
        assert mapped.is_err()
        assert mapped.unwrap_err() == "error"

    def test_ok_and_then(self):
        def double_if_even(x):
            if x % 2 == 0:
                return Ok(x * 2)
            return Err("odd number")

        assert Ok(4).and_then(double_if_even).unwrap() == 8
        assert Ok(3).and_then(double_if_even).is_err()

    def test_err_and_then_noop(self):
        result = Err("original error")
        chained = result.and_then(lambda x: Ok(x * 2))
        assert chained.unwrap_err() == "original error"

    def test_unwrap_or(self):
        assert Ok(5).unwrap_or(0) == 5
        assert Err("error").unwrap_or(0) == 0

    def test_collect_results_all_ok(self):
        results = [Ok(1), Ok(2), Ok(3)]
        collected = collect_results(results)
        assert collected.unwrap() == [1, 2, 3]

    def test_collect_results_with_error(self):
        results = [Ok(1), Err("fail"), Ok(3)]
        collected = collect_results(results)
        assert collected.is_err()
        assert collected.unwrap_err() == "fail"


class TestErrors:
    """Tests for domain errors."""

    def test_validation_error(self):
        error = ValidationError(
            code="invalid_input",
            message="Input is invalid",
            field="email",
        )
        assert error.code == "invalid_input"
        assert error.field == "email"

    def test_not_found_error(self):
        error = NotFoundError(
            code="not_found",
            message="Resource not found",
            resource_type="template",
            resource_id="123",
        )
        assert error.resource_type == "template"
        assert error.resource_id == "123"

    def test_error_to_dict(self):
        error = DomainError(
            code="test_error",
            message="Test message",
            details={"key": "value"},
        )
        d = error.to_dict()
        assert d["code"] == "test_error"
        assert d["message"] == "Test message"
        assert d["details"]["key"] == "value"
