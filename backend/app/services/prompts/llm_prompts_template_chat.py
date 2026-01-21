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


__all__ = [
    "TEMPLATE_CHAT_PROMPT_VERSION",
    "TEMPLATE_CHAT_SYSTEM_PROMPT",
    "build_template_chat_prompt",
]
