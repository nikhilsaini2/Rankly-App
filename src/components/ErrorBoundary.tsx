import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors } from "../theme/color";

type Props = { children: ReactNode };
type State = { err: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(_e: Error, _i: ErrorInfo) {}

  render() {
    if (this.state.err) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.sub}>{this.state.err.message}</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ err: null })}
          >
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
  },
  sub: { color: colors.textSecondary, marginBottom: 24 },
  btn: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  btnText: { color: colors.textPrimary, fontWeight: "700" },
});
