import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text, View, StyleSheet } from "react-native";
import { RecipesAPI } from "../services/api";
import useInventory from "../hooks/useInventory";

export default function RecipesScreen() {
  const { items } = useInventory();
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    setLoading(true);
    RecipesAPI.suggestions(items.map((i) => i.name))
      .then(setRecipes)
      .finally(() => setLoading(false));
  }, [items]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Recipe Ideas</Text>
      {loading && <Text>Cooking up ideas...</Text>}
      <FlatList
        data={recipes}
        keyExtractor={(r, idx) => r.id ?? String(idx)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.recipeTitle}>{item.title}</Text>
            <Text style={styles.matched}>Uses: {item.matchedItems?.join(", ")}</Text>
            {item.youtubeVideoId && (
              <Text style={styles.video}>▶ Tutorial: youtube.com/watch?v={item.youtubeVideoId}</Text>
            )}
          </View>
        )}
        ListEmptyComponent={!loading && <Text>No suggestions yet — add some inventory first.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  card: { padding: 12, borderRadius: 8, backgroundColor: "#f4f4f4", marginBottom: 10 },
  recipeTitle: { fontSize: 18, fontWeight: "600" },
  matched: { color: "#555", marginTop: 4 },
  video: { color: "#0066cc", marginTop: 6 },
});
