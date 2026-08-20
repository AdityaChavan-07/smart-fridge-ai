import { FlatList, SafeAreaView, Text, View, StyleSheet, Button } from "react-native";
import useInventory from "../hooks/useInventory";

export default function InventoryScreen({ navigation }) {
  const { items, loading, error, refresh } = useInventory();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Inventory</Text>

      {loading && <Text>Loading...</Text>}
      {error && <Text style={styles.error}>Couldn't load inventory. Pull to retry.</Text>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        onRefresh={refresh}
        refreshing={loading}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQty}>
              {item.quantity} {item.unit}
            </Text>
          </View>
        )}
        ListEmptyComponent={!loading && <Text>No items yet. Add something to your fridge!</Text>}
      />

      <View style={styles.actions}>
        <Button title="Recipe Ideas" onPress={() => navigation.navigate("Recipes")} />
        <Button title="Shopping List" onPress={() => navigation.navigate("ShoppingList")} />
      </View>
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
  itemName: { fontSize: 16 },
  itemQty: { fontSize: 16, color: "#666" },
  error: { color: "red", marginBottom: 8 },
  actions: { flexDirection: "row", justifyContent: "space-around", marginTop: 16 },
});
