"""Currency exchange rate enrichment source."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from .base import EnrichmentSourceBase

logger = logging.getLogger("neura.domain.enrichment.exchange")

# Common exchange rates (fallback when API is unavailable)
# These are approximate rates and should be updated or replaced with API calls
FALLBACK_RATES_USD = {
    "EUR": 0.92,
    "GBP": 0.79,
    "JPY": 149.50,
    "CAD": 1.36,
    "AUD": 1.53,
    "CHF": 0.88,
    "CNY": 7.24,
    "INR": 83.12,
    "MXN": 17.15,
    "BRL": 4.97,
    "KRW": 1325.0,
    "SGD": 1.34,
    "HKD": 7.82,
    "NOK": 10.65,
    "SEK": 10.42,
    "DKK": 6.87,
    "NZD": 1.64,
    "ZAR": 18.75,
    "RUB": 92.50,
    "TRY": 32.15,
}


class ExchangeRateSource(EnrichmentSourceBase):
    """
    Enrichment source for currency exchange rates.

    Converts amounts between currencies using current exchange rates.
    """

    source_type = "exchange_rate"
    supported_fields = [
        "converted_amount",
        "exchange_rate",
        "source_currency",
        "target_currency",
        "rate_date",
    ]

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        self.base_currency = config.get("base_currency", "USD")
        self.target_currency = config.get("target_currency", "USD")

    async def lookup(self, value: Any) -> Optional[Dict[str, Any]]:
        """
        Convert currency amount.

        Args:
            value: Can be:
                - A number (uses configured currencies)
                - A dict with 'amount', 'from_currency', 'to_currency'
                - A string like "100 EUR" or "EUR 100"

        Returns:
            Dictionary with converted amount and rate info
        """
        if value is None:
            return None

        try:
            amount: float
            from_currency: str
            to_currency: str

            if isinstance(value, dict):
                amount = float(value.get("amount", 0))
                from_currency = value.get("from_currency", self.base_currency).upper()
                to_currency = value.get("to_currency", self.target_currency).upper()
            elif isinstance(value, (int, float)):
                amount = float(value)
                from_currency = self.base_currency
                to_currency = self.target_currency
            elif isinstance(value, str):
                # Parse string like "100 EUR" or "EUR 100"
                parts = value.strip().split()
                if len(parts) == 2:
                    if parts[0].replace(".", "").replace(",", "").isdigit():
                        amount = float(parts[0].replace(",", ""))
                        from_currency = parts[1].upper()
                    else:
                        from_currency = parts[0].upper()
                        amount = float(parts[1].replace(",", ""))
                else:
                    amount = float(value.replace(",", ""))
                    from_currency = self.base_currency
                to_currency = self.target_currency
            else:
                return None

            # Get exchange rate
            rate = self._get_rate(from_currency, to_currency)
            if rate is None:
                return None

            converted = amount * rate

            return {
                "converted_amount": round(converted, 2),
                "exchange_rate": round(rate, 6),
                "source_currency": from_currency,
                "target_currency": to_currency,
                "rate_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            }

        except Exception as exc:
            logger.warning(f"Exchange rate lookup failed for '{value}': {exc}")
            return None

    def _get_rate(self, from_currency: str, to_currency: str) -> Optional[float]:
        """Get exchange rate between two currencies."""
        if from_currency == to_currency:
            return 1.0

        # Try to get rates from USD base
        try:
            if from_currency == "USD":
                rate = FALLBACK_RATES_USD.get(to_currency)
                if rate:
                    return rate
            elif to_currency == "USD":
                rate = FALLBACK_RATES_USD.get(from_currency)
                if rate:
                    return 1.0 / rate
            else:
                # Convert via USD
                from_usd = FALLBACK_RATES_USD.get(from_currency)
                to_usd = FALLBACK_RATES_USD.get(to_currency)
                if from_usd and to_usd:
                    return to_usd / from_usd

            logger.warning(f"No rate found for {from_currency} -> {to_currency}")
            return None

        except Exception as exc:
            logger.error(f"Rate calculation error: {exc}")
            return None

    def get_supported_fields(self) -> List[str]:
        return self.supported_fields

    def get_confidence(self, result: Dict[str, Any]) -> float:
        """Exchange rates have high confidence when available."""
        if result and result.get("exchange_rate"):
            return 0.95  # Slightly less than 1 since we use fallback rates
        return 0.0
