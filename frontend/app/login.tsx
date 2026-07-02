import { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, shadow } from "@/src/theme";
import { api } from "@/src/api";
import { storage } from "@/src/utils/storage";

type Step = "email" | "code";

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const validEmail = /\S+@\S+\.\S+/.test(email.trim());

  const requestCode = async () => {
    setError(null);
    if (!validEmail) {
      setError("Please enter a valid email.");
      return;
    }
    setLoading(true);
    try {
      await api.requestCode(email.trim().toLowerCase());
      setStep("code");
      setResendIn(30);
      setDigits(["", "", "", "", "", ""]);
      // Focus first digit
      setTimeout(() => inputs.current[0]?.focus(), 200);
    } catch (e: any) {
      setError(e?.message ?? "Could not send code");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.verifyCode(email.trim().toLowerCase(), code);
      await storage.secureSet("talktally.jwt", res.token);
      await storage.setItem("talktally.userEmail", res.user.email);
      await storage.setItem("talktally.userId", res.user.id);
      router.replace("/onboarding");
    } catch (e: any) {
      setError(e?.message ?? "Invalid code");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const onDigit = (v: string, i: number) => {
    // Support paste of full 6-digit string
    if (v.length > 1) {
      const clean = v.replace(/\D/g, "").slice(0, 6);
      const arr = ["", "", "", "", "", ""];
      for (let j = 0; j < clean.length; j++) arr[j] = clean[j];
      setDigits(arr);
      if (clean.length === 6) verify(clean);
      else inputs.current[Math.min(clean.length, 5)]?.focus();
      return;
    }
    const digit = v.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    if (digit && i < 5) inputs.current[i + 1]?.focus();
    if (i === 5 && digit) {
      const code = next.join("");
      if (code.length === 6) verify(code);
    }
  };

  const onBackspace = (i: number) => {
    if (!digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={[colors.brandSoft, colors.surface]} style={styles.hero}>
            <View style={styles.logo}>
              <Ionicons name="chatbubbles" size={32} color={colors.onBrand} />
            </View>
            <Text style={styles.title}>Welcome to TalkTally</Text>
            <Text style={styles.subtitle}>
              {step === "email"
                ? "Enter your email — we'll send you a sign-in code."
                : `We sent a 6-digit code to ${email.toLowerCase()}. (Check backend logs in dev mode.)`}
            </Text>
          </LinearGradient>

          {step === "email" ? (
            <View style={styles.section}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="login-email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="parent@example.com"
                placeholderTextColor={colors.onSurfaceMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="send"
                onSubmitEditing={requestCode}
              />
              {error && (
                <Text style={styles.error} testID="login-error">
                  {error}
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.section}>
              <Text style={styles.label}>Verification code</Text>
              <View style={styles.otpRow}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    testID={`otp-${i}`}
                    ref={(r) => {
                      inputs.current[i] = r;
                    }}
                    value={d}
                    onChangeText={(v) => onDigit(v, i)}
                    onKeyPress={(e) => {
                      if (e.nativeEvent.key === "Backspace") onBackspace(i);
                    }}
                    keyboardType="number-pad"
                    maxLength={i === 0 ? 6 : 1}
                    style={styles.otpBox}
                    selectionColor={colors.brand}
                    autoComplete={Platform.OS === "ios" ? "one-time-code" : "sms-otp"}
                    textContentType="oneTimeCode"
                  />
                ))}
              </View>
              {error && (
                <Text style={styles.error} testID="login-error">
                  {error}
                </Text>
              )}

              <View style={styles.resendRow}>
                <Pressable
                  testID="resend-code-button"
                  disabled={resendIn > 0 || loading}
                  onPress={requestCode}
                  hitSlop={12}
                >
                  <Text style={[styles.resendText, (resendIn > 0 || loading) && { opacity: 0.4 }]}>
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </Text>
                </Pressable>
                <Pressable
                  testID="change-email-button"
                  onPress={() => {
                    setStep("email");
                    setError(null);
                  }}
                  hitSlop={12}
                >
                  <Text style={styles.changeText}>Change email</Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step === "email" ? (
            <Pressable
              testID="send-code-button"
              style={[styles.cta, (!validEmail || loading) && { opacity: 0.5 }]}
              disabled={!validEmail || loading}
              onPress={requestCode}
            >
              {loading ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <>
                  <Text style={styles.ctaText}>Send Code</Text>
                  <Ionicons name="arrow-forward" size={22} color={colors.onBrand} />
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              testID="verify-code-button"
              style={[styles.cta, (digits.join("").length < 6 || loading) && { opacity: 0.5 }]}
              disabled={digits.join("").length < 6 || loading}
              onPress={() => verify(digits.join(""))}
            >
              {loading ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <>
                  <Text style={styles.ctaText}>Verify & Continue</Text>
                  <Ionicons name="checkmark" size={22} color={colors.onBrand} />
                </>
              )}
            </Pressable>
          )}
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
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadow.card,
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.onSurfaceMuted, textAlign: "center", lineHeight: 20 },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xl },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.onSurfaceMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 17,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },
  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  otpBox: {
    flex: 1,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    color: colors.onSurface,
    ...shadow.soft,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  resendText: { color: colors.brand, fontWeight: "700", fontSize: 14 },
  changeText: { color: colors.onSurfaceMuted, fontWeight: "700", fontSize: 14 },
  error: { color: colors.error, fontSize: 13, marginTop: spacing.md, textAlign: "center" },
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
  ctaText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
});
