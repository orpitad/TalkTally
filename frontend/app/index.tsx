import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "@/src/theme";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/api";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.secureGet<string>("talktally.jwt", "");
        if (!token) {
          router.replace("/login");
          return;
        }
        // Validate token (also refreshes user record)
        try {
          await api.me();
        } catch {
          await storage.secureRemove("talktally.jwt");
          router.replace("/login");
          return;
        }
        const profileId = await AsyncStorage.getItem("talktally.profileId");
        router.replace(profileId ? "/home" : "/onboarding");
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return (
    <View style={styles.container} testID="boot-screen">
      <ActivityIndicator color={colors.brand} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
});
