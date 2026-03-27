import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../services/supabase/supabase";

const HomeScreen = () => {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: "white" }}>HomeScreen</Text>
      <TouchableOpacity
        style={{
          backgroundColor: "tomato",
          padding: 10,
          margin: 16,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
        }}
        onPress={() => {
          supabase.auth.signOut();
        }}
      >
        <Text>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

export default HomeScreen;
