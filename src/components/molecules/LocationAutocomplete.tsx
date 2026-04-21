import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { useAppTheme } from "../../theme/useAppTheme";

export type PlaceSelection = {
  description: string;
  placeId: string;
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onSelect: (place: PlaceSelection | null) => void;
  placeholder?: string;
};

export default function LocationAutocomplete({
  value,
  onSelect,
  placeholder = "e.g. Bangalore, Mumbai, New York",
}: Props) {
  const theme = useAppTheme();
  const ref = useRef<any>(null);

  // When parent clears value (e.g. "Negotiate Again"), clear the internal text
  useEffect(() => {
    if (!value && ref.current) {
      ref.current.setAddressText("");
    }
  }, [value]);

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder={placeholder}
        fetchDetails
        debounce={300}
        enablePoweredByContainer={false}
        keepResultsAfterBlur={false}
        query={{
          key: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? "",
          language: "en",
          types: "(cities)",
        }}
        textInputProps={{
          placeholderTextColor: theme.placeholder,
          autoCorrect: false,
          autoCapitalize: "none",
          onChangeText: () => {
            // User is typing — clear any previously selected place
            onSelect(null);
          },
        }}
        onPress={(data, details = null) => {
          if (!details) return;
          onSelect({
            description: data.description,
            placeId: data.place_id,
            lat: details.geometry.location.lat,
            lng: details.geometry.location.lng,
          });
        }}
        styles={{
          textInputContainer: {
            backgroundColor: "transparent",
          },
          textInput: {
            height: 48,
            borderRadius: 12,
            paddingHorizontal: 16,
            fontSize: 16,
            color: theme.textPrimary,
            backgroundColor: theme.bgSecondary,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 0,
          },
          listView: {
            backgroundColor: theme.surface,
            borderRadius: 12,
            marginTop: 4,
            borderWidth: 1,
            borderColor: theme.border,
            zIndex: 999,
          },
          row: {
            backgroundColor: theme.surface,
            paddingVertical: 12,
            paddingHorizontal: 16,
          },
          description: {
            color: theme.textPrimary,
            fontSize: 14,
          },
          separator: {
            backgroundColor: theme.border,
            height: 1,
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 999,
  },
});
