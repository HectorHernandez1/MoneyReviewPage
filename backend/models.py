"""
Model provider abstraction for the budget chatbot.

Supports Anthropic (Claude) and OpenAI models behind one interface.
Select the provider with environment variables:

    LLM_PROVIDER=anthropic|openai   (default: anthropic)
    LLM_MODEL=<model id>            (optional; provider default used if unset)
    ANTHROPIC_API_KEY / OPENAI_API_KEY for the chosen provider
"""

import os
import json
from abc import ABC, abstractmethod

DEFAULT_MODELS = {
    "anthropic": "claude-sonnet-5",
}

# Providers with OpenAI-compatible chat-completions APIs — all served by
# OpenAIModel, differing only in base URL, API key env var, and defaults.
# token_param: newer OpenAI models require max_completion_tokens; compatible
# providers still use max_tokens.
OPENAI_COMPATIBLE_PROVIDERS = {
    "openai": {
        "base_url": None,  # SDK default (api.openai.com)
        "key_env": "OPENAI_API_KEY",
        "default_model": "gpt-5.6-luna",
        "token_param": "max_completion_tokens",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "key_env": "DEEPSEEK_API_KEY",
        "default_model": "deepseek-v4-flash",
        "token_param": "max_tokens",
    },
    "glm": {
        "base_url": "https://api.z.ai/api/paas/v4",
        "key_env": "GLM_API_KEY",
        "default_model": "glm-5.2",
        "token_param": "max_tokens",
    },
}


class ModelClient(ABC):
    """A chat model that can run a tool-calling loop against our SQL tools."""

    @abstractmethod
    def run_chat(self, system_prompt, history, user_message, tools, execute_tool, max_iterations=8):
        """
        Run one user turn, executing tools until the model produces a text answer.

        Args:
            system_prompt: System prompt string.
            history: Prior clean history [{role, content: str}, ...].
            user_message: The new user message text.
            tools: Tool definitions in Anthropic format (name/description/input_schema).
            execute_tool: Callable (tool_name, tool_args: dict) -> JSON string result.
            max_iterations: Max tool-calling rounds before giving up.

        Returns:
            (text_response, clean_history) — text_response is None if the loop
            was exhausted; clean_history holds only plain-text user/assistant
            turns, capped at 20 entries.
        """

    @abstractmethod
    def stream_chat(self, system_prompt, history, user_message, tools, execute_tool, max_iterations=8):
        """
        Streaming variant of run_chat. A generator yielding event dicts:

            {"type": "text", "delta": str}    — a chunk of assistant text
            {"type": "tool_use", "name": str} — the model started a tool call
            {"type": "final", "response": str | None, "history": list}
                                              — always the last event; response
                                                is the full text (None if the
                                                loop was exhausted)

        Text produced across multiple tool-calling rounds is separated by
        blank lines, in both the streamed deltas and the final response.
        """


