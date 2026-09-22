# SwiftPDF AI Architecture & Integration Specification

SwiftPDF is strictly **local-first** by default. Any AI features are optional and pluggable.

## Architectural Principles
1. **Disabled by Default**: SwiftPDF operates with zero cloud AI dependencies.
2. **Explicit User Consent**: Any remote AI action requires explicit user confirmation:  
   *"This action sends selected document content to [provider]. Continue?"*
3. **Local LLM Support**: Designed to hook into local on-device models (e.g., Ollama / llama.cpp) via local HTTP API (`http://localhost:11434`).
4. **Structured Actions Only**: When an AI model processes a document, it must return structured actions (e.g. `{ intent: 'delete_pages', pages: [3, 4] }`), and destructive actions require explicit user approval before execution.
