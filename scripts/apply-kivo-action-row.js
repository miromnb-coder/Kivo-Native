const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/KivoChatScreenStreaming.tsx');

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`Patch failed: missing ${label}`);
  }
  return source.replace(from, to);
}

let source = fs.readFileSync(filePath, 'utf8');

if (source.includes("KivoMessageActionBar") && source.includes("KivoSourcesSheet")) {
  console.log('Kivo action row is already applied.');
  process.exit(0);
}

source = replaceOnce(
  source,
  "import { askKivoAiStream } from '../lib/kivo-ai';",
  "import { askKivoAiStream, type KivoAiMetadata, type KivoSource } from '../lib/kivo-ai';",
  'kivo-ai import',
);

source = replaceOnce(
  source,
  "import { KivoPlusSheet, type RecentPhoto } from './KivoPlusSheet';\nimport { KivoSidebarOverlay } from './KivoSidebarOverlay';",
  "import { KivoPlusSheet, type RecentPhoto } from './KivoPlusSheet';\nimport { KivoMessageActionBar } from './KivoMessageActionBar';\nimport { KivoSidebarOverlay } from './KivoSidebarOverlay';\nimport { KivoSourcesSheet } from './KivoSourcesSheet';",
  'component imports',
);

source = replaceOnce(
  source,
  "type ChatMessage = {\n  id: string;\n  role: 'user' | 'assistant';\n  text: string;\n  photo?: RecentPhoto | null;\n};",
  "type ChatMessage = {\n  id: string;\n  role: 'user' | 'assistant';\n  text: string;\n  photo?: RecentPhoto | null;\n  sources?: KivoSource[];\n  usedSearch?: boolean;\n};",
  'ChatMessage metadata fields',
);

source = replaceOnce(
  source,
  "  const [sidebarVisible, setSidebarVisible] = useState(false);\n  const [sidebarOpen, setSidebarOpen] = useState(false);",
  "  const [sidebarVisible, setSidebarVisible] = useState(false);\n  const [sidebarOpen, setSidebarOpen] = useState(false);\n  const [sourcesSheetSources, setSourcesSheetSources] = useState<KivoSource[]>([]);",
  'sources sheet state',
);

source = replaceOnce(
  source,
  "    let assistantInserted = false;\n    let streamedText = '';",
  "    let assistantInserted = false;\n    let streamedText = '';\n    let assistantMetadata: KivoAiMetadata = {};",
  'assistant metadata variable',
);

source = replaceOnce(
  source,
  "    const finalAnswer = await askKivoAiStream({\n      message,\n      photo: photoForMessage,\n      history: historyForAi,\n      onDelta: (delta) => {",
  "    const finalAnswer = await askKivoAiStream({\n      message,\n      photo: photoForMessage,\n      history: historyForAi,\n      onMetadata: (metadata) => {\n        assistantMetadata = metadata;\n        if (requestIdRef.current !== requestId) return;\n\n        setMessages((current) => current.map((item) => (\n          item.id === assistantMessageId\n            ? { ...item, sources: metadata.sources ?? [], usedSearch: metadata.usedSearch }\n            : item\n        )));\n      },\n      onDelta: (delta) => {",
  'askKivoAiStream metadata handler',
);

source = replaceOnce(
  source,
  "            assistantInserted = true;\n            return [...current, { id: assistantMessageId, role: 'assistant', text: streamedText }];",
  "            assistantInserted = true;\n            return [...current, {\n              id: assistantMessageId,\n              role: 'assistant',\n              text: streamedText,\n              sources: assistantMetadata.sources ?? [],\n              usedSearch: assistantMetadata.usedSearch,\n            }];",
  'insert assistant message metadata',
);

source = replaceOnce(
  source,
  "          return current.map((item) => (item.id === assistantMessageId ? { ...item, text: streamedText } : item));",
  "          return current.map((item) => (\n            item.id === assistantMessageId\n              ? { ...item, text: streamedText, sources: assistantMetadata.sources ?? item.sources, usedSearch: assistantMetadata.usedSearch ?? item.usedSearch }\n              : item\n          ));",
  'stream update assistant metadata',
);

source = replaceOnce(
  source,
  "      if (!hasAssistant) return [...current, { id: assistantMessageId, role: 'assistant', text: cleanAnswer }];\n      return current.map((item) => (item.id === assistantMessageId ? { ...item, text: cleanAnswer } : item));",
  "      if (!hasAssistant) {\n        return [...current, {\n          id: assistantMessageId,\n          role: 'assistant',\n          text: cleanAnswer,\n          sources: assistantMetadata.sources ?? [],\n          usedSearch: assistantMetadata.usedSearch,\n        }];\n      }\n\n      return current.map((item) => (\n        item.id === assistantMessageId\n          ? { ...item, text: cleanAnswer, sources: assistantMetadata.sources ?? item.sources, usedSearch: assistantMetadata.usedSearch ?? item.usedSearch }\n          : item\n      ));",
  'final assistant message metadata',
);

source = replaceOnce(
  source,
  "                    <Text style={styles.assistantName}>Kivo</Text>\n                    <KivoAssistantContent text={message.text} />\n                  </View>",
  "                    <Text style={styles.assistantName}>Kivo</Text>\n                    <KivoAssistantContent text={message.text} />\n                    <KivoMessageActionBar\n                      messageText={message.text}\n                      sources={message.sources}\n                      onOpenSources={() => setSourcesSheetSources(message.sources ?? [])}\n                    />\n                  </View>",
  'assistant message action bar render',
);

source = replaceOnce(
  source,
  "      <KivoPlusSheet open={plusOpen} onClose={closePlusSheet} onExpandedChange={setPlusExpanded} onSelectPhoto={handleSelectPhoto} />\n    </View>",
  "      <KivoPlusSheet open={plusOpen} onClose={closePlusSheet} onExpandedChange={setPlusExpanded} onSelectPhoto={handleSelectPhoto} />\n      <KivoSourcesSheet open={sourcesSheetSources.length > 0} sources={sourcesSheetSources} onClose={() => setSourcesSheetSources([])} />\n    </View>",
  'sources sheet render',
);

fs.writeFileSync(filePath, source);
console.log('Applied Kivo assistant action row + sources sheet patch to KivoChatScreenStreaming.tsx');
