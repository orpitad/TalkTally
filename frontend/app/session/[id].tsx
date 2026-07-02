import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Audio from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { colors, spacing, radius, shadow } from "@/src/theme";
import { api, SessionDetail } from "@/src/api";

export default function SessionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const playerRef = useRef<Audio.AudioPlayer | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const s = await api.getSession(String(id));
      setSession(s);
      await Audio.setAudioModeAsync({ playsInSilentMode: true });
    })();
    return () => {
      try {
        playerRef.current?.remove();
      } catch {}
    };
  }, [id]);

  const play = async (idx: number, base64: string, ext: string) => {
    if (!base64) return;
    try {
      try {
        playerRef.current?.remove();
      } catch {}
      let source: any;
      if (Platform.OS === "web") {
        source = { uri: `data:audio/${ext};base64,${base64}` };
      } else {
        const path = `${FileSystem.cacheDirectory}tt-clip-${idx}.${ext}`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
        source = { uri: path };
      }
      const p = Audio.createAudioPlayer(source);
      playerRef.current = p;
      setPlayingIdx(idx);
      p.play();
      // rough timeout to clear state
      setTimeout(() => setPlayingIdx((cur) => (cur === idx ? null : cur)), 3000);
    } catch (e) {
      setPlayingIdx(null);
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.headerRow}>
        <Pressable testID="session-back" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {session.category_label}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryAcc}>{session.accuracy}%</Text>
          <Text style={styles.summaryLabel}>ACCURACY</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summaryLine}>
            {session.correct_count}/{session.total_count} correct
          </Text>
          <Text style={styles.summaryLine}>{new Date(session.timestamp).toLocaleString()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.md }}>
        {session.targets.map((t, i) => {
          const hasAudio = !!t.audio_base64;
          return (
            <View key={i} style={styles.row} testID={`playback-row-${i}`}>
              <View style={[styles.dot, { backgroundColor: t.correct ? colors.success : colors.warning }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.word}>{t.word}</Text>
                <Text style={styles.phoneme}>{t.target_phoneme}</Text>
                {!!t.transcript && (
                  <Text style={styles.transcript} numberOfLines={2}>
                    "{t.transcript}"
                  </Text>
                )}
              </View>
              <Pressable
                testID={`play-${t.word.replace(/\s+/g, "-").toLowerCase()}`}
                disabled={!hasAudio}
                onPress={() => play(i, t.audio_base64 || "", t.audio_ext || "m4a")}
                style={[styles.playBtn, !hasAudio && { opacity: 0.35 }]}
              >
                <Ionicons name={playingIdx === i ? "pause" : "play"} size={20} color={colors.onBrand} />
                <Text style={styles.playText}>{hasAudio ? "PLAY" : "N/A"}</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
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
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "800", color: colors.onSurface },
  summary: {
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    ...shadow.soft,
  },
  summaryLeft: { alignItems: "center" },
  summaryAcc: { fontSize: 36, fontWeight: "800", color: colors.onBrandSoft },
  summaryLabel: { fontSize: 10, letterSpacing: 1.5, color: colors.onBrandSoft, fontWeight: "700" },
  summaryRight: { flex: 1, gap: 4 },
  summaryLine: { color: colors.onBrandSoft, fontSize: 13, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.soft,
  },
  dot: { width: 10, height: 10, borderRadius: radius.pill },
  word: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  phoneme: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  transcript: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 4, fontStyle: "italic" },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  playText: { color: colors.onBrand, fontWeight: "800", fontSize: 12, letterSpacing: 1 },
});
