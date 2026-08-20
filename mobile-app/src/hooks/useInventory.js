import { useCallback, useEffect, useState } from "react";
import { InventoryAPI } from "../services/api";

export default function useInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await InventoryAPI.list();
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (item) => {
      const created = await InventoryAPI.add(item);
      setItems((prev) => [...prev, created]);
      return created;
    },
    []
  );

  const removeItem = useCallback(async (id) => {
    await InventoryAPI.remove(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return { items, loading, error, refresh, addItem, removeItem };
}
