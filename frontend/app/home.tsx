import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadow } from "@/src/theme";
import { PHONEME_CATEGORIES, ageCohortMinMonths } from "@/src/data/phonemes";
import { api, SessionSummary } from "@/src/api";
import { storage } from "@/src/utils/storage";

type Tab = "syllabus" | "history";

export default function Home() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("syllabus");
  const [profile, setProfile] = useState<{ id: string; name: string; cohort: string } | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    const [pid, pname, pcohort] = await Promise.all([
      AsyncStorage.getItem("talktally.profileId"),
      AsyncStorage.getItem("talktally.profileName"),
      AsyncStorage.getItem("talktally.profileCohort"),
    ]);
    if (!pid) {
      router.replace("/onboarding");
      return;
    }
    setProfile({ id: pid, name: pname || "Child", cohort: pcohort || "12-18M" });
    try {
      const s = await api.listSessions(pid);
      setSessions(s);
    } catch (e) {
      console.warn("Failed to load sessions", e);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  useEffect(() => {
    // First mount fallback
    loadAll();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  if (!profile || loading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center} testID="home-loading">
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const initials = profile.name.slice(0, 2).toUpperCase();
  const minMonths = ageCohortMinMonths(profile.cohort);
  const relevant = PHONEME_CATEGORIES.filter((c) => c.age_min_months <= minMonths + 6);
  const recommended = PHONEME_CATEGORIES.find((c) => c.age_min_months <= minMonths + 6) ?? PHONEME_CATEGORIES[0];

  const lowestCategory = (() => {
    if (!sessions.length) return null;
    const byCat: Record<string, { total: number; correct: number; label: string }> = {};
    sessions.forEach((s) => {
      const k = s.category_id;
      byCat[k] = byCat[k] || { total: 0, correct: 0, label: s.category_label };
      byCat[k].total += s.total_count;
      byCat[k].correct += s.correct_count;
    });
    let worst: { id: string; label: string; acc: number } | null = null;
    Object.entries(byCat).forEach(([id, v]) => {
      const acc = v.total ? Math.round((v.correct / v.total) * 100) : 100;
      if (!worst || acc < worst.acc) worst = { id, label: v.label, acc };
    });
    return worst;
  })();

  const smartRec = lowestCategory
    ? { label: lowestCategory.label, hint: `${lowestCategory.acc}% accuracy — let's boost it!` }
    : { label: recommended.label, hint: "Great starter set for this age." };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.hi} testID="home-greeting">Hi, {profile.name}</Text>
            <Text style={styles.cohortText}>Age cohort · {profile.cohort}</Text>
          </View>
          <Pressable
            testID="edit-profile-button"
            onPress={async () => {
              await AsyncStorage.multiRemove(["talktally.profileId", "talktally.profileName", "talktally.profileCohort"]);
              await storage.secureRemove("talktally.jwt");
              await storage.removeItem("talktally.userEmail");
              await storage.removeItem("talktally.userId");
              router.replace("/login");
            }}
            style={styles.editBtn}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.onSurface} />
          </Pressable>
        </View>

        {/* Recommendation card */}
        <LinearGradient
          colors={[colors.brand, colors.brandSoft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.recCard}
        >
          <Text style={styles.recBadge}>SMART TIP</Text>
          <Text style={styles.recTitle}>{smartRec.label}</Text>
          <Text style={styles.recHint}>{smartRec.hint}</Text>
          <Pressable
            testID="recommendation-cta"
            style={styles.recCta}
            onPress={() => router.push({ pathname: "/calibrate", params: { categoryId: lowestCategory?.id ?? recommended.id } })}
          >
            <Text style={styles.recCtaText}>Start Practice</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.brand} />
          </Pressable>
        </LinearGradient>

        {/* Segmented tabs */}
        <View style={styles.segment}>
          <Pressable
            testID="tab-syllabus"
            style={[styles.segmentBtn, tab === "syllabus" && styles.segmentBtnActive]}
            onPress={() => setTab("syllabus")}
          >
            <Text style={[styles.segmentText, tab === "syllabus" && styles.segmentTextActive]}>Syllabus</Text>
          </Pressable>
          <Pressable
            testID="tab-history"
            style={[styles.segmentBtn, tab === "history" && styles.segmentBtnActive]}
            onPress={() => setTab("history")}
          >
            <Text style={[styles.segmentText, tab === "history" && styles.segmentTextActive]}>
              History{sessions.length ? `  ·  ${sessions.length}` : ""}
            </Text>
          </Pressable>
        </View>

        {tab === "syllabus" ? (
          <View style={styles.list}>
            {relevant.map((c) => {
              const sessionCount = sessions.filter((s) => s.category_id === c.id).length;
              return (
                <Pressable
                  key={c.id}
                  testID={`category-${c.id}`}
                  style={[styles.catCard, { backgroundColor: c.color }]}
                  onPress={() => router.push({ pathname: "/calibrate", params: { categoryId: c.id } })}
                >
                  <View style={styles.catEmojiWrap}>
                    <Text style={styles.catEmoji}>{c.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catLabel}>{c.label}</Text>
                    <Text style={styles.catPhonemes}>{c.phoneme_group}</Text>
                    <Text style={styles.catDesc}>{c.description}</Text>
                  </View>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{sessionCount} logs</Text>
                    <Ionicons name="chevron-forward" size={20} color={colors.onSurface} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.list}>
            {sessions.length === 0 ? (
              <View style={styles.empty} testID="history-empty">
                <Text style={styles.emptyEmoji}>🐻</Text>
                <Text style={styles.emptyTitle}>No sessions yet</Text>
                <Text style={styles.emptyText}>Complete a lesson to see logs and playback here.</Text>
              </View>
            ) : (
              sessions.map((s) => (
                <Pressable
                  key={s.id}
                  testID={`session-${s.id}`}
                  style={styles.sessionCard}
                  onPress={() => router.push({ pathname: "/session/[id]", params: { id: s.id } })}
                >
                  <View
                    style={[
                      styles.scoreRing,
                      {
                        borderColor:
                          s.accuracy >= 80 ? colors.success : s.accuracy >= 50 ? colors.warning : colors.error,
                      },
                    ]}
                  >
                    <Text style={styles.scoreRingText}>{s.accuracy}%</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTitle}>{s.category_label}</Text>
                    <Text style={styles.sessionMeta}>
                      {s.correct_count}/{s.total_count} correct · {new Date(s.timestamp).toLocaleDateString()}
                    </Text>
                    <View style={styles.wordRow}>
                      {s.target_words.slice(0, 4).map((w, i) => (
                        <View key={i} style={styles.wordPill}>
                          <Text style={styles.wordPillText}>{w}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.onSurfaceMuted} />
                </Pressable>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  avatarText: { color: colors.onBrand, fontSize: 20, fontWeight: "800" },
  hi: { fontSize: 22, fontWeight: "800", color: colors.onSurface },
  cohortText: { fontSize: 13, color: colors.onSurfaceMuted, marginTop: 2 },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  recCard: {
    marginHorizontal: spacing.xl,
    padding: spacing.xl,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  recBadge: { color: colors.onBrand, fontSize: 11, fontWeight: "800", letterSpacing: 1.5, opacity: 0.9 },
  recTitle: { color: colors.onBrand, fontSize: 22, fontWeight: "800", marginTop: spacing.sm },
  recHint: { color: colors.onBrand, opacity: 0.95, fontSize: 14, marginTop: spacing.xs },
  recCta: {
    marginTop: spacing.lg,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recCtaText: { color: colors.brand, fontWeight: "800", fontSize: 15 },
  segment: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.xl,
    flexDirection: "row",
    backgroundColor: colors.surface3,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: spacing.md, alignItems: "center", borderRadius: radius.pill },
  segmentBtnActive: { backgroundColor: colors.surface2, ...shadow.soft },
  segmentText: { color: colors.onSurfaceMuted, fontWeight: "700" },
  segmentTextActive: { color: colors.onSurface },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.md },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
    ...shadow.soft,
  },
  catEmojiWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  catEmoji: { fontSize: 28 },
  catLabel: { fontSize: 17, fontWeight: "800", color: colors.onSurface },
  catPhonemes: { fontSize: 13, color: colors.onSurface, opacity: 0.8, marginTop: 2 },
  catDesc: { fontSize: 12, color: colors.onSurface, opacity: 0.7, marginTop: 4 },
  catBadge: { alignItems: "center", gap: 4 },
  catBadgeText: { fontSize: 11, fontWeight: "700", color: colors.onSurface },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface2,
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  scoreRing: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  scoreRingText: { fontWeight: "800", color: colors.onSurface, fontSize: 14 },
  sessionTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  sessionMeta: { fontSize: 12, color: colors.onSurfaceMuted, marginTop: 2 },
  wordRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  wordPill: {
    backgroundColor: colors.brandSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  wordPillText: { color: colors.onBrandSoft, fontSize: 11, fontWeight: "700" },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface },
  emptyText: { fontSize: 13, color: colors.onSurfaceMuted, textAlign: "center", paddingHorizontal: spacing.xl },
});
