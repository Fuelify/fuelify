import { useCallback, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (barcode: string) => void;
}

export function BarcodeScanner({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manual, setManual] = useState('');

  // Reset the one-shot gate whenever we reopen
  if (!visible && scannedRef.current) scannedRef.current = false;

  const handleScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (scannedRef.current) return;
      scannedRef.current = true;
      onScanned(result.data);
      onClose();
    },
    [onClose, onScanned],
  );

  const submitManual = () => {
    const code = manual.trim();
    if (!code) return;
    setManual('');
    setManualEntry(false);
    onScanned(code);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {manualEntry ? (
          <View style={styles.manualWrap}>
            <Text style={styles.title}>Enter barcode</Text>
            <TextInput
              style={styles.input}
              placeholder="Barcode (e.g. 5449000000996)"
              placeholderTextColor="#888"
              value={manual}
              onChangeText={setManual}
              keyboardType="numeric"
              autoFocus
            />
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setManualEntry(false)}
              >
                <Text style={styles.btnSecondaryText}>Back to camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, !manual.trim() && { opacity: 0.4 }]}
                onPress={submitManual}
                disabled={!manual.trim()}
              >
                <Text style={styles.btnPrimaryText}>Look up</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : !permission ? (
          <View style={styles.permissionWrap}>
            <Text style={styles.permissionText}>Initialising camera…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={styles.permissionWrap}>
            <Text style={styles.permissionText}>
              We need camera access to scan barcodes.
            </Text>
            <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
              <Text style={styles.btnPrimaryText}>Grant permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
              }}
              onBarcodeScanned={handleScanned}
            />
            <View style={styles.overlay}>
              <View style={styles.overlayFrame} />
              <Text style={styles.overlayHint}>Point camera at a barcode</Text>
              <View style={styles.overlayActions}>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={() => setManualEntry(true)}
                >
                  <Text style={styles.btnSecondaryText}>Enter manually</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={onClose}>
                  <Text style={styles.btnSecondaryText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  overlayFrame: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: '#FFBD73',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  overlayHint: {
    color: '#fff',
    marginTop: 20,
    fontSize: 15,
  },
  overlayActions: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  permissionWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  manualWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 12,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 12 },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FFBD73',
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#202020', fontWeight: '600', fontSize: 15 },
  btnSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  btnSecondaryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  cancel: { padding: 12, alignItems: 'center' },
  cancelText: { color: '#aaa', fontSize: 14 },
});