class AnthropicModel(ModelClient):
    """Claude via the Anthropic Messages API."""

    def __init__(self, model=None):
        from anthropic import Anthropic
        self.model = model or DEFAULT_MODELS["anthropic"]
        self.client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

    def run_chat(self, system_prompt, history, user_message, tools, execute_tool, max_iterations=8):
        messages = list(history[-20:]) if history else []
        messages.append({"role": "user", "content": user_message})

        text_response = None
        round_texts = []  # visible text from each round, for a partial answer on exhaustion
        for _ in range(max_iterations):
            response = self.client.messages.create(
                model=self.model,
                max_tokens=4096,
                # Adaptive thinking: the model reasons only when a question needs
                # it (e.g. "why am I over budget?"), simple lookups stay fast.
                # Effort "medium" keeps analysis solid without over-deliberating.
                thinking={"type": "adaptive"},
                output_config={"effort": "medium"},
                cache_control={"type": "ephemeral"},
                system=system_prompt,
                tools=tools,
                messages=messages,
            )

            if response.stop_reason == "tool_use":
                round_text = "".join(b.text for b in response.content if b.type == "text")
                if round_text:
                    round_texts.append(round_text)
                # Keep the full content (incl. thinking blocks) for the in-turn loop
                messages.append({"role": "assistant", "content": response.content})
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": execute_tool(block.name, dict(block.input)),
                        })
                messages.append({"role": "user", "content": tool_results})
            else:
                final_text = "".join(b.text for b in response.content if b.type == "text")
                if final_text:
                    round_texts.append(final_text)
                text_response = "\n\n".join(round_texts)
                messages.append({"role": "assistant", "content": text_response})
                break
        else:
            # Loop exhausted mid-analysis: return what we have rather than nothing
            if round_texts:
                text_response = "\n\n".join(round_texts) + \
                    "\n\n_(I ran out of analysis steps, so this is a partial answer — ask a follow-up to continue.)_"
                messages.append({"role": "assistant", "content": text_response})

        # Tool and thinking blocks stay server-side: slicing raw messages could
        # split a tool_use/tool_result pair and break the next request.
        clean_history = [m for m in messages if isinstance(m.get("content"), str)]
        return text_response, clean_history[-20:]

    def stream_chat(self, system_prompt, history, user_message, tools, execute_tool, max_iterations=8):
        messages = list(history[-20:]) if history else []
        messages.append({"role": "user", "content": user_message})

        segments = []  # visible text from each round, joined for the saved history
        for _ in range(max_iterations):
            iteration_text = []
            with self.client.messages.stream(
                model=self.model,
                max_tokens=4096,
                thinking={"type": "adaptive"},
                output_config={"effort": "medium"},
                cache_control={"type": "ephemeral"},
                system=system_prompt,
                tools=tools,
                messages=messages,
            ) as stream:
                for event in stream:
                    if event.type == "content_block_delta" and event.delta.type == "text_delta":
                        if not iteration_text and segments:
                            iteration_text.append("\n\n")
                            yield {"type": "text", "delta": "\n\n"}
                        iteration_text.append(event.delta.text)
                        yield {"type": "text", "delta": event.delta.text}
                    elif event.type == "content_block_start" and event.content_block.type == "tool_use":
                        yield {"type": "tool_use", "name": event.content_block.name}
                response = stream.get_final_message()

            if iteration_text:
                segments.append("".join(iteration_text))

            if response.stop_reason == "tool_use":
                messages.append({"role": "assistant", "content": response.content})
                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": execute_tool(block.name, dict(block.input)),
                        })
                messages.append({"role": "user", "content": tool_results})
            else:
                text_response = "".join(segments)
                messages.append({"role": "assistant", "content": text_response})
                clean_history = [m for m in messages if isinstance(m.get("content"), str)]
                yield {"type": "final", "response": text_response, "history": clean_history[-20:]}
                return

        # Loop exhausted mid-analysis: finish with what we have rather than nothing
        if segments:
            note = "\n\n_(I ran out of analysis steps, so this is a partial answer — ask a follow-up to continue.)_"
            yield {"type": "text", "delta": note}
            text_response = "".join(segments) + note
            messages.append({"role": "assistant", "content": text_response})
            clean_history = [m for m in messages if isinstance(m.get("content"), str)]
            yield {"type": "final", "response": text_response, "history": clean_history[-20:]}
            return

        clean_history = [m for m in messages if isinstance(m.get("content"), str)]
        yield {"type": "final", "response": None, "history": clean_history[-20:]}


def _to_openai_tools(tools):
    """Convert Anthropic-format tool definitions to OpenAI function-tool format."""
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in tools
    ]


