import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { colors } from "../../theme/color";
import { truncateFilename } from "../../utils/format";

type Props = {
  route: {
    params: {
      url: string;
      fileName: string;
    };
  };
  navigation: any;
};

export default function PdfViewerScreen({ route, navigation }: Props) {
  const { url, fileName } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const insets = useSafeAreaInsets();

  const googleDocsUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;

  useFocusEffect(
    React.useCallback(() => {
      // Reset state when screen comes into focus
      setLoading(true);
      setError(false);
    }, []),
  );

  const handleGoBack = () => {
    navigation.goBack();
  };

  const renderLoading = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text
        style={{
          marginTop: 16,
          color: colors.textSecondary,
          fontSize: 16,
          textAlign: "center",
        }}
      >
        Loading PDF...
      </Text>
    </View>
  );

  const renderError = () => (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
        padding: 32,
      }}
    >
      <Ionicons
        name="document-text-outline"
        size={64}
        color={colors.textMuted}
        style={{ marginBottom: 16 }}
      />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 18,
          fontWeight: "600",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Unable to preview this PDF
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 14,
          textAlign: "center",
          marginBottom: 24,
          lineHeight: 20,
        }}
      >
        The file may still be loading or the format might not be supported.
        Please try again.
      </Text>
      <TouchableOpacity
        onPress={handleGoBack}
        style={{
          backgroundColor: colors.primary,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: "600",
          }}
        >
          Go Back
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (error) {
    return renderError();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Custom Header */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          style={{
            marginRight: 12,
            padding: 4,
          }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 16,
              fontWeight: "600",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {truncateFilename(fileName)}
          </Text>
        </View>
      </View>

      {/* WebView */}
      <WebView
        source={{ uri: googleDocsUrl }}
        style={{ flex: 1 }}
        startInLoadingState={true}
        renderLoading={renderLoading}
        onError={() => {
          console.error("[PdfViewer] WebView error");
          setError(true);
          setLoading(false);
        }}
        onHttpError={() => {
          console.error("[PdfViewer] WebView HTTP error");
          setError(true);
          setLoading(false);
        }}
        onLoad={() => {
          console.log("[PdfViewer] WebView loaded successfully");
          setLoading(false);
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        scalesPageToFit={true}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
