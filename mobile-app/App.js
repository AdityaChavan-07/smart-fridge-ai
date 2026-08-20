import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import InventoryScreen from "./src/screens/InventoryScreen";
import RecipesScreen from "./src/screens/RecipesScreen";
import ShoppingListScreen from "./src/screens/ShoppingListScreen";

const Stack = createNativeStackNavigator();

// This same app targets both the fridge display (large touch screen) and the
// mobile companion app — layout components should stay responsive to both.
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Inventory">
        <Stack.Screen name="Inventory" component={InventoryScreen} />
        <Stack.Screen name="Recipes" component={RecipesScreen} />
        <Stack.Screen name="ShoppingList" component={ShoppingListScreen} options={{ title: "Shopping List" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
