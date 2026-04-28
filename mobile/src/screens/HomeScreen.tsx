import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { getNextRecommendation } from "../features/recommendationEngine";
import { useIsFocused } from "@react-navigation/native";
import { useSessionStore } from "../features/useSessionStore";
import { TODDLER_SESSION_STEPS } from "../features/sessionData";

export const HomeScreen = ({ navigation }: any) => {
  const [rec, setRec] = useState<any>(null);
  const isFocused = useIsFocused();
  const { currentStepIndex, resetSession, setSteps } = useSessionStore();

  useEffect(() => {
    if (isFocused) {
      getNextRecommendation().then(setRec);
    }
  }, [isFocused]);

  const handleStart = () => {
    if (currentStepIndex > 0) {
      // Resume existing session
      navigation.navigate("Session");
    } else {
      // Start new session - LOAD STEPS HERE
      resetSession();
      setSteps(TODDLER_SESSION_STEPS); // ✅ Load steps into store
      navigation.navigate("Session");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Good morning!</Text>

      {rec && (
        <View style={styles.aiCard}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SMART SUGGESTION</Text>
          </View>
          <Text style={styles.recTitle}>{rec.title}</Text>
          <Text style={styles.recReason}>{rec.reason}</Text>

          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>
              {currentStepIndex > 0 ? "Resume Session" : "Start New Session"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.footerText}>Keep talking, keep growing.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 25,
    justifyContent: "center",
  },
  greeting: {
    fontSize: 32,
    fontWeight: "900",
    color: "#1E293B",
    marginBottom: 20,
  },
  aiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 25,
    elevation: 10,
    shadowColor: "#6366F1",
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  badge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  badgeText: { color: "#6366F1", fontSize: 10, fontWeight: "900" },
  recTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  recReason: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 20,
  },
  startBtn: {
    backgroundColor: "#6366F1",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  startBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
  footerText: {
    textAlign: "center",
    marginTop: 30,
    color: "#94A3B8",
    fontStyle: "italic",
  },
});
