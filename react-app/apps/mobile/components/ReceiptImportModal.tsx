import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  ReceiptParser,
  mapLineItemToPantryDraft,
  STORAGE_ZONES,
  STORAGE_ZONE_LABELS,
  type PantryItemDraft,
  type ReceiptParseResult,
  type StorageZone,
} from '@fuelify/shared';
import { useSupabaseClient } from '../hooks/useStores';

interface Props {
  visible: boolean;
  onClose: () => void;
  onImport: (drafts: PantryItemDraft[]) => Promise<void>;
}

interface EditableLine extends PantryItemDraft {
  selected: boolean;
}

export function ReceiptImportModal({ visible, onClose, onImport }: Props) {
  const supabase = useSupabaseClient();
  const parser = useMemo(() => new ReceiptParser(supabase), [supabase]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptParseResult | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setLoading(false);
    setError(null);
    setResult(null);
    setLines([]);
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickAndParse = useCallback(
    async (source: 'camera' | 'library') => {
      reset();
      setLoading(true);
      try {
        const perm =
          source === 'camera'
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          setLoading(false);
          setError('Permission denied.');
          return;
        }
        const pick =
          source === 'camera'
            ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.6 })
            : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.6 });

        if (pick.canceled || !pick.assets?.[0]?.base64) {
          setLoading(false);
          return;
        }

        const parsed = await parser.parse(pick.assets[0].base64);
        setResult(parsed);
        setLines(
          parsed.lineItems.map((l) => ({ ...mapLineItemToPantryDraft(l), selected: true })),
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [parser],
  );

  const updateLine = (i: number, patch: Partial<EditableLine>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const handleImport = async () => {
    const drafts = lines.filter((l) => l.selected && l.name.trim()).map(({ selected: _s, ...d }) => d);
    if (drafts.length === 0) {
      Alert.alert('Nothing to import', 'Select at least one line item.');
      return;
    }
    setSubmitting(true);
    try {
      await onImport(drafts);
      handleClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Import Receipt</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#FFBD73" />
              <Text style={styles.status}>Parsing receipt…</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.error}>{error}</Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => setError(null)}>
                <Text style={styles.btnPrimaryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : !result ? (
            <View style={styles.center}>
              <Text style={styles.hint}>
                Take a photo of a receipt, or pick one from your library. We&apos;ll extract the
                line items so you can bulk-import them.
              </Text>
              <TouchableOpacity style={styles.btnPrimary} onPress={() => pickAndParse('camera')}>
                <Text style={styles.btnPrimaryText}>📷 Take photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSecondary} onPress={() => pickAndParse('library')}>
                <Text style={styles.btnSecondaryText}>🖼 Choose from library</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {result.merchantName ? (
                <Text style={styles.merchant}>{result.merchantName}</Text>
              ) : null}
              <Text style={styles.subtitle}>
                {lines.filter((l) => l.selected).length} of {lines.length} selected
              </Text>
              <ScrollView style={styles.list}>
                {lines.length === 0 ? (
                  <Text style={styles.hint}>No line items detected.</Text>
                ) : (
                  lines.map((line, i) => (
                    <View key={i} style={styles.lineRow}>
                      <TouchableOpacity
                        style={[styles.checkbox, line.selected && styles.checkboxOn]}
                        onPress={() => updateLine(i, { selected: !line.selected })}
                      >
                        {line.selected ? <Text style={styles.checkMark}>✓</Text> : null}
                      </TouchableOpacity>
                      <View style={styles.lineContent}>
                        <TextInput
                          style={styles.lineName}
                          value={line.name}
                          onChangeText={(t) => updateLine(i, { name: t })}
                          placeholder="Item name"
                          placeholderTextColor="#888"
                        />
                        <View style={styles.lineMetaRow}>
                          <TextInput
                            style={[styles.smallInput, { width: 54 }]}
                            value={String(line.quantity ?? 1)}
                            onChangeText={(t) => updateLine(i, { quantity: parseFloat(t) || 1 })}
                            keyboardType="numeric"
                          />
                          <View style={styles.zonePicker}>
                            {STORAGE_ZONES.map((z) => (
                              <TouchableOpacity
                                key={z}
                                style={[
                                  styles.zoneChip,
                                  line.storageZone === z && styles.zoneChipActive,
                                ]}
                                onPress={() => updateLine(i, { storageZone: z as StorageZone })}
                              >
                                <Text
                                  style={[
                                    styles.zoneChipText,
                                    line.storageZone === z && styles.zoneChipTextActive,
                                  ]}
                                >
                                  {STORAGE_ZONE_LABELS[z]}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                        {line.category ? (
                          <Text style={styles.categoryHint}>{line.category}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => setResult(null)}
                  disabled={submitting}
                >
                  <Text style={styles.btnSecondaryText}>Start over</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnPrimary, submitting && { opacity: 0.5 }]}
                  onPress={handleImport}
                  disabled={submitting}
                >
                  <Text style={styles.btnPrimaryText}>
                    {submitting ? 'Adding…' : `Add ${lines.filter((l) => l.selected).length}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#FFBD73', fontSize: 20, fontWeight: '700' },
  close: { color: '#aaa', fontSize: 20, padding: 4 },
  merchant: { color: '#fff', fontSize: 15, fontWeight: '600', marginTop: 6 },
  subtitle: { color: '#aaa', fontSize: 12, marginVertical: 6 },
  hint: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  center: { padding: 24, alignItems: 'center', gap: 12 },
  status: { color: '#ccc' },
  error: { color: '#ff6b6b', fontSize: 14, textAlign: 'center' },
  list: { marginTop: 8, maxHeight: 460 },
  lineRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  checkboxOn: { backgroundColor: '#FFBD73', borderColor: '#FFBD73' },
  checkMark: { color: '#202020', fontWeight: '700' },
  lineContent: { flex: 1, gap: 4 },
  lineName: {
    color: '#fff',
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    paddingVertical: 4,
  },
  lineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  smallInput: {
    color: '#fff',
    backgroundColor: '#333',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
  },
  zonePicker: { flexDirection: 'row', gap: 4, flex: 1 },
  zoneChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  zoneChipActive: { backgroundColor: '#FFBD73' },
  zoneChipText: { color: '#ccc', fontSize: 11 },
  zoneChipTextActive: { color: '#202020', fontWeight: '600' },
  categoryHint: { color: '#888', fontSize: 11, marginTop: 2 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFBD73',
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#202020', fontWeight: '600', fontSize: 15 },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#444',
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#ccc', fontWeight: '600', fontSize: 15 },
});
