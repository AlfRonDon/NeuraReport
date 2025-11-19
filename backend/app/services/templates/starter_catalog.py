from __future__ import annotations

from typing import Any, Dict, List


"""
Static starter template catalog used to seed the unified template list and
power the template recommender.

These entries are intentionally small and generic so they work across
projects while remaining realistic.
"""

StarterTemplate = Dict[str, Any]


STARTER_TEMPLATES: List[StarterTemplate] = [
    {
        "id": "starter_monthly_sales_performance",
        "name": "Monthly Sales Performance Summary",
        "kind": "pdf",
        "domain": "Finance",
        "tags": ["sales", "monthly", "revenue", "margin", "kpi"],
        "useCases": [
            "Share monthly sales KPIs with leadership",
            "Track revenue and margin by product line and region",
        ],
        "primaryMetrics": [
            "Total revenue",
            "Gross margin %",
            "Revenue by product line",
            "Top customers by revenue",
        ],
        "description": (
            "Board-ready monthly sales summary with revenue, volume, and margin "
            "breakdowns by product line and region."
        ),
    },
    {
        "id": "starter_ops_throughput_quality",
        "name": "Operational Throughput & Quality Dashboard",
        "kind": "pdf",
        "domain": "Operations",
        "tags": ["operations", "throughput", "quality", "downtime"],
        "useCases": [
            "Monitor daily or weekly production performance",
            "Identify bottlenecks and recurring downtime causes",
        ],
        "primaryMetrics": [
            "Units produced",
            "Overall equipment effectiveness (OEE)",
            "First pass yield",
            "Unplanned downtime (minutes)",
        ],
        "description": (
            "Operations dashboard summarising throughput, quality, and downtime "
            "with trend charts and top root-cause categories."
        ),
    },
    {
        "id": "starter_marketing_campaign_roas",
        "name": "Campaign Performance & ROAS",
        "kind": "pdf",
        "domain": "Marketing",
        "tags": ["marketing", "campaign", "roas", "acquisition"],
        "useCases": [
            "Compare acquisition campaigns across channels",
            "Report ROAS and conversion performance to stakeholders",
        ],
        "primaryMetrics": [
            "Spend by channel",
            "Impressions and clicks",
            "Conversions and CPA",
            "Revenue and ROAS",
        ],
        "description": (
            "Channel-level campaign report highlighting spend, conversions, "
            "and return on ad spend (ROAS) across key marketing channels."
        ),
    },
    {
        "id": "starter_finance_cashflow_projection",
        "name": "Cashflow Projection & Variance",
        "kind": "excel",
        "domain": "Finance",
        "tags": ["cashflow", "forecast", "variance", "finance"],
        "useCases": [
            "Review monthly cash-in and cash-out projections",
            "Compare actual vs forecast cash positions",
        ],
        "primaryMetrics": [
            "Opening and closing cash balance",
            "Cash-in vs cash-out by category",
            "Forecast vs actual variance %",
        ],
        "description": (
            "Tabular cashflow projection with monthly actuals, forecasts, and "
            "variance analysis for finance teams."
        ),
    },
]

