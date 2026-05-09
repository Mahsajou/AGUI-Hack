"""Design-system context for the IdeaLens designer agent.

Tries optional Figma MCP over HTTP when `FIGMA_ACCESS_TOKEN` and
`FIGMA_FILE_KEY` are set; otherwise returns the bundled mock library so the
hackathon demo works without Figma wiring.
"""

from __future__ import annotations

import json
import os
from pathlib import Path


def _mock_path() -> Path:
    return Path(__file__).resolve().parent.parent / "data" / "design_system.mock.json"


def load_design_system_context() -> str:
    """Return a compact string the designer LLM can use as a guardrail."""
    token = (os.getenv("FIGMA_ACCESS_TOKEN") or "").strip()
    file_key = (os.getenv("FIGMA_FILE_KEY") or "").strip()
    if token and file_key:
        try:
            return _fetch_via_mcp_use(token, file_key)
        except Exception as e:  # noqa: BLE001
            return _mock_blob() + f"\n\n[Figma MCP failed: {e}; using mock below]\n"

    return _mock_blob()


def _mock_blob() -> str:
    raw = _mock_path().read_text(encoding="utf-8")
    data = json.loads(raw)
    return "DESIGN_SYSTEM_JSON:\n" + json.dumps(data, indent=2)


def _fetch_via_mcp_use(token: str, file_key: str) -> str:
    """Best-effort remote Figma MCP fetch (mcp-use HTTP transport)."""
    from mcp_use import MCPClient  # type: ignore

    url = os.getenv("FIGMA_MCP_URL", "https://mcp.figma.com/mcp")
    cfg = {
        "mcpServers": {
            "figma": {
                "url": url,
                "headers": {"Authorization": f"Bearer {token}"},
            }
        }
    }

    async def _run() -> str:
        client = MCPClient.from_dict(cfg)
        try:
            session = await client.create_session("figma")
            if session is None:
                raise RuntimeError("no figma MCP session")
            # Tool names vary by server; get_metadata is common on Figma MCP.
            for tool_name, args in (
                ("get_metadata", {"fileKey": file_key}),
                ("get_file", {"fileKey": file_key}),
            ):
                try:
                    result = await session.call_tool(tool_name, args)
                    return f"FIGMA_{tool_name.upper()}:\n{result!s}"[:12000]
                except Exception:
                    continue
            return _mock_blob() + "\n\n[Figma MCP: no compatible tool response]"
        finally:
            try:
                await client.close_all_sessions()
            except Exception:
                pass

    from .notion_mcp import _run_sync  # reuse thread+loop bridge

    return _run_sync(_run())
