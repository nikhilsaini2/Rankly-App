import React, { Component, ErrorInfo, ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AppTheme } from "../theme";
import { useAppTheme } from "../theme/useAppTheme";

type Props = { children: ReactNode };
type State = { err: Error | null };

type InnerProps = Props & { theme: AppTheme };

class ErrorBoundaryInner extends Component<InnerProps, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(_e: Error, _i: ErrorInfo) {}

  render() {
    const { theme } = this.props;
    const styles = createStyles(theme);

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

export function ErrorBoundary({ children }: Props) {
  const theme = useAppTheme();
  return <ErrorBoundaryInner theme={theme}>{children}</ErrorBoundaryInner>;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: "center",
      padding: 24,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: "800",
      marginBottom: 8,
    },
    sub: { color: theme.textSecondary, marginBottom: 24 },
    btn: {
      alignSelf: "flex-start",
      backgroundColor: theme.primary,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 12,
    },
    btnText: { color: "#FFFFFF", fontWeight: "700" },
  });
}
