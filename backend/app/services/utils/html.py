from __future__ import annotations

import re
from html import escape
from html.parser import HTMLParser
from typing import Iterable

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

SELF_CLOSING = {"br", "hr", "img", "meta", "link", "col"}

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


def _allowed_attrs(tag: str) -> set[str]:
    attrs: set[str] = set(ALLOWED_ATTRS.get("*", set()))
    attrs.update(ALLOWED_ATTRS.get(tag, set()))
    return attrs


class _Sanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._output: list[str] = []

    def handle_starttag(self, tag: str, attrs: Iterable[tuple[str, str | None]]) -> None:
        if tag.lower() not in ALLOWED_TAGS:
            return
        allowed = _allowed_attrs(tag.lower())
        clean_attrs = []
        for name, value in attrs:
            if name.lower() in allowed and value is not None:
                clean_attrs.append(f'{name}="{escape(value, quote=True)}"')
        attr_str = (" " + " ".join(clean_attrs)) if clean_attrs else ""
        if tag.lower() in SELF_CLOSING:
            self._output.append(f"<{tag}{attr_str} />")
        else:
            self._output.append(f"<{tag}{attr_str}>")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() not in ALLOWED_TAGS or tag.lower() in SELF_CLOSING:
            return
        self._output.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        self._output.append(data)

    def handle_entityref(self, name: str) -> None:
        self._output.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        self._output.append(f"&#{name};")

    def handle_comment(self, data: str) -> None:
        if _REPEAT_COMMENT_RE.match(data):
            self._output.append(f"<!--{data}-->")

    def get_output(self) -> str:
        return "".join(self._output)


def sanitize_html(html: str) -> str:
    parser = _Sanitizer()
    parser.feed(html)
    parser.close()
    return parser.get_output()
