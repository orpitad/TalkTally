import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadow } from "@/src/theme";
import { api, SessionDetail } from "@/src/api";

export default function Scoreboard() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionDetail | null>(null);

  useEffect(() => {
    (async () => {
      if (!sessionId) return;
      const s = await api.getSession(String(sessionId));
      setSession(s);
    })();
  }, [sessionId]);

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const ring = session.accuracy >= 80 ? colors.success : session.accuracy >= 50 ? colors.brand : colors.warning;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <LinearGradient colors={[colors.brandSoft, colors.surface]} style={styles.hero}>
        <Text style={styles.stars}>🎉 🌟 🎊</Text>
        <Text style={styles.doneTitle}>Lesson Complete!</Text>
        <Text style={styles.doneSub}>{session.category_label}</Text>

        <View style={[styles.ring, { borderColor: ring }]} testID="scoreboard-accuracy">
          <Text style={styles.ringAcc}>{session.accuracy}%</Text>
          <Text style={styles.ringLabel}>ACCURACY</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{session.correct_count}</Text>
            <Text style={styles.statLabel}>Correct</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{session.total_count}</Text>
            <Text style={styles.statLabel}>Targets</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{session.correct_count * 10}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.list}>
        <Text style={styles.listTitle}>Words practiced</Text>
        {session.targets.map((t, i) => (
          <View key={i} style={styles.targetRow}>
            <View style={[styles.dot, { backgroundColor: t.correct ? colors.success : colors.warning }]} />
            <Text style={styles.targetWord}>{t.word}</Text>
            <Text style={styles.targetTranscript} numberOfLines={1}>
              {t.transcript ? `"${t.transcript}"` : "—"}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable
          testID="scoreboard-done-button"
          style={styles.cta}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.ctaText}>Complete Lesson</Text>
          <Ionicons name="checkmark" size={22} color={colors.onBrand} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  stars: { fontSize: 30, letterSpacing: 6 },
  doneTitle: { fontSize: 28, fontWeight: "800", color: colors.onSurface, marginTop: spacing.sm },
  doneSub: { fontSize: 14, color: colors.onSurfaceMuted, marginBottom: spacing.xl },
  ring: {
    width: 160,
    height: 160,
    borderRadius: radius.pill,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface2,
    ...shadow.card,
  },
  ringAcc: { fontSize: 44, fontWeight: "800", color: colors.onSurface },
  ringLabel: { fontSize: 11, letterSpacing: 2, color: colors.onSurfaceMuted, fontWeight: "700" },
  statRow: {
    flexDirection: "row",
    marginTop: spacing.xl,
    backgroundColor: colors.surface2,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadow.soft,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  statLabel: { fontSize: 11, letterSpacing: 1, color: colors.onSurfaceMuted, fontWeight: "700" },
  divider: { width: 1, backgroundColor: colors.divider, marginVertical: 4 },
  list: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  listTitle: { fontSize: 13, fontWeight: "800", letterSpacing: 1, color: colors.onSurfaceMuted, marginBottom: spacing.sm, textTransform: "uppercase" },
  targetRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, gap: spacing.md },
  dot: { width: 12, height: 12, borderRadius: radius.pill },
  targetWord: { fontWeight: "800", color: colors.onSurface, fontSize: 16, minWidth: 100 },
  targetTranscript: { color: colors.onSurfaceMuted, fontSize: 13, flex: 1 },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.divider },
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
});
