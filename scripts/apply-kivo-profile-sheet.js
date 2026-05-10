const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/KivoSidebarOverlay.tsx');
let source = fs.readFileSync(filePath, 'utf8');

function replaceOnce(from, to, label) {
  if (!source.includes(from)) {
    throw new Error(`Missing patch target: ${label}`);
  }
  source = source.replace(from, to);
}

if (source.includes("import { KivoProfileSheet } from './KivoProfileSheet';") && source.includes('profileOpen')) {
  console.log('Kivo profile sheet is already applied.');
  process.exit(0);
}

replaceOnce(
  "import { deleteKivoConversation, renameKivoConversation } from '../lib/kivo-history';",
  "import { deleteKivoConversation, renameKivoConversation } from '../lib/kivo-history';\nimport { KivoProfileSheet } from './KivoProfileSheet';",
  'profile sheet import',
);

replaceOnce(
  "  const [deleteConversation, setDeleteConversation] = useState<KivoNativeConversation | null>(null);",
  "  const [deleteConversation, setDeleteConversation] = useState<KivoNativeConversation | null>(null);\n  const [profileOpen, setProfileOpen] = useState(false);",
  'profile open state',
);

replaceOnce(
  "    setDeleteConversation(null);\n    onClose();",
  "    setDeleteConversation(null);\n    setProfileOpen(false);\n    onClose();",
  'close menu profile reset',
);

replaceOnce(
  "    setDeleteConversation(null);\n    onNewChat();",
  "    setDeleteConversation(null);\n    setProfileOpen(false);\n    onNewChat();",
  'new chat profile reset',
);

replaceOnce(
  "    setDeleteConversation(null);\n    onOpenConversation?.(id);",
  "    setDeleteConversation(null);\n    setProfileOpen(false);\n    onOpenConversation?.(id);",
  'open conversation profile reset',
);

replaceOnce(
  "        onPress={closeMenu}",
  "        onPress={profileOpen ? () => setProfileOpen(false) : closeMenu}",
  'close area profile close',
);

replaceOnce(
  `            <Pressable accessibilityRole="button" accessibilityLabel="Profile" style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}>
              <Text style={styles.avatarText}>M</Text>
            </Pressable>`,
  `            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Profile"
              onPress={() => setProfileOpen(true)}
              style={({ pressed }) => [styles.avatarButton, profileOpen && styles.avatarButtonActive, pressed && styles.pressed]}
            >
              <Text style={styles.avatarText}>M</Text>
            </Pressable>`,
  'avatar opens profile sheet',
);

replaceOnce(
  `      {actionConversation ? (`,
  `      {profileOpen ? (
        <KivoProfileSheet drawerWidth={drawerWidth} bottomInset={insets.bottom} onClose={() => setProfileOpen(false)} />
      ) : null}

      {actionConversation ? (`,
  'profile sheet render',
);

replaceOnce(
  `  avatarText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '500',
  },`,
  `  avatarButtonActive: {
    transform: [{ scale: 0.98 }],
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '500',
  },`,
  'avatar active style',
);

fs.writeFileSync(filePath, source);
console.log('Applied Kivo profile sheet.');
