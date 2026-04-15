import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Compass } from "lucide-react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerStyle: { backgroundColor: '#0c0520' }, headerTintColor: '#fff' }} />
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Compass color="#a78bfa" size={48} />
        </View>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.subtitle}>This screen doesn&apos;t exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0c0520",
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 4,
  },
  link: {
    marginTop: 20,
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
  },
  linkText: {
    fontSize: 16,
    color: "#a78bfa",
    fontWeight: "600" as const,
  },
});
