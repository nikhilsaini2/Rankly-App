import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Clipboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useProfile } from "../../hooks/index";
import { generateGeminiText } from "../../services/gemini";
import { supabase } from "../../services/supabase";
import { colors } from "../../theme/color";
import { parseGeminiJson } from "../../utils/gemini";

interface SalaryAnalysis {
  verdict: "Below Market" | "Fair Offer" | "Above Market";
  marketMin: number;
  marketMedian: number;
  marketMax: number;
  percentageDiff: number;
  suggestedAsk: number;
  leveragePoints: string[];
  negotiationScript: string;
  emailTemplate: string;
  tactics: string[];
}

interface HistoryItem {
  id: string;
  job_title: string;
  company: string | null;
  offered_salary: number;
  currency: string;
  experience: string;
  location: string | null;
  industries: string[];
  verdict: string;
  market_min: number;
  market_median: number;
  market_max: number;
  suggested_ask: number;
  percentage_diff: number;
  leverage_points: string[];
  negotiation_script: string;
  email_template: string;
  tactics: string[];
  created_at: string;
}

type UnifiedSalaryData = SalaryAnalysis | HistoryItem;

// Helper functions to safely access properties
const getMarketMin = (data: UnifiedSalaryData): number =>
  "market_min" in data ? data.market_min : data.marketMin;

const getMarketMedian = (data: UnifiedSalaryData): number =>
  "market_median" in data ? data.market_median : data.marketMedian;

const getMarketMax = (data: UnifiedSalaryData): number =>
  "market_max" in data ? data.market_max : data.marketMax;

const getPercentageDiff = (data: UnifiedSalaryData): number =>
  "percentage_diff" in data ? data.percentage_diff : data.percentageDiff;

const getSuggestedAsk = (data: UnifiedSalaryData): number =>
  "suggested_ask" in data ? data.suggested_ask : data.suggestedAsk;

const getLeveragePoints = (data: UnifiedSalaryData): string[] =>
  "leverage_points" in data ? data.leverage_points : data.leveragePoints;

const getNegotiationScript = (data: UnifiedSalaryData): string =>
  "negotiation_script" in data
    ? data.negotiation_script
    : data.negotiationScript;

const getEmailTemplate = (data: UnifiedSalaryData): string =>
  "email_template" in data ? data.email_template : data.emailTemplate;

const getTactics = (data: UnifiedSalaryData): string[] => {
  if ("tactics" in data) {
    return data.tactics;
  }
  return [];
};

type Phase = "input" | "loading" | "results";

const loadingMessages = [
  "Researching market rates...",
  "Calculating your leverage...",
  "Crafting negotiation tactics...",
  "Preparing your script...",
];

