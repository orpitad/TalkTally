import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Audio from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing, radius, shadow } from "@/src/theme";
import { PHONEME_CATEGORIES } from "@/src/data/phonemes";
import { api } from "@/src/api";
import { sessionStore } from "@/src/state";

type Phase = "idle" | "recording" | "processing" | "reviewed";

export default function Practice() {
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const category = useMemo(
    () => PHONEME_CATEGORIES.find((c) => c.id === categoryId) ?? PHONEME_CATEGORIES[0],
    [categoryId]
  );
  const targets = category.targets;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(0); // 0..1 real-time bubble size
  const [transcript, setTranscript] = useState<string>("");
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [autoCorrect, setAutoCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lastUriRef = useRef<string | null>(null);

  const recorder = Audio.useAudioRecorder(
    { ...Audio.RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true },
    (s) => {
      const meter = (s as any).metering;
      if (typeof meter === "number") {
        const norm = Math.max(0, Math.min(1, (meter + 60) / 54));
        setLevel(norm);
      }
    }
  );

  useEffect(() => {
    (async () => {
      const p = await Audio.getRecordingPermissionsAsync();
      if (!p.granted) {
        await Audio.requestRecordingPermissionsAsync();
      }
      await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      sessionStore.start(category);
    })();
    return () => sessionStore.clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = targets[index];

  const resetPerTarget = () => {
    setTranscript("");
    setMatchScore(null);
    setAutoCorrect(null);
    setError(null);
    setLevel(0);
    lastUriRef.current = null;
  };

  const startRecording = useCallback(async () => {
    resetPerTarget();
    try {
      await recorder.prepareToRecordAsync();
      await recorder.record();
      setPhase("recording");
    } catch (e: any) {
      setError(`Mic error: ${e?.message ?? "unknown"}`);
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    try {
      await recorder.stop();
    } catch {}
    setPhase("processing");
    const uri = recorder.uri;
    lastUriRef.current = uri ?? null;
    if (!uri) {
      setError("No recording captured");
      setPhase("idle");
      return;
    }
    try {
      let base64 = "";
      let ext = Platform.OS === "web" ? "webm" : "m4a";
      if (Platform.OS === "web") {
        const r = await fetch(uri);
        const blob = await r.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.split(",")[1] || "");
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        // guess ext from mime
        if (blob.type.includes("webm")) ext = "webm";
        else if (blob.type.includes("mp4")) ext = "mp4";
        else if (blob.type.includes("wav")) ext = "wav";
      } else {
        base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      }
      const result = await api.transcribe(base64, ext, current.word);
      setTranscript(result.transcript);
      setMatchScore(result.match_score);
      setAutoCorrect(result.correct);
      lastUriRef.current = uri;
      // stash base64 for later save
      (current as any).__lastBase64 = base64;
      (current as any).__lastExt = ext;
      setPhase("reviewed");
    } catch (e: any) {
      setError(`Transcription failed: ${e?.message ?? "unknown"}`);
      setPhase("reviewed"); // still allow manual score
    }
  }, [current, recorder]);

  const markAndNext = useCallback(
    (correct: boolean) => {
      const b64 = (current as any).__lastBase64 as string | undefined;
      const ext = (current as any).__lastExt as string | undefined;
      sessionStore.addTarget(current, correct, transcript, b64 || "", ext || "m4a");
      if (index + 1 >= targets.length) {
        finishSession();
      } else {
        setIndex((i) => i + 1);
        resetPerTarget();
        setPhase("idle");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [current, transcript, index]
  );

  const skipTarget = useCallback(() => {
    sessionStore.addTarget(current, false, "", "", "m4a");
    if (index + 1 >= targets.length) {
      finishSession();
    } else {
      setIndex((i) => i + 1);
      resetPerTarget();
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, index]);

  async function finishSession() {
    setSaving(true);
    try {
      const profileId = await AsyncStorage.getItem("talktally.profileId");
      const active = sessionStore.get();
      if (!profileId || !active) return;
      const summary = await api.createSession({
        profile_id: profileId,
        category_id: active.category.id,
        category_label: active.category.label,
        targets: active.targets,
      });
      sessionStore.setSummary(summary);
      sessionStore.clear();
      router.replace({ pathname: "/scoreboard", params: { sessionId: summary.id } });
    } catch (e: any) {
      setError(`Save failed: ${e?.message ?? "unknown"}`);
    } finally {
      setSaving(false);
    }
  }

  const progress = (index + (phase === "reviewed" ? 1 : 0)) / targets.length;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.headerRow}>
        <Pressable testID="practice-close" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {index + 1}/{targets.length} · {category.label}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.coachTip}>
        <Ionicons name="bulb" size={16} color={colors.onBrandSoft} />
        <Text style={styles.coachText}>{current.coaching}</Text>
      </View>

      <View style={styles.cardWrap}>
        <View style={[styles.card, { backgroundColor: category.color }]} testID="flashcard">
          <Text style={styles.cardEmoji}>{current.emoji}</Text>
          <Text style={styles.cardWord}>{current.word}</Text>
          <View style={styles.phonemeBadge}>
            <Text style={styles.phonemeText}>{current.target_phoneme}</Text>
          </View>
        </View>
      </View>

      <View style={styles.recordArea}>
        {phase === "idle" && (
          <Pressable testID="record-button" style={styles.recordBtn} onPress={startRecording}>
            <View style={styles.recordDot} />
            <Text style={styles.recordText}>Tap to Record</Text>
          </Pressable>
        )}

        {phase === "recording" && (
          <Pressable testID="stop-button" style={styles.stopBtn} onPress={stopRecording}>
            <View
              style={[
                styles.bubble,
                {
                  transform: [{ scale: 1 + level * 0.8 }],
                  opacity: 0.35 + level * 0.5,
                },
              ]}
            />
            <Ionicons name="stop" size={32} color={colors.onError} />
            <Text style={styles.stopText}>Listening… tap to stop</Text>
          </Pressable>
        )}

        {phase === "processing" && (
          <View style={styles.processing} testID="processing-indicator">
            <ActivityIndicator color={colors.brand} size="large" />
            <Text style={styles.processingText}>Transcribing with Whisper…</Text>
          </View>
        )}

        {phase === "reviewed" && (
          <View style={styles.reviewArea} testID="review-area">
            <View style={styles.scoreBox}>
              <Text style={styles.scoreLabel}>Heard</Text>
              <Text style={styles.transcript} testID="transcript-text">
                {transcript ? `"${transcript}"` : "— (no speech detected)"}
              </Text>
              {matchScore !== null && (
                <View style={styles.scorePillRow}>
                  <View
                    style={[
                      styles.scorePill,
                      { backgroundColor: autoCorrect ? colors.successSoft : colors.brandSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scorePillText,
                        { color: autoCorrect ? colors.success : colors.onBrandSoft },
                      ]}
                    >
                      AI: {matchScore}% match {autoCorrect ? "✓" : ""}
                    </Text>
                  </View>
                </View>
              )}
              {error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            <View style={styles.actionRow}>
              <Pressable testID="skip-button" style={[styles.actionBtn, styles.skipBtn]} onPress={skipTarget}>
                <Ionicons name="close-circle" size={22} color={colors.onWarning} />
                <Text style={[styles.actionText, { color: colors.onWarning }]}>Skip</Text>
              </Pressable>
              <Pressable
                testID="correct-button"
                style={[styles.actionBtn, styles.correctBtn]}
                onPress={() => markAndNext(true)}
              >
                <Ionicons name="checkmark-circle" size={22} color={colors.onSuccess} />
                <Text style={[styles.actionText, { color: colors.onSuccess }]}>Correct</Text>
              </Pressable>
            </View>

            <Pressable testID="retry-button" style={styles.retryBtn} onPress={startRecording}>
              <Ionicons name="refresh" size={18} color={colors.brand} />
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>

      {saving && (
        <View style={styles.savingOverlay} testID="saving-overlay">
          <ActivityIndicator color={colors.onBrand} />
          <Text style={styles.savingText}>Saving session…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
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
  progressTrack: { height: 8, backgroundColor: colors.surface3, borderRadius: radius.pill, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.brand, borderRadius: radius.pill },
  progressText: { textAlign: "center", fontSize: 12, color: colors.onSurfaceMuted, marginTop: 6, fontWeight: "700" },
  coachTip: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  coachText: { color: colors.onBrandSoft, fontSize: 13, fontWeight: "600", flex: 1 },
  cardWrap: { paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  card: {
    borderRadius: radius.lg,
    paddingVertical: spacing.xxxl,
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  cardEmoji: { fontSize: 84 },
  cardWord: { fontSize: 42, fontWeight: "800", color: colors.onSurface, letterSpacing: 0.5 },
  phonemeBadge: {
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  phonemeText: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  recordArea: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  recordBtn: {
    height: 76,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadow.card,
  },
  recordDot: { width: 18, height: 18, borderRadius: radius.pill, backgroundColor: colors.onBrand },
  recordText: { color: colors.onBrand, fontSize: 18, fontWeight: "800" },
  stopBtn: {
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  bubble: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: radius.pill,
    backgroundColor: colors.error,
  },
  stopText: { color: colors.onError, fontWeight: "700", marginTop: spacing.sm, fontSize: 12 },
  processing: { alignItems: "center", gap: spacing.md },
  processingText: { color: colors.onSurfaceMuted, fontSize: 14 },
  reviewArea: { width: "100%", gap: spacing.lg },
  scoreBox: {
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  scoreLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: colors.onSurfaceMuted, textTransform: "uppercase" },
  transcript: { fontSize: 20, fontWeight: "700", color: colors.onSurface, marginTop: spacing.sm },
  scorePillRow: { flexDirection: "row", marginTop: spacing.md, gap: spacing.sm },
  scorePill: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  scorePillText: { fontWeight: "800", fontSize: 12 },
  errorText: { color: colors.error, marginTop: spacing.sm, fontSize: 12 },
  actionRow: { flexDirection: "row", gap: spacing.md },
  actionBtn: {
    flex: 1,
    height: 60,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    ...shadow.soft,
  },
  skipBtn: { backgroundColor: colors.warning },
  correctBtn: { backgroundColor: colors.success },
  actionText: { fontWeight: "800", fontSize: 16 },
  retryBtn: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.xs, padding: spacing.sm },
  retryText: { color: colors.brand, fontWeight: "700" },
  savingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  savingText: { color: "#fff", fontWeight: "700" },
});
