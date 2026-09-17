# African Language Intelligence

This module extends the existing `core/language`, `core/knowledge`, Firebase
training, and AI proxy layers without replacing them.

## Architecture

- `registry.ts` contains extensible profiles and honest support levels.
- `detector.ts` detects supported languages, Nigerian Pidgin, and basic
  code-switching without treating Pidgin as English.
- `engine.ts` coordinates detection, semantic preservation, knowledge lookup,
  provider-backed translation, and confidence reporting.
- `knowledge.ts` stores candidates, provenance, verification history,
  conflicts, and versions. Unverified records cannot silently replace verified
  records.
- `trainingAdapter.ts` consumes the existing `ExtractedTrainingEntry` format
  produced by `src/lib/trainingExtraction.ts`.

The chat engine adds detected-language context to the existing AI request while
preserving the original user message and provider fallback behavior.

## Adding a language

Register a `LanguageProfile` with `defaultLanguageRegistry.register(...)`.
Add knowledge through `LanguageKnowledgeStore.createCandidate(...)`; use
`admin_training` for administrator-supplied entries and verify them explicitly.
Language profiles must use `planned`, `experimental`, `partial`, `supported`,
or `verified` rather than claiming capabilities that are not available.

## Provider integration

Pass a `LanguageProvider` to `LanguageCoordinationEngine`. The provider is
responsible for model-backed translation and optional interpretation. When no
provider or verified knowledge is available, the engine returns the preserved
meaning with an explicit low-confidence limitation instead of fabricating a
translation.

## Security and testing

User contributions remain candidates until reviewed. Conflicting meanings are
stored as alternatives with dialect/provenance rather than overwritten.
Focused tests are in `__tests__/engine.test.ts`; run them with:

```text
npx vitest run core/language-intelligence/__tests__/engine.test.ts
```
