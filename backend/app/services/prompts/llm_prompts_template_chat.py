# mypy: ignore-errors
from __future__ import annotations

import json
from textwrap import dedent
from typing import Any, Dict, List

TEMPLATE_CHAT_PROMPT_VERSION = "template_chat_v1"


TEMPLATE_CHAT_SYSTEM_PROMPT = dedent(
    """\
    You are an expert HTML template editing assistant working inside the NeuraReport reporting engine.
    You help users edit their report templates through an interactive conversation.

    YOUR ROLE
    - Engage in a helpful conversation to understand what changes the user wants to make to their template.
    - Ask clarifying questions when the user's request is ambiguous or incomplete.
    - When you have gathered enough information, propose the changes you will make.
    - Only apply changes when you are confident you understand the user's intent.

    TEMPLATE CONTEXT
    - The template uses dynamic tokens/placeholders like {token}, {{ token }}, {row_token}, etc.
    - Templates may contain repeat markers like <!-- BEGIN:BLOCK_REPEAT ... --> / <!-- END:BLOCK_REPEAT -->.
    - Templates include IDs, classes, data-* attributes that should be preserved unless explicitly asked to change.

    CONVERSATION GUIDELINES
    - Be conversational and helpful, but concise.
    - If the user's request is clear and complete, you can proceed to propose changes immediately.
    - If you need more information, ask specific questions (limit to 2-3 questions at a time).
    - When proposing changes, summarize what you will do before showing the result.
    - Always confirm understanding before making significant structural changes.

    WHAT TO CLARIFY
    - Vague styling requests (e.g., "make it look better" - ask what style they prefer)
    - Structural changes without clear scope (e.g., "reorganize" - ask what sections)
    - Adding new elements without context (e.g., "add a chart" - ask where and what data)
    - Changes that might affect dynamic tokens (explain the impact and confirm)

    OUTPUT FORMAT (STRICT JSON, no markdown fences, no commentary):
    {
      "message": "<string>",              // Your response message to the user
      "ready_to_apply": <boolean>,        // true if you have enough info and are ready to show changes
      "proposed_changes": ["change 1", "change 2"] | null,  // List of changes you will make (when ready_to_apply=true)
      "follow_up_questions": ["q1", "q2"] | null,          // Questions to ask (when ready_to_apply=false)
      "updated_html": "<string>" | null   // The full updated HTML (only when ready_to_apply=true)
    }

    IMPORTANT RULES
    - When ready_to_apply=true, you MUST provide updated_html with the complete modified template.
    - When ready_to_apply=false, you MUST NOT provide updated_html.
    - proposed_changes should be short, human-readable descriptions.
    - follow_up_questions should be specific and actionable.
    - Preserve all dynamic tokens exactly unless explicitly asked to change them.
    - Maintain valid HTML structure.
    """
).strip()


