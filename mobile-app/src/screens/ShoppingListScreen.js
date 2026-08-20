import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { ShoppingListAPI } from "../services/api";

export default function ShoppingListScreen() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => ShoppingListAPI.list().then(setList).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const purchase = async (id) => {
    await ShoppingListAPI.markPurchased(id);
    load();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Shopping List</Text>
      {loading && <Text>Loading...</Text>}
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => purchase(item.id)}>
            <Text style={item.status === "purchased" ? styles.purchased : styles.name}>{item.name}</Text>
            <Text style={styles.status}>{item.status}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading && <Text>Nothing predicted to run out soon. 🎉</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  name: { fontSize: 16 },
  purchased: { fontSize: 16, textDecorationLine: "line-through", color: "#999" },
  status: { fontSize: 14, color: "#666" },
});