class OpenAIModel(ModelClient):
    """OpenAI and OpenAI-compatible models (DeepSeek, GLM, ...) via Chat Completions."""

    def __init__(self, model=None, provider="openai"):
        from openai import OpenAI
        config = OPENAI_COMPATIBLE_PROVIDERS[provider]
        self.model = model or config["default_model"]
        self.token_param = config["token_param"]
        self.client = OpenAI(
            api_key=os.environ.get(config["key_env"]),
            **({"base_url": config["base_url"]} if config["base_url"] else {}),
        )

    def run_chat(self, system_prompt, history, user_message, tools, execute_tool, max_iterations=8):
        messages = [{"role": "system", "content": system_prompt}]
        messages += list(history[-20:]) if history else []
        messages.append({"role": "user", "content": user_message})
        openai_tools = _to_openai_tools(tools)

        text_response = None
        round_texts = []  # visible text from each round, for a partial answer on exhaustion
        for _ in range(max_iterations):
            response = self.client.chat.completions.create(
                model=self.model,
                tools=openai_tools,
                messages=messages,
                **{self.token_param: 4096},
            )
            msg = response.choices[0].message

            if msg.tool_calls:
                if msg.content:
                    round_texts.append(msg.content)
                messages.append({
                    "role": "assistant",
                    "content": msg.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in msg.tool_calls
                    ],
                })
                for tc in msg.tool_calls:
                    try:
                        args = json.loads(tc.function.arguments or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": execute_tool(tc.function.name, args),
                    })
            else:
                if msg.content:
                    round_texts.append(msg.content)
                text_response = "\n\n".join(round_texts)
                messages.append({"role": "assistant", "content": text_response})
                break
        else:
            # Loop exhausted mid-analysis: return what we have rather than nothing
            if round_texts:
                text_response = "\n\n".join(round_texts) + \
                    "\n\n_(I ran out of analysis steps, so this is a partial answer — ask a follow-up to continue.)_"
                messages.append({"role": "assistant", "content": text_response})

        clean_history = [
            m for m in messages
            if m.get("role") in ("user", "assistant")
            and isinstance(m.get("content"), str)
            and not m.get("tool_calls")
        ]
        return text_response, clean_history[-20:]

    def stream_chat(self, system_prompt, history, user_message, tools, execute_tool, max_iterations=8):
        messages = [{"role": "system", "content": system_prompt}]
        messages += list(history[-20:]) if history else []
        messages.append({"role": "user", "content": user_message})
        openai_tools = _to_openai_tools(tools)

        segments = []  # visible text from each round, joined for the saved history
        for _ in range(max_iterations):
            stream = self.client.chat.completions.create(
                model=self.model,
                tools=openai_tools,
                messages=messages,
                stream=True,
                **{self.token_param: 4096},
            )

            iteration_text = []
            # Tool calls stream as fragments keyed by index: the id/name arrive
            # once, the JSON arguments arrive as string pieces to concatenate.
            tool_calls = {}
            for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                if delta is None:
                    continue
                if delta.content:
                    if not iteration_text and segments:
                        iteration_text.append("\n\n")
                        yield {"type": "text", "delta": "\n\n"}
                    iteration_text.append(delta.content)
                    yield {"type": "text", "delta": delta.content}
                for tc in delta.tool_calls or []:
                    entry = tool_calls.setdefault(tc.index, {"id": None, "name": None, "arguments": ""})
                    if tc.id:
                        entry["id"] = tc.id
                    if tc.function:
                        if tc.function.name:
                            entry["name"] = tc.function.name
                            yield {"type": "tool_use", "name": entry["name"]}
                        if tc.function.arguments:
                            entry["arguments"] += tc.function.arguments

            if iteration_text:
                segments.append("".join(iteration_text))

            if tool_calls:
                calls = [tool_calls[i] for i in sorted(tool_calls)]
                messages.append({
                    "role": "assistant",
                    "content": "".join(iteration_text) or None,
                    "tool_calls": [
                        {
                            "id": c["id"],
                            "type": "function",
                            "function": {"name": c["name"], "arguments": c["arguments"]},
                        }
                        for c in calls
                    ],
                })
                for c in calls:
                    try:
                        args = json.loads(c["arguments"] or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    messages.append({
                        "role": "tool",
                        "tool_call_id": c["id"],
                        "content": execute_tool(c["name"], args),
                    })
            else:
                text_response = "".join(segments)
                messages.append({"role": "assistant", "content": text_response})
                clean_history = [
                    m for m in messages
                    if m.get("role") in ("user", "assistant")
                    and isinstance(m.get("content"), str)
                    and not m.get("tool_calls")
                ]
                yield {"type": "final", "response": text_response, "history": clean_history[-20:]}
                return

        # Loop exhausted mid-analysis: finish with what we have rather than nothing
        text_response = None
        if segments:
            note = "\n\n_(I ran out of analysis steps, so this is a partial answer — ask a follow-up to continue.)_"
            yield {"type": "text", "delta": note}
            text_response = "".join(segments) + note
            messages.append({"role": "assistant", "content": text_response})

        clean_history = [
            m for m in messages
            if m.get("role") in ("user", "assistant")
            and isinstance(m.get("content"), str)
            and not m.get("tool_calls")
        ]
        yield {"type": "final", "response": text_response, "history": clean_history[-20:]}


def get_provider():
    return os.environ.get("LLM_PROVIDER", "anthropic").strip().lower()


def configuration_error():
    """Return a human-readable configuration problem, or None if ready to chat."""
    provider = get_provider()
    if provider == "anthropic":
        if not os.environ.get("ANTHROPIC_API_KEY"):
            return "ANTHROPIC_API_KEY not set"
    elif provider in OPENAI_COMPATIBLE_PROVIDERS:
        key_env = OPENAI_COMPATIBLE_PROVIDERS[provider]["key_env"]
        if not os.environ.get(key_env):
            return f"{key_env} not set"
    else:
        valid = "', '".join(["anthropic"] + list(OPENAI_COMPATIBLE_PROVIDERS))
        return f"Unknown LLM_PROVIDER '{provider}' (use '{valid}')"
    return None


_client = None


def get_model_client():
    """Build (once) and return the configured model client."""
    global _client
    if _client is None:
        provider = get_provider()
        model = os.environ.get("LLM_MODEL") or None
        if provider in OPENAI_COMPATIBLE_PROVIDERS:
            _client = OpenAIModel(model, provider=provider)
        else:
            _client = AnthropicModel(model)
    return _client