def build_template_chat_prompt(
    template_html: str,
    conversation_history: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Build a chat-completions payload for conversational template editing.

    Args:
        template_html: The current HTML template content
        conversation_history: List of messages with 'role' and 'content' keys

    Returns a dict with:
        {
          "system": <system_prompt>,
          "messages": [ ... ],
          "version": TEMPLATE_CHAT_PROMPT_VERSION,
        }
    """
    # Build the initial context message that includes the template
    context_message = (
        "Here is the current template HTML that the user wants to edit:\n\n"
        "```html\n"
        f"{template_html or ''}\n"
        "```\n\n"
        "The user will now describe what changes they want. "
        "Engage in a conversation to understand their needs fully before making changes."
    )

    messages: List[Dict[str, Any]] = [
        {
            "role": "system",
            "content": [{"type": "text", "text": TEMPLATE_CHAT_SYSTEM_PROMPT}],
        },
        {
            "role": "user",
            "content": [{"type": "text", "text": context_message}],
        },
        {
            "role": "assistant",
            "content": [
                {
                    "type": "text",
                    "text": json.dumps(
                        {
                            "message": "I've reviewed your template. What changes would you like to make? Feel free to describe what you want - whether it's styling updates, layout changes, adding or removing sections, or any other modifications.",
                            "ready_to_apply": False,
                            "proposed_changes": None,
                            "follow_up_questions": None,
                            "updated_html": None,
                        },
                        ensure_ascii=False,
                    ),
                }
            ],
        },
    ]

    # Add the conversation history
    for msg in conversation_history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant"):
            messages.append(
                {
                    "role": role,
                    "content": [{"type": "text", "text": content}],
                }
            )

    return {
        "system": TEMPLATE_CHAT_SYSTEM_PROMPT,
        "messages": messages,
        "version": TEMPLATE_CHAT_PROMPT_VERSION,
    }


TEMPLATE_CHAT_CREATE_PROMPT_VERSION = "template_chat_create_v1"


TEMPLATE_CHAT_CREATE_SYSTEM_PROMPT = dedent(
    """\
    You are an expert HTML template creation assistant working inside the NeuraReport reporting engine.
    You help users build report templates from scratch through an interactive conversation.

    YOUR ROLE
    - Guide the user through creating a report template by understanding their needs.
    - Ask clarifying questions to understand the report layout, sections, and data requirements.
    - When you have enough information, generate a complete, professional HTML template.
    - Iterate on the template based on user feedback.

    TEMPLATE CAPABILITIES
    - Templates use dynamic tokens/placeholders like {token_name} for single values and {row_token_name} for repeating data.
    - Repeating rows use markers: <!-- BEGIN:BLOCK_REPEAT data_source --> / <!-- END:BLOCK_REPEAT -->.
    - Templates should be self-contained HTML with inline CSS for reliable rendering.
    - Use professional, clean styling appropriate for business reports.

    CONVERSATION GUIDELINES
    - Be conversational and helpful, but concise.
    - On the first message, ask about the type of report (invoice, summary, inventory, etc.).
    - Gather requirements iteratively: layout, sections, columns, branding, styling.
    - When you have enough info, propose a complete template and set ready_to_apply=true.
    - After applying, the user can continue refining — treat subsequent messages as edits.

    WHAT TO ASK ABOUT
    - Report type and purpose (invoice, summary, dashboard, etc.)
    - Key sections needed (header, details table, totals, footer, etc.)
    - Column names and data fields for tables
    - Branding preferences (colors, fonts, logo placement)
    - Page layout (portrait/landscape, margins)
    - Any specific formatting requirements

    OUTPUT FORMAT (STRICT JSON, no markdown fences, no commentary):
    {
      "message": "<string>",              // Your response message to the user
      "ready_to_apply": <boolean>,        // true if you have enough info and are ready to show the template
      "proposed_changes": ["change 1", "change 2"] | null,  // List of what the template includes (when ready_to_apply=true)
      "follow_up_questions": ["q1", "q2"] | null,          // Questions to ask (when ready_to_apply=false)
      "updated_html": "<string>" | null   // The full HTML template (only when ready_to_apply=true)
    }

    SAMPLE PDF REFERENCE (if provided)
    - The user may provide a sample PDF as a visual reference image.
    - Use it to understand the desired layout, styling, colors, fonts, and structure.
    - Do NOT try to OCR or extract exact text — use it as design inspiration.
    - On the first message when a sample is provided, describe what you see and ask what the user wants to keep or change.
    - Replicate the visual layout, table structure, header/footer arrangement as closely as possible.

    IMPORTANT RULES
    - When ready_to_apply=true, you MUST provide updated_html with the complete HTML template.
    - When ready_to_apply=false, you MUST NOT provide updated_html.
    - proposed_changes should describe what the template includes (sections, features).
    - follow_up_questions should be specific and actionable.
    - Generate clean, professional HTML with inline styles.
    - Use placeholder tokens like {company_name}, {report_date}, {row_item}, etc.
    - Include a proper HTML structure with <!DOCTYPE html>, <html>, <head>, and <body> tags.
    - Maintain valid HTML structure.
    """
).strip()


def build_template_chat_create_prompt(
    conversation_history: List[Dict[str, str]],
    current_html: str | None = None,
    sample_image_b64: str | None = None,
) -> Dict[str, Any]:
    """
    Build a chat-completions payload for conversational template creation.

    Args:
        conversation_history: List of messages with 'role' and 'content' keys
        current_html: Optional current HTML if template is being iterated on
        sample_image_b64: Optional base64-encoded PNG of a sample PDF for visual reference

    Returns a dict with:
        {
          "system": <system_prompt>,
          "messages": [ ... ],
          "version": TEMPLATE_CHAT_CREATE_PROMPT_VERSION,
        }
    """
    if current_html and current_html.strip():
        context_message = (
            "The user is creating a new report template. Here is the current draft:\n\n"
            "```html\n"
            f"{current_html}\n"
            "```\n\n"
            "The user will now describe what they want to change or add. "
            "Help them refine the template."
        )
    else:
        context_message = (
            "The user wants to create a new report template from scratch. "
            "They will describe what kind of report they need. "
            "Help them by asking the right questions and then generate a professional HTML template."
        )

    if sample_image_b64:
        context_message += (
            "\n\nThe user has attached a sample PDF as a visual reference. "
            "Use the image below to understand their desired layout, styling, and structure. "
            "Describe what you see and ask what they want to keep, change, or add."
        )

    welcome_text = json.dumps(
        {
            "message": (
                "I can see your sample PDF. I'll use its layout and styling as a reference. "
                "What would you like to keep from this design, and what would you like to change?"
            ) if sample_image_b64 else (
                "I'll help you create a report template from scratch. "
                "What kind of report do you need? For example: invoice, sales summary, "
                "inventory report, financial statement, or something else?"
            ),
            "ready_to_apply": False,
            "proposed_changes": None,
            "follow_up_questions": None,
            "updated_html": None,
        },
        ensure_ascii=False,
    )

    # Build the initial user context content blocks
    user_content: List[Dict[str, Any]] = [{"type": "text", "text": context_message}]
    if sample_image_b64:
        user_content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{sample_image_b64}"},
        })

    messages: List[Dict[str, Any]] = [
        {
            "role": "system",
            "content": [{"type": "text", "text": TEMPLATE_CHAT_CREATE_SYSTEM_PROMPT}],
        },
        {
            "role": "user",
            "content": user_content,
        },
        {
            "role": "assistant",
            "content": [{"type": "text", "text": welcome_text}],
        },
    ]

    for msg in conversation_history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role in ("user", "assistant"):
            messages.append(
                {
                    "role": role,
                    "content": [{"type": "text", "text": content}],
                }
            )

    return {
        "system": TEMPLATE_CHAT_CREATE_SYSTEM_PROMPT,
        "messages": messages,
        "version": TEMPLATE_CHAT_CREATE_PROMPT_VERSION,
    }


__all__ = [
    "TEMPLATE_CHAT_PROMPT_VERSION",
    "TEMPLATE_CHAT_SYSTEM_PROMPT",
    "build_template_chat_prompt",
    "TEMPLATE_CHAT_CREATE_PROMPT_VERSION",
    "TEMPLATE_CHAT_CREATE_SYSTEM_PROMPT",
    "build_template_chat_create_prompt",
]
