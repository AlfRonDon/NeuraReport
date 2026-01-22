from __future__ import annotations

import re
from typing import Dict, List

import bleach
from bleach.css_sanitizer import CSSSanitizer

ALLOWED_TAGS = {
    "html",
    "head",
    "body",
    "meta",
    "title",
    "link",
    "style",
    "div",
    "span",
    "section",
    "article",
    "header",
    "footer",
    "main",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "br",
    "hr",
    "img",
    "canvas",
    "svg",
}

_REPEAT_COMMENT_RE = re.compile(r"^\s*(BEGIN:BLOCK_REPEAT\b.*|END:BLOCK_REPEAT\b.*)\s*$", re.IGNORECASE)

ALLOWED_ATTRS = {
    "*": {
        "class",
        "style",
        "id",
        "colspan",
        "rowspan",
        "align",
        "valign",
        "width",
        "height",
        "data-title",
        "data-index",
        "data-name",
        "data-value",
        "data-label",
    },
    "img": {"src", "alt"},
    "meta": {"charset"},
    "link": {"rel", "href"},
    "svg": {"viewbox", "xmlns"},
    "canvas": {"width", "height"},
}

_CSS_SANITIZER = CSSSanitizer()
_COMMENT_RE = re.compile(r"<!--(.*?)-->", re.DOTALL)


def _bleach_attributes() -> Dict[str, List[str]]:
    attrs: Dict[str, List[str]] = {}
    for tag, allowed in ALLOWED_ATTRS.items():
        attrs[tag] = sorted(allowed)
    return attrs


def _filter_comments(html: str) -> str:
    def _replace(match: re.Match[str]) -> str:
        data = match.group(1)
        if _REPEAT_COMMENT_RE.match(data):
            return f"<!--{data}-->"
        return ""

    return _COMMENT_RE.sub(_replace, html)


def sanitize_html(html: str) -> str:
    cleaned = bleach.clean(
        html or "",
        tags=sorted(ALLOWED_TAGS),
        attributes=_bleach_attributes(),
        protocols=["http", "https", "data"],
        strip=True,
        strip_comments=False,
        css_sanitizer=_CSS_SANITIZER,
    )
    return _filter_comments(cleaned)
