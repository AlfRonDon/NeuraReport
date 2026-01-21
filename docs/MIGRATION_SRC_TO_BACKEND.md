# Migration Guide: src/ to backend/

This document describes the ongoing migration from the legacy `src/` directory to the new `backend/` architecture.

## Overview

The codebase is transitioning from a flat `src/` structure to a domain-driven `backend/` architecture. This migration improves:

- Code organization with clear boundaries
- Testability through dependency injection
- Maintainability via adapter patterns
- Scalability for new features

## Current State

### Directory Coexistence

Both directories currently coexist:

```
NeuraReport/
├── src/                    # Legacy code (to be migrated)
│   ├── endpoints/          # API route handlers
│   ├── services/           # Business logic
│   ├── schemas/            # Pydantic models
│   └── utils/              # Helper utilities
│
├── backend/                # New architecture
│   ├── adapters/           # External integrations
│   │   ├── databases/      # SQLite, future DB adapters
│   │   ├── llm/            # OpenAI, future LLM adapters
│   │   ├── rendering/      # PDF, DOCX, HTML renderers
│   │   └── extraction/     # PDF, Excel extractors
│   │
│   ├── app/                # Application core
│   │   ├── api/            # FastAPI routes
│   │   ├── config/         # Configuration
│   │   ├── core/           # Core utilities
│   │   ├── domain/         # Business logic domains
│   │   │   ├── enrichment/ # Data enrichment
│   │   │   ├── federation/ # Multi-source queries
│   │   │   └── reports/    # Report generation
│   │   ├── features/       # Feature modules
│   │   └── services/       # Service layer
│   │
│   ├── domain/             # Domain models
│   ├── pipelines/          # Data processing pipelines
│   └── tests/              # Test suite
```

### Cross-Directory Imports

The following `backend/` files still import from `src/`:

| Backend File | src/ Import | Migration Status |
|--------------|-------------|------------------|
| `backend/api.py` | Multiple src imports | Entry point - keep until full migration |
| `backend/app/api/routes/*.py` | `src.services.*`, `src.endpoints.*` | Gradual migration |
| `backend/app/services/jobs/report_scheduler.py` | `src.services.report_service` | Active use |
| `backend/app/domain/*/service.py` | Various | Domain integration |

## Migration Strategy

### Phase 1: Adapter Layer (Completed)

- [x] SQLite database adapter with connection pooling
- [x] OpenAI LLM adapter with API key validation
- [x] PDF/Excel extraction adapters
- [x] Rendering adapters (HTML, PDF, DOCX, XLSX)

### Phase 2: Core Services (In Progress)

1. **Report Service** - `src/services/report_service.py`
   - Target: `backend/app/services/reports/`
   - Dependencies: Template, mapping, scheduler services

2. **Template Service** - `src/services/template_service.py`
   - Target: `backend/app/services/templates/`
   - Dependencies: File service, LLM service

3. **Connection Service** - `src/services/connection_service.py`
   - Target: `backend/app/services/connections/`
   - Dependencies: SQLite adapter

### Phase 3: API Routes (Planned)

Migrate endpoint handlers:
- `src/endpoints/reports.py` → `backend/app/api/routes/reports.py`
- `src/endpoints/templates.py` → `backend/app/api/routes/templates.py`
- `src/endpoints/connections.py` → `backend/app/api/routes/connections.py`

### Phase 4: Utilities (Final)

Move remaining utilities:
- `src/utils/` → `backend/app/core/` or domain-specific locations

## Migration Checklist

For each module being migrated:

1. **Create Interface**
   - Define abstract base class in `backend/adapters/` or `backend/domain/`
   - Document expected behavior and contracts

2. **Implement Adapter/Service**
   - Create concrete implementation in `backend/`
   - Add proper logging and error handling
   - Include type hints

3. **Write Tests**
   - Create test file in `backend/tests/`
   - Cover happy path, edge cases, and error conditions

4. **Update Imports**
   - Find all files importing the old module
   - Update to new import path
   - Test that existing functionality works

5. **Remove Legacy Code**
   - Delete old file from `src/`
   - Remove from any `__init__.py` exports

## Code Examples

### Before (src/ style):

```python
# src/services/my_service.py
import os
from src.utils.helpers import do_something

def process_data(data):
    # Direct external calls
    api_key = os.getenv("API_KEY")
    response = requests.post(url, data=data)
    return response.json()
```

### After (backend/ style):

```python
# backend/adapters/external/base.py
from abc import ABC, abstractmethod

class ExternalClient(ABC):
    @abstractmethod
    async def send(self, data: dict) -> dict:
        pass

# backend/adapters/external/http.py
from .base import ExternalClient

class HttpClient(ExternalClient):
    def __init__(self, api_key: str):
        self._api_key = api_key

    async def send(self, data: dict) -> dict:
        # Implementation with proper error handling
        pass

# backend/app/services/data_service.py
from backend.adapters.external import ExternalClient

class DataService:
    def __init__(self, client: ExternalClient):
        self._client = client

    async def process(self, data: dict) -> dict:
        return await self._client.send(data)
```

## Key Principles

1. **Dependency Injection** - Services receive dependencies, don't create them
2. **Interface Segregation** - Small, focused interfaces
3. **Single Responsibility** - Each module does one thing well
4. **Explicit Configuration** - No hidden environment variable reads
5. **Proper Logging** - Structured logging for all operations

## Testing During Migration

Run tests frequently:

```bash
# Run all backend tests
pytest backend/tests/ -v

# Run specific test file
pytest backend/tests/test_adapters.py -v

# Run with coverage
pytest backend/tests/ --cov=backend --cov-report=html
```

## Questions?

If you encounter issues during migration:

1. Check if the functionality already exists in `backend/`
2. Look for similar patterns in existing `backend/` code
3. Create an issue with the `migration` label

---

*Last updated: January 2026*
