import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadow } from "@/src/theme";
import { api } from "@/src/api";

const COHORTS = [
  { id: "12-18M", label: "12–18 months", hint: "First words" },
  { id: "18-24M", label: "18–24 months", hint: "Word explosion" },
  { id: "24-30M", label: "24–30 months", hint: "Two-word combos" },
  { id: "30-36M", label: "30–36 months", hint: "Short phrases" },
];

export default function Onboarding() {
  const router = useRouter();
  const [name, setName] = useState("Child");
  const [cohort, setCohort] = useState<string>("12-18M");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = (name.trim() || "CH").slice(0, 2).toUpperCase();

  const onContinue = async () => {
    setError(null);
    setSaving(true);
    try {
      const profile = await api.createProfile(name.trim() || "Child", cohort);
      await AsyncStorage.multiSet([
        ["talktally.profileId", profile.id],
        ["talktally.profileName", profile.name],
        ["talktally.profileCohort", profile.age_cohort],
      ]);
      router.replace("/home");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={[colors.brandSoft, colors.surface]}
            style={styles.hero}
          >
            <View style={styles.avatarWrap}>
              <View style={styles.avatar} testID="onboarding-avatar">
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </View>
            <Text style={styles.title}>Welcome to TalkTally</Text>
            <Text style={styles.subtitle}>
              A warm speech companion for tiny voices. Let's set up your child's profile.
            </Text>
          </LinearGradient>

          <View style={styles.section}>
            <Text style={styles.label}>Child's first name</Text>
            <TextInput
              testID="onboarding-name-input"
              value={name}
              onChangeText={setName}
              placeholder="Child"
              placeholderTextColor={colors.onSurfaceMuted}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Age cohort</Text>
            {COHORTS.map((c) => {
              const selected = cohort === c.id;
              return (
                <Pressable
                  key={c.id}
                  testID={`cohort-${c.id}`}
                  onPress={() => setCohort(c.id)}
                  style={[styles.cohort, selected && styles.cohortSelected]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cohortLabel, selected && { color: colors.onBrand }]}>{c.label}</Text>
                    <Text style={[styles.cohortHint, selected && { color: colors.onBrand, opacity: 0.9 }]}>
                      {c.hint}
                    </Text>
                  </View>
                  <Ionicons
                    name={selected ? "checkmark-circle" : "ellipse-outline"}
                    size={26}
                    color={selected ? colors.onBrand : colors.borderStrong}
                  />
                </Pressable>
              );
            })}
          </View>

          {error && (
            <Text style={styles.error} testID="onboarding-error">
              {error}
            </Text>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            testID="onboarding-continue-button"
            style={[styles.cta, saving && { opacity: 0.7 }]}
            disabled={saving}
            onPress={onContinue}
          >
            {saving ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <>
                <Text style={styles.ctaText}>Continue</Text>
                <Ionicons name="arrow-forward" size={22} color={colors.onBrand} />
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingBottom: spacing.xxxl },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  avatarWrap: { marginBottom: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  avatarText: { color: colors.onBrand, fontSize: 32, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.onSurfaceMuted, textAlign: "center", lineHeight: 22 },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurfaceMuted,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 18,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  cohort: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  cohortSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  cohortLabel: { fontSize: 17, fontWeight: "700", color: colors.onSurface },
  cohortHint: { fontSize: 13, color: colors.onSurfaceMuted, marginTop: 2 },
  error: { color: colors.error, textAlign: "center", marginTop: spacing.lg, paddingHorizontal: spacing.xl },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
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
  ctaText: { color: colors.onBrand, fontSize: 18, fontWeight: "800", letterSpacing: 0.3 },
});
