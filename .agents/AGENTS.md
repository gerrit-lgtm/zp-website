# Project Rules & Customizations

## Token Efficiency & Context Guard
- **Strict Tool & Context Hygiene**: Do not register, load, or invoke unnecessary heavy MCP tools or non-essential plugin suites (such as bulk science/chemoinformatics skills or heavy media generation tools) unless explicitly requested for the task.
- **Prevent Context Bloat**: Keep prompts, background outputs, and attached file contexts trimmed to avoid blowing up the system prompt. Never allow prompt overhead to exceed token limits, ensuring models like Claude Sonnet can always be selected without context overflow errors or credit waste.
- **Clean Execution**: Process raw tool outputs, large data files, and logs silently or via scratch scripts without dumping huge token payloads into the conversation transcript.
