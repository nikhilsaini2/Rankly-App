import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import AppName from "../../../components/atoms/AppName";
import { BARS, FEATURES } from "../../../constants/all";
import { colors } from "../../../theme/color";
import { styles } from "./styles";

const OnBoardingScreen = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <AppName size={30} />
      </View>

      {/* Glass Card */}
      <View style={styles.cardWrapper}>
        <LinearGradient
          colors={["rgba(20,15,40,0.95)", "rgba(10,10,30,0.95)"]}
          style={styles.card}
        >
          {/* subtle top light */}
          <View style={styles.topHighlight} />

          {/* Score section */}
          <View style={styles.scoreRow}>
            <View style={styles.ringOuter}>
              <View style={styles.ringInner}>
                <Text style={styles.score}>82</Text>
                <Text style={styles.ats}>ATS</Text>
              </View>
            </View>

            <View>
              <Text style={styles.title}>Resume Score</Text>
              <Text style={styles.meta}>SWE · Google · L4</Text>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>+19 pts gained</Text>
              </View>
            </View>
          </View>

          {/* Bars */}
          {BARS.map((item) => (
            <View key={item.label} style={styles.barRow}>
              <Text style={styles.barLabel}>{item.label}</Text>

              <View style={styles.barTrack}>
                <LinearGradient
                  colors={item.colors}
                  style={[styles.barFill, { width: `${item.value}%` }]}
                />
              </View>

              <Text style={styles.barValue}>{item.value}</Text>
            </View>
          ))}
        </LinearGradient>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureItem}>
            <View style={[styles.iconBox, { borderColor: f.color + "40" }]}>
              <Ionicons name={f.icon} size={18} color={f.color} />
            </View>

            <View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureSub}>{f.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={() => {}}>
        <LinearGradient
          colors={[colors.secondary, colors.secondaryDark]}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>Get Started - </Text>
          <Text style={styles.ctaText}>it's free </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.85} style={styles.ghostBtn}>
        <Text style={styles.ghostText}>I already have an account</Text>
      </TouchableOpacity>
    </View>
  );
};

export default OnBoardingScreen;