export default function SalaryNegotiationScreen() {
  const navigation = useNavigation();
  const { user } = useProfile();
  const [phase, setPhase] = useState<Phase>("input");
  const [inputTab, setInputTab] = useState<"form" | "history">("form");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(
    null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const historyLoadedRef = useRef(false);
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [offeredSalary, setOfferedSalary] = useState("");
  const [currency, setCurrency] = useState<"USD" | "INR" | "EUR">("USD");
  const [experience, setExperience] = useState("");
  const [location, setLocation] = useState("");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<SalaryAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(0);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  const refreshHistory = async () => {
    setRefreshing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        setHistory([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("salary_negotiations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (fetchError) {
        setHistory([]);
      } else {
        setHistory(data ?? []);
      }
      historyLoadedRef.current = true;
    } catch {
      setHistory([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (inputTab !== "history" || historyLoadedRef.current) return;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      try {
        // Check if table exists
        const { error: tableCheckError } = await supabase
          .from("salary_negotiations")
          .select("id")
          .limit(1);

        if (tableCheckError?.code === "42P01") {
          setError("Table not found. Run the SQL setup in Supabase.");
          setHistoryLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) {
          setHistory([]);
          setHistoryLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("salary_negotiations")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(20);

        if (fetchError) {
          setHistory([]);
        } else {
          setHistory(data ?? []);
        }
        historyLoadedRef.current = true;
      } catch {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [inputTab]);

  const deleteHistoryItem = async (id: string) => {
    Alert.alert("Delete Record", "Remove this negotiation from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.from("salary_negotiations").delete().eq("id", id);
            setHistory((prev) => prev.filter((h) => h.id !== id));
          } catch {
            // Non-fatal
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (phase !== "loading") return;
    const interval = setInterval(() => {
      setLoadingMessage((prev) => (prev + 1) % 4);
    }, 1500);
    return () => clearInterval(interval);
  }, [phase]);

  const saveToHistory = async (data: SalaryAnalysis) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return; // guard — do not attempt insert without auth

      const { data: inserted, error: insertError } = await supabase
        .from("salary_negotiations")
        .insert({
          user_id: userId, // use session userId, NOT user?.id from profile hook
          job_title: jobTitle,
          company: company || null,
          offered_salary: Number(offeredSalary),
          currency,
          experience,
          location: location || null,
          industries: selectedIndustries,
          verdict: data.verdict,
          market_min: data.marketMin,
          market_median: data.marketMedian,
          market_max: data.marketMax,
          suggested_ask: data.suggestedAsk,
          percentage_diff: data.percentageDiff,
          leverage_points: data.leveragePoints,
          negotiation_script: data.negotiationScript,
          email_template: data.emailTemplate,
          tactics: data.tactics,
        })
        .select()
        .single();

      if (insertError) {
        setSaveError(insertError.message);
        return;
      }

      // Add to history state regardless of current tab
      if (inserted) {
        setHistory((prev) => [inserted as HistoryItem, ...prev]);
        // Reset the ref so if user switches to history tab, they see the latest data
        historyLoadedRef.current = true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSaveError(msg);
    }
  };

  useEffect(() => {
    if (phase === "loading") {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.2, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.8, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [phase]);

  useFocusEffect(
    useCallback(() => {
      const onBack = () => {
        if (phase === "results") {
          setPhase("input");
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [phase]),
  );

  const toggleIndustry = (ind: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind],
    );
  };

  const copyToClipboard = async (text: string, type: "script" | "email") => {
    await Clipboard.setString(text);
    if (type === "script") {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const analyzeOffer = async () => {
    setPhase("loading");
    setSaveError(null); // clear save error, not analysis error

    const prompt = `You are an expert salary negotiation coach with deep knowledge of compensation across industries and global markets.

Analyze this job offer and provide negotiation guidance:
- Job Title: ${jobTitle}
- Company: ${company || "Not specified"}
- Offered Salary: ${offeredSalary} ${currency}
- Years of Experience: ${experience}
- Location: ${location || "Not specified"}
- Industry: ${selectedIndustries.join(", ") || "Not specified"}

Return ONLY a JSON object with NO markdown, NO backticks, NO preamble:
{
  "verdict": "Below Market" | "Fair Offer" | "Above Market",
  "marketMin": <number>,
  "marketMedian": <number>,
  "marketMax": <number>,
  "percentageDiff": <number, negative if below market>,
  "suggestedAsk": <number>,
  "leveragePoints": ["<point1>", "<point2>", "<point3>"],
  "negotiationScript": "<2-3 paragraph spoken script for the negotiation call>",
  "emailTemplate": "<complete professional counter-offer email with subject line>",
  "tactics": ["<tactic1>", "<tactic2>", "<tactic3>"]
}

All salary numbers must be in ${currency}. Be specific and realistic for the ${
      location || "global"
    } market. The negotiation script must sound natural and confident, not robotic.`;

    try {
      setError(null); // clear analysis error right before Gemini call
      const raw = await generateGeminiText(prompt);
      const parsed = parseGeminiJson<SalaryAnalysis>(raw);
      if (!parsed) throw new Error("Invalid response");

      await saveToHistory(parsed);
      setAnalysis(parsed);
      setPhase("results");
    } catch (err) {
      setError("Could not analyze offer. Please try again.");
      setPhase("input");
    }
  };

  const formatSalary = (amount: number, cur: string): string => {
    if (cur === "INR") {
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
      return `₹${amount.toLocaleString()}`;
    }
    if (cur === "EUR") return `€${amount.toLocaleString()}`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const getVerdictColor = (verdict: string): string => {
    if (verdict === "Below Market") return "#FF6B6B";
    if (verdict === "Above Market") return "#00D4AA";
    return "#FFD166";
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const isFormValid = jobTitle.trim() && offeredSalary.trim();

  if (phase === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
          <Animated.View style={[styles.loadingIcon, pulseStyle]}>
            <Ionicons name="cash-outline" size={80} color={colors.accent} />
          </Animated.View>
          <Text style={styles.loadingTitle}>Analyzing your offer...</Text>
          <Text style={styles.loadingSubtitle}>
            {loadingMessages[loadingMessage]}
          </Text>
        </View>
      </View>
    );
  }

  if (phase === "results" && (analysis || selectedHistory)) {
    const currentData = (selectedHistory || analysis) as UnifiedSalaryData;
    const isHistoryView = !!selectedHistory;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Salary Coach</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Back to History Banner */}
          {isHistoryView && (
            <TouchableOpacity
              style={styles.backToHistoryBanner}
              onPress={() => {
                setSelectedHistory(null);
                setPhase("input");
                setInputTab("history");
              }}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={colors.textSecondary}
              />
              <Text style={styles.backToHistoryText}>Back to History</Text>
            </TouchableOpacity>
          )}

          {/* Verdict Banner */}
          <View
            style={[
              styles.resultCard,
              { backgroundColor: getVerdictColor(currentData.verdict) + "20" },
            ]}
          >
            <View style={styles.verdictHeader}>
              <Ionicons
                name={
                  currentData.verdict === "Below Market"
                    ? "warning-outline"
                    : currentData.verdict === "Above Market"
                      ? "star-outline"
                      : "thumbs-up-outline"
                }
                size={32}
                color={getVerdictColor(currentData.verdict)}
              />
              <Text
                style={[
                  styles.verdictTitle,
                  { color: getVerdictColor(currentData.verdict) },
                ]}
              >
                {currentData.verdict}
              </Text>
            </View>
            <Text style={styles.verdictRange}>
              Suggested Range:{" "}
              {formatSalary(
                getMarketMin(currentData),
                selectedHistory ? selectedHistory.currency : currency,
              )}{" "}
              –{" "}
              {formatSalary(
                getMarketMax(currentData),
                selectedHistory ? selectedHistory.currency : currency,
              )}
            </Text>
            <Text style={styles.verdictDiff}>
              Your offer is {Math.abs(getPercentageDiff(currentData))}%{" "}
              {getPercentageDiff(currentData) < 0 ? "below" : "above"} market
              median
            </Text>
          </View>

          {/* Save Error Warning Banner */}
          {saveError && (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={16} color="#FFD166" />
              <Text style={styles.warningText}>
                Could not save to history. {saveError}
              </Text>
            </View>
          )}

          {/* Market Intelligence */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>📊 Market Data</Text>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Market Minimum</Text>
              <Text style={styles.statValue}>
                {formatSalary(
                  getMarketMin(currentData),
                  selectedHistory ? selectedHistory.currency : currency,
                )}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Market Median</Text>
              <Text style={[styles.statValue, styles.highlight]}>
                {formatSalary(
                  getMarketMedian(currentData),
                  selectedHistory ? selectedHistory.currency : currency,
                )}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Market Maximum</Text>
              <Text style={styles.statValue}>
                {formatSalary(
                  getMarketMax(currentData),
                  selectedHistory ? selectedHistory.currency : currency,
                )}
              </Text>
            </View>
          </View>

          {/* Leverage Points */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>💪 Your Leverage</Text>
            {getLeveragePoints(currentData).map(
              (point: string, index: number) => (
                <View key={index} style={styles.bulletRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.bulletText}>{point}</Text>
                </View>
              ),
            )}
          </View>

          {/* Negotiation Script */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>🗣️ What to Say</Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>
                {getNegotiationScript(currentData)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() =>
                copyToClipboard(getNegotiationScript(currentData), "script")
              }
            >
              <Ionicons
                name="copy-outline"
                size={16}
                color={colors.textPrimary}
              />
              <Text style={styles.copyButtonText}>
                {copiedScript ? "Copied ✓" : "Copy Script"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Template */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>📧 Counter-Offer Email</Text>
            <View style={styles.codeBlock}>
              <Text style={styles.codeText}>
                {getEmailTemplate(currentData)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() =>
                copyToClipboard(getEmailTemplate(currentData), "email")
              }
            >
              <Ionicons
                name="copy-outline"
                size={16}
                color={colors.textPrimary}
              />
              <Text style={styles.copyButtonText}>
                {copiedEmail ? "Copied ✓" : "Copy Email"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Tactics */}
          <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>⚡ Key Tactics</Text>
            {getTactics(currentData).map((tactic: string, index: number) => (
              <View key={index} style={styles.tacticCard}>
                <View style={styles.tacticNumber}>
                  <Text style={styles.tacticNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.tacticText}>{tactic}</Text>
              </View>
            ))}
          </View>

          {/* Action Buttons */}
          {!isHistoryView && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                setPhase("input");
                setJobTitle("");
                setCompany("");
                setOfferedSalary("");
                setExperience("");
                setLocation("");
                setSelectedIndustries([]);
                setAnalysis(null);
              }}
            >
              <Text style={styles.primaryButtonText}>Negotiate Again</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.ghostButton}
            onPress={() => {
              if (isHistoryView) {
                setSelectedHistory(null);
                setPhase("input");
                setInputTab("history");
              } else {
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.ghostButtonText}>
              {isHistoryView ? "Back to History" : "Back to Home"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Salary Coach</Text>
        <TouchableOpacity
          onPress={() => setInputTab(inputTab === "form" ? "history" : "form")}
        >
          <Ionicons
            name="time-outline"
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Know your worth. Negotiate with confidence.
        </Text>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, inputTab === "form" && styles.tabActive]}
            onPress={() => setInputTab("form")}
          >
            <Text
              style={[
                styles.tabText,
                inputTab === "form" && styles.tabTextActive,
              ]}
            >
              New Offer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, inputTab === "history" && styles.tabActive]}
            onPress={() => setInputTab("history")}
          >
            <Text
              style={[
                styles.tabText,
                inputTab === "history" && styles.tabTextActive,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Content */}
        {inputTab === "form" && (
          <>
            {error && (
              <View style={styles.errorCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.danger}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Job Title */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Job Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Senior Product Manager"
                placeholderTextColor={colors.textMuted}
                value={jobTitle}
                onChangeText={setJobTitle}
              />
            </View>

            {/* Company */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Company (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Google, startup, agency..."
                placeholderTextColor={colors.textMuted}
                value={company}
                onChangeText={setCompany}
              />
            </View>

            {/* Offered Salary */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Offer Received</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 80000"
                placeholderTextColor={colors.textMuted}
                value={offeredSalary}
                onChangeText={setOfferedSalary}
                keyboardType="numeric"
              />
              <View style={styles.currencyRow}>
                {["USD", "INR", "EUR"].map((cur) => (
                  <TouchableOpacity
                    key={cur}
                    style={[
                      styles.pill,
                      currency === cur && styles.pillSelected,
                    ]}
                    onPress={() => setCurrency(cur as "USD" | "INR" | "EUR")}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        currency === cur && styles.pillTextSelected,
                      ]}
                    >
                      {cur}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Experience */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Your Experience</Text>
              <View style={styles.pillRow}>
                {["0-1 yrs", "2-3 yrs", "4-6 yrs", "7-10 yrs", "10+ yrs"].map(
                  (exp) => (
                    <TouchableOpacity
                      key={exp}
                      style={[
                        styles.pill,
                        experience === exp && styles.pillSelected,
                      ]}
                      onPress={() => setExperience(exp)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          experience === exp && styles.pillTextSelected,
                        ]}
                      >
                        {exp}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>

            {/* Location */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Location (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. San Francisco, Bangalore, Remote"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            {/* Industry */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Industry (optional)</Text>
              <View style={styles.pillRow}>
                {["Tech", "Finance", "Healthcare", "Marketing", "Other"].map(
                  (ind) => (
                    <TouchableOpacity
                      key={ind}
                      style={[
                        styles.pill,
                        selectedIndustries.includes(ind) && styles.pillAccent,
                      ]}
                      onPress={() => toggleIndustry(ind)}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          selectedIndustries.includes(ind) &&
                            styles.pillAccentText,
                        ]}
                      >
                        {ind}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid && styles.submitButtonDisabled,
              ]}
              onPress={analyzeOffer}
              disabled={!isFormValid}
            >
              <Text style={styles.submitButtonText}>Analyze My Offer</Text>
            </TouchableOpacity>
          </>
        )}

        {/* History Content */}
        {inputTab === "history" && (
          <>
            {historyLoading ? (
              <View style={styles.historyLoadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="briefcase-outline"
                  size={48}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyTitle}>No history yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your analyzed offers will appear here
                </Text>
              </View>
            ) : (
              history.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.historyCard}
                  onPress={() => {
                    setSelectedHistory(item);
                    setPhase("results");
                  }}
                >
                  <View style={styles.historyCardContent}>
                    <View style={styles.historyLeft}>
                      <View style={styles.historyHeader}>
                        <Text style={styles.historyJobTitle}>
                          {item.job_title}
                        </Text>
                        <View
                          style={[
                            styles.verdictBadge,
                            {
                              backgroundColor:
                                getVerdictColor(item.verdict) + "20",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.verdictBadgeText,
                              { color: getVerdictColor(item.verdict) },
                            ]}
                          >
                            {item.verdict}
                          </Text>
                        </View>
                      </View>
                      {item.company && (
                        <Text style={styles.historyCompany}>
                          {item.company}
                        </Text>
                      )}
                      <Text style={styles.historySalary}>
                        Offer:{" "}
                        {formatSalary(item.offered_salary, item.currency)} →{" "}
                        <Text style={styles.historyAsk}>
                          Ask: {formatSalary(item.suggested_ask, item.currency)}
                        </Text>
                      </Text>
                      <Text style={styles.historyMeta}>
                        {item.experience} • {item.location || "Remote"}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyDate}>
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteHistoryItem(item.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#FF6B6B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: colors.danger,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textPrimary,
  },
  currencyRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillAccent: {
    backgroundColor: colors.primary,
    borderColor: colors.border,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: "#fff",
  },
  pillAccentText: {
    color: "#fff",
  },
  submitButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  loadingHeader: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 1,
  },
  loadingIcon: {
    marginBottom: 32,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 16,
    marginBottom: 12,
  },
  verdictHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  verdictTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  verdictRange: {
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  verdictDiff: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  highlight: {
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: -16,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  codeBlock: {
    backgroundColor: "#0D0D1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  tacticCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
    paddingVertical: 8,
  },
  tacticNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  tacticNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  tacticText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  ghostButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  ghostButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  refreshButton: {
    marginLeft: 8,
    padding: 4,
  },
  historyLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    padding: 14,
    marginBottom: 10,
  },
  historyCardContent: {
    flexDirection: "row",
  },
  historyLeft: {
    flex: 1,
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  historyJobTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verdictBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  historyCompany: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  historySalary: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  historyAsk: {
    color: colors.accent,
    fontWeight: "600",
  },
  historyMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  backToHistoryBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  backToHistoryText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,209,102,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,209,102,0.2)",
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 13,
    color: "#FFD166",
    flex: 1,
  },
});
