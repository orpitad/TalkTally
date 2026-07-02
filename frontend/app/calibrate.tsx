import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Audio from "expo-audio";
import { colors, spacing, radius, shadow } from "@/src/theme";

const BARS = 18;

export default function Calibrate() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [running, setRunning] = useState(false);
  const [levels, setLevels] = useState<number[]>(new Array(BARS).fill(0));
  const [floor, setFloor] = useState<number | null>(null);
  const [status, setStatus] = useState("Tap Start to measure your room");
  const rmsHistory = useRef<number[]>([]);

  const recorder = Audio.useAudioRecorder(
    { ...Audio.RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true },
    (s) => {
      const meter = (s as any).metering;
      if (typeof meter === "number") {
        rmsHistory.current.push(meter);
        // meter is in dB (roughly -160..0). Map to 0..1
        const norm = Math.max(0, Math.min(1, (meter + 60) / 54));
        setLevels((prev) => {
          const next = [...prev.slice(1), norm];
          return next;
        });
      }
    }
  );

  useEffect(() => {
    (async () => {
      const p = await Audio.requestRecordingPermissionsAsync();
      setPermission(p.granted ? "granted" : "denied");
      if (p.granted) {
        await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
    })();
  }, []);

  const start = useCallback(async () => {
    if (permission !== "granted") {
      const p = await Audio.requestRecordingPermissionsAsync();
      if (!p.granted) {
        setPermission("denied");
        return;
      }
      setPermission("granted");
    }
    rmsHistory.current = [];
    setFloor(null);
    setStatus("Listening… hold still for 2 seconds");
    setRunning(true);
    try {
      await recorder.prepareToRecordAsync();
      await recorder.record();
      setTimeout(async () => {
        try {
          await recorder.stop();
        } catch {}
        const samples = rmsHistory.current.filter((n) => Number.isFinite(n));
        const peak = samples.length ? Math.max(...samples) : -60;
        setFloor(peak);
        setStatus("Room calibrated — you're set!");
        setRunning(false);
      }, 2000);
    } catch (e: any) {
      setStatus(`Mic error: ${e?.message ?? "unknown"}`);
      setRunning(false);
    }
  }, [permission, recorder]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.headerRow}>
        <Pressable testID="calibrate-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Room Calibration</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>Shh… let's listen to your room</Text>
        <Text style={styles.subtitle}>
          We'll measure background noise so we only respond to your child's voice.
        </Text>

        <View style={styles.meterCard}>
          <View style={styles.bars}>
            {levels.map((l, i) => {
              const height = 12 + l * 88;
              const barColor =
                l > 0.75 ? colors.error : l > 0.5 ? colors.warning : l > 0.15 ? colors.brand : colors.success;
              return <View key={i} style={[styles.bar, { height, backgroundColor: barColor }]} />;
            })}
          </View>
          <View style={styles.readoutRow}>
            <Text style={styles.readoutLabel}>Room floor</Text>
            <Text style={styles.readoutValue} testID="calibration-floor">
              {floor === null ? "— dB" : `${floor.toFixed(0)} dB`}
            </Text>
          </View>
          <Text style={styles.status} testID="calibration-status">
            {status}
          </Text>
        </View>

        {permission === "denied" && (
          <Text style={styles.permErr} testID="mic-permission-error">
            Microphone permission denied. Please enable it in system settings.
          </Text>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          testID="calibrate-start-button"
          style={[styles.cta, running && { opacity: 0.5 }]}
          disabled={running}
          onPress={start}
        >
          {running ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <>
              <Ionicons name="mic" size={22} color={colors.onBrand} />
              <Text style={styles.ctaText}>{floor === null ? "Calibrate Room" : "Recalibrate"}</Text>
            </>
          )}
        </Pressable>
        <Pressable
          testID="calibrate-continue-button"
          disabled={floor === null}
          style={[styles.secondary, floor === null && { opacity: 0.4 }]}
          onPress={() => router.push({ pathname: "/practice", params: { categoryId: String(categoryId ?? "") } })}
        >
          <Text style={styles.secondaryText}>Continue to Practice</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.brand} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: colors.onSurface },
  body: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  title: { fontSize: 24, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.onSurfaceMuted, lineHeight: 20, marginBottom: spacing.xl },
  meterCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 120,
    marginBottom: spacing.lg,
  },
  bar: { flex: 1, marginHorizontal: 2, borderRadius: 3 },
  readoutRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  readoutLabel: { color: colors.onSurfaceMuted, fontSize: 12, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  readoutValue: { color: colors.onSurface, fontWeight: "800", fontSize: 16 },
  status: { marginTop: spacing.md, color: colors.onSurfaceMuted, fontSize: 13 },
  permErr: { color: colors.error, marginTop: spacing.lg, fontSize: 13 },
  footer: { padding: spacing.xl, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider },
  cta: {
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    ...shadow.card,
  },
  ctaText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
  secondary: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.brand,
  },
  secondaryText: { color: colors.brand, fontSize: 15, fontWeight: "800" },
});
