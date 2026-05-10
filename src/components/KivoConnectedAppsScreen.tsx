import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { onBack: () => void };
type Filter = 'All' | 'Google' | 'Microsoft';
type Connector = {
  id: string;
  name: string;
  category: Exclude<Filter, 'All'>;
  logo: string;
  fallbackIcon: keyof typeof MaterialCommunityIcons.glyphMap;
  fallbackColor: string;
};

const filters: Filter[] = ['All', 'Google', 'Microsoft'];
const connectors: Connector[] = [
  {
    id: 'drive',
    name: 'Google Drive',
    category: 'Google',
    logo: 'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
    fallbackIcon: 'google-drive',
    fallbackColor: '#1a73e8',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Google',
    logo: 'https://www.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png',
    fallbackIcon: 'gmail',
    fallbackColor: '#ea4335',
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    category: 'Google',
    logo: 'https://www.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png',
    fallbackIcon: 'calendar-month',
    fallbackColor: '#1a73e8',
  },
  {
    id: 'outlook-calendar',
    name: 'Outlook Calendar',
    category: 'Microsoft',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Microsoft_Outlook_logo.svg/512px-Microsoft_Outlook_logo.svg.png',
    fallbackIcon: 'microsoft-outlook',
    fallbackColor: '#0078d4',
  },
  {
    id: 'outlook-mail',
    name: 'Outlook Mail',
    category: 'Microsoft',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Microsoft_Outlook_logo.svg/512px-Microsoft_Outlook_logo.svg.png',
    fallbackIcon: 'microsoft-outlook',
    fallbackColor: '#0078d4',
  },
];

export function KivoConnectedAppsScreen({ onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('All');
  const [failedLogoIds, setFailedLogoIds] = useState<Record<string, boolean>>({});
  const shown = connectors.filter((item) => filter === 'All' || item.category === filter);

  function connect(item: Connector) {
    Alert.alert(
      `Connect ${item.name}`,
      'This will open the secure connection flow when the real OAuth setup is added. Kivo will only use connections you allow.',
      [{ text: 'OK' }],
    );
  }

  function showMore() {
    Alert.alert('More apps coming soon', 'This page is ready for more connectors later.');
  }

  function markLogoFailed(id: string) {
    setFailedLogoIds((current) => ({ ...current, [id]: true }));
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
          <View style={styles.summaryIcon}><Feather name="link" size={24} color="#111216" strokeWidth={1.75} /></View>
          <View style={styles.summaryCopy}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={styles.summaryTitle}>5 available services</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.summaryText}>Connect tools you use every day.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Browse all" onPress={showMore} style={({ pressed }) => [styles.browseButton, pressed && styles.pressed]}>
            <Text style={styles.browseText}>Browse all</Text>
            <Feather name="chevron-right" size={18} color="#6f727b" strokeWidth={1.85} />
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
            const logoFailed = Boolean(failedLogoIds[item.id]);
            return (
              <View key={item.id} style={[styles.appRow, index < shown.length - 1 && styles.rowBorder]}>
                <View style={styles.logoBox}>
                  {logoFailed ? (
                    <MaterialCommunityIcons name={item.fallbackIcon} size={34} color={item.fallbackColor} />
                  ) : (
                    <Image source={{ uri: item.logo }} style={styles.logo} resizeMode="contain" onError={() => markLogoFailed(item.id)} />
                  )}
                </View>
                <View style={styles.appCopy}>
                  <Text numberOfLines={1} style={styles.appName}>{item.name}</Text>
                  <Text numberOfLines={1} style={styles.appStatus}>Not connected</Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Connect ${item.name}`} onPress={() => connect(item)} style={({ pressed }) => [styles.connectButton, pressed && styles.primaryPressed]}>
                  <Text style={styles.connectText}>Connect</Text>
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
  content: { flex: 1, paddingHorizontal: 18, paddingBottom: 6, transform: [{ translateY: -10 }] },
  header: { height: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 48, height: 48 },
  title: { color: '#111216', fontSize: 24.5, fontWeight: '700', letterSpacing: -0.82, lineHeight: 30 },
  subtitle: { marginTop: 5, color: '#737680', fontSize: 14.2, letterSpacing: -0.3, lineHeight: 18 },
  summaryCard: { minHeight: 78, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.84)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.055)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 12 },
  summaryIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f2' },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryTitle: { color: '#111216', fontSize: 17.2, fontWeight: '700', letterSpacing: -0.48, lineHeight: 22 },
  summaryText: { marginTop: 3, color: '#737680', fontSize: 12.6, letterSpacing: -0.24, lineHeight: 16 },
  browseButton: { minHeight: 40, borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.72)', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  browseText: { color: '#111216', fontSize: 13.8, fontWeight: '500' },
  searchBar: { height: 50, borderRadius: 21, marginTop: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(255,255,255,0.56)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, gap: 12 },
  searchText: { color: '#777a84', fontSize: 16 },
  filters: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  filter: { minHeight: 38, minWidth: 72, borderRadius: 19, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.07)', backgroundColor: 'rgba(255,255,255,0.68)' },
  filterActive: { backgroundColor: '#050507', borderColor: '#050507' },
  filterText: { color: '#111216', fontSize: 13.7, fontWeight: '600' },
  filterTextActive: { color: '#ffffff' },
  listCard: { overflow: 'hidden', borderRadius: 24, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.86)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.045)' },
  appRow: { minHeight: 73, flexDirection: 'row', alignItems: 'center', paddingLeft: 17, paddingRight: 16, gap: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.072)' },
  logoBox: { width: 47, height: 47, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.045)' },
  logo: { width: 35, height: 35 },
  appCopy: { flex: 1, minWidth: 0 },
  appName: { color: '#111216', fontSize: 17.1, fontWeight: '600', letterSpacing: -0.42, lineHeight: 22 },
  appStatus: { marginTop: 3, color: '#777a84', fontSize: 13.6, letterSpacing: -0.22, lineHeight: 16 },
  connectButton: { minHeight: 36, minWidth: 94, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.72)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.08)' },
  connectText: { color: '#111216', fontSize: 14.8, fontWeight: '700' },
  moreButton: { height: 48, marginTop: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  moreText: { color: '#111216', fontSize: 15.4, fontWeight: '600' },
  privacyRow: { minHeight: 42, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  privacyIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.46)' },
  privacyTitle: { color: '#111216', fontSize: 13.8, fontWeight: '700' },
  privacyText: { marginTop: 1, color: '#747780', fontSize: 12.8 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
  primaryPressed: { opacity: 0.86, transform: [{ scale: 0.992 }] },
});
