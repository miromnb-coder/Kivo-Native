import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { onBack: () => void };
type Filter = 'All' | 'Google' | 'Microsoft';
type Connector = {
  id: string;
  name: string;
  category: Exclude<Filter, 'All'>;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
};

const filters: Filter[] = ['All', 'Google', 'Microsoft'];
const connectors: Connector[] = [
  { id: 'drive', name: 'Google Drive', category: 'Google', icon: 'google-drive', color: '#1a73e8' },
  { id: 'gmail', name: 'Gmail', category: 'Google', icon: 'gmail', color: '#ea4335' },
  { id: 'calendar', name: 'Google Calendar', category: 'Google', icon: 'calendar-month', color: '#1a73e8' },
  { id: 'outlook-calendar', name: 'Outlook Calendar', category: 'Microsoft', icon: 'microsoft-outlook', color: '#0078d4' },
  { id: 'outlook-mail', name: 'Outlook Mail', category: 'Microsoft', icon: 'microsoft-outlook', color: '#0078d4' },
];

export function KivoConnectedAppsScreen({ onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('All');
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const shown = connectors.filter((item) => filter === 'All' || item.category === filter);

  function connect(item: Connector) {
    if (connected[item.id]) {
      Alert.alert(item.name, 'This service is already connected.');
      return;
    }

    Alert.alert(`Connect ${item.name}`, 'Kivo will only use this connection for tools you allow.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Connect', onPress: () => setConnected((current) => ({ ...current, [item.id]: true })) },
    ]);
  }

  function showMore() {
    Alert.alert('More apps coming soon', 'This page is ready for more connectors later.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Feather name="chevron-left" size={28} color="#111216" strokeWidth={1.85} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text numberOfLines={1} style={styles.title}>Connected apps</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.76} style={styles.subtitle}>Manage your connected services and add more tools.</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}><Feather name="link" size={25} color="#111216" strokeWidth={1.75} /></View>
          <View style={styles.summaryCopy}>
            <Text numberOfLines={1} style={styles.summaryTitle}>5 available services</Text>
            <Text numberOfLines={1} style={styles.summaryText}>Connect tools you use every day.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Browse all" onPress={showMore} style={({ pressed }) => [styles.browseButton, pressed && styles.pressed]}>
            <Text style={styles.browseText}>Browse all</Text>
            <Feather name="chevron-right" size={20} color="#6f727b" strokeWidth={1.85} />
          </Pressable>
        </View>

        <Pressable accessibilityRole="search" accessibilityLabel="Search apps" style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}>
          <Feather name="search" size={21} color="#777a84" strokeWidth={1.75} />
          <Text style={styles.searchText}>Search apps</Text>
        </Pressable>

        <View style={styles.filters}>
          {filters.map((label) => {
            const active = label === filter;
            return (
              <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={() => setFilter(label)} style={({ pressed }) => [styles.filter, active && styles.filterActive, pressed && styles.pressed]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.listCard}>
          {shown.map((item, index) => {
            const isConnected = Boolean(connected[item.id]);
            return (
              <View key={item.id} style={[styles.appRow, index < shown.length - 1 && styles.rowBorder]}>
                <View style={styles.logoBox}>
                  <MaterialCommunityIcons name={item.icon} size={35} color={item.color} />
                </View>
                <View style={styles.appCopy}>
                  <Text numberOfLines={1} style={styles.appName}>{item.name}</Text>
                  <Text numberOfLines={1} style={styles.appStatus}>{isConnected ? 'Connected' : 'Not connected'}</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Connect ${item.name}`} onPress={() => connect(item)} style={({ pressed }) => [styles.connectButton, isConnected && styles.connectedButton, pressed && styles.pressed]}>
                  <Text style={[styles.connectText, isConnected && styles.connectedText]}>{isConnected ? 'Connected' : 'Connect'}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="View more apps" onPress={showMore} style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
          <Text style={styles.moreText}>View more apps</Text>
          <Feather name="chevron-right" size={22} color="#6f727b" strokeWidth={1.85} />
        </Pressable>

        <View style={styles.privacyRow}>
          <View style={styles.privacyIcon}><Feather name="shield" size={18} color="#747780" strokeWidth={1.75} /></View>
          <View>
            <Text style={styles.privacyTitle}>Private by design.</Text>
            <Text style={styles.privacyText}>You control your data.</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { ...StyleSheet.absoluteFillObject, zIndex: 189, backgroundColor: '#f5f5f6' },
  content: { flex: 1, paddingHorizontal: 18, paddingBottom: 8, transform: [{ translateY: -8 }] },
  header: { height: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 48, height: 48 },
  title: { color: '#111216', fontSize: 26, fontWeight: '700', letterSpacing: -0.84, lineHeight: 32 },
  subtitle: { marginTop: 6, color: '#737680', fontSize: 15.2, letterSpacing: -0.3, lineHeight: 19 },
  summaryCard: { minHeight: 88, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.84)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.055)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 14 },
  summaryIcon: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f2' },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { color: '#111216', fontSize: 18.6, fontWeight: '700', letterSpacing: -0.48, lineHeight: 23 },
  summaryText: { marginTop: 5, color: '#737680', fontSize: 13.7, letterSpacing: -0.24, lineHeight: 17 },
  browseButton: { minHeight: 42, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.72)', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14 },
  browseText: { color: '#111216', fontSize: 14.8, fontWeight: '500' },
  searchBar: { height: 56, borderRadius: 22, marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(255,255,255,0.56)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, gap: 12 },
  searchText: { color: '#777a84', fontSize: 16.5 },
  filters: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  filter: { minHeight: 40, minWidth: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(255,255,255,0.68)' },
  filterActive: { backgroundColor: '#050507', borderColor: '#050507' },
  filterText: { color: '#111216', fontSize: 13.7, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  listCard: { overflow: 'hidden', borderRadius: 24, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.045)' },
  appRow: { minHeight: 86, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 17, gap: 15 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.072)' },
  logoBox: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.045)' },
  appCopy: { flex: 1, minWidth: 0 },
  appName: { color: '#111216', fontSize: 18.2, fontWeight: '600', letterSpacing: -0.44, lineHeight: 23 },
  appStatus: { marginTop: 5, color: '#777a84', fontSize: 14.2, letterSpacing: -0.24, lineHeight: 17 },
  connectButton: { minHeight: 38, minWidth: 96, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.08)' },
  connectedButton: { backgroundColor: '#ececef' },
  connectText: { color: '#111216', fontSize: 15.2, fontWeight: '700' },
  connectedText: { color: '#6c7078' },
  moreButton: { height: 52, marginTop: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  moreText: { color: '#111216', fontSize: 15.8, fontWeight: '600' },
  privacyRow: { minHeight: 48, marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  privacyIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.46)' },
  privacyTitle: { color: '#111216', fontSize: 14.5, fontWeight: '700' },
  privacyText: { marginTop: 1, color: '#747780', fontSize: 13.4 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
});
