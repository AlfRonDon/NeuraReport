"""
Result type for explicit error handling.

Inspired by Rust's Result<T, E> and functional programming patterns.
Forces callers to handle both success and failure cases explicitly.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Generic, TypeVar, Union, overload

T = TypeVar("T")
E = TypeVar("E")
U = TypeVar("U")


@dataclass(frozen=True, slots=True)
class Ok(Generic[T]):
    """Success case containing a value."""

    value: T

    def is_ok(self) -> bool:
        return True

    def is_err(self) -> bool:
        return False

    def unwrap(self) -> T:
        """Get the value. Safe to call on Ok."""
        return self.value

    def unwrap_or(self, default: T) -> T:
        """Get the value or return default."""
        return self.value

    def unwrap_err(self) -> None:
        """Raises ValueError since this is Ok."""
        raise ValueError("Called unwrap_err on Ok value")

    def map(self, fn: Callable[[T], U]) -> Ok[U]:
        """Transform the success value."""
        return Ok(fn(self.value))

    def map_err(self, fn: Callable[[E], U]) -> Ok[T]:
        """No-op for Ok values."""
        return self

    def and_then(self, fn: Callable[[T], Result[U, E]]) -> Result[U, E]:
        """Chain operations that might fail."""
        return fn(self.value)

    def or_else(self, fn: Callable[[E], Result[T, U]]) -> Ok[T]:
        """No-op for Ok values."""
        return self


@dataclass(frozen=True, slots=True)
class Err(Generic[E]):
    """Failure case containing an error."""

    error: E

    def is_ok(self) -> bool:
        return False

    def is_err(self) -> bool:
        return True

    def unwrap(self) -> None:
        """Raises ValueError with the error."""
        raise ValueError(f"Called unwrap on Err: {self.error}")

    def unwrap_or(self, default: T) -> T:
        """Return the default since this is Err."""
        return default

    def unwrap_err(self) -> E:
        """Get the error. Safe to call on Err."""
        return self.error

    def map(self, fn: Callable[[T], U]) -> Err[E]:
        """No-op for Err values."""
        return self

    def map_err(self, fn: Callable[[E], U]) -> Err[U]:
        """Transform the error value."""
        return Err(fn(self.error))

    def and_then(self, fn: Callable[[T], Result[U, E]]) -> Err[E]:
        """No-op for Err values."""
        return self

    def or_else(self, fn: Callable[[E], Result[T, U]]) -> Result[T, U]:
        """Try an alternative when we have an error."""
        return fn(self.error)


Result = Union[Ok[T], Err[E]]


def result_from_exception(fn: Callable[[], T]) -> Result[T, Exception]:
    """Convert a function that might raise into a Result."""
    try:
        return Ok(fn())
    except Exception as e:
        return Err(e)


def collect_results(results: list[Result[T, E]]) -> Result[list[T], E]:
    """Collect a list of Results into a Result of list. Short-circuits on first error."""
    values: list[T] = []
    for result in results:
        if isinstance(result, Err):
            return result
        values.append(result.value)
    return Ok(values)
