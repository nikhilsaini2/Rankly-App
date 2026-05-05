import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "../../hooks/index";
import { clearResponseCache, generateGeminiText } from "../../services/gemini";
import { supabase } from "../../services/supabase";
import { getElevation } from "../../theme";
import { useAppTheme } from "../../theme/useAppTheme";
import { handleGeminiError, parseGeminiJson } from "../../utils/gemini";

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
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = createStyles(theme);
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
  const [experience, setExperience] = useState("0-1 yrs");
  const [jobType, setJobType] = useState<"Full Time" | "Remote">("Full Time");
  const [jobTier, setJobTier] = useState<"Tier 1" | "Tier 2" | "Tier 3">(
    "Tier 2",
  );
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<SalaryAnalysis | null>(null);
  /** Shown on results header after analyze — form fields are cleared immediately */
  const [submittedJobTitleForResults, setSubmittedJobTitleForResults] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobTitleError, setJobTitleError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);

  const [headerHeight, setHeaderHeight] = useState(0);

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
          location: jobTier,
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

      // Add to history state and mark for refresh on next history tab visit
      if (inserted) {
        setHistory((prev) => [inserted as HistoryItem, ...prev]);
        historyLoadedRef.current = false;
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
          setAnalysis(null);
          setSubmittedJobTitleForResults(null);
          return true;
        }
        return false;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBack);
      return () => sub.remove();
    }, [phase]),
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return undefined;
      void NavigationBar.setBackgroundColorAsync(theme.background).catch(() => {});
      return undefined;
    }, [theme.background]),
  );

  const resetOfferFormFields = () => {
    setJobTitle("");
    setJobTitleError(null);
    setCompany("");
    setOfferedSalary("");
    setExperience("0-1 yrs");
    setJobType("Full Time");
    setJobTier("Tier 2");
    setSelectedIndustries([]);
  };

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

    // Derive market context from job tier
    const tierContext =
      jobTier === "Tier 1"
        ? currency === "INR"
          ? "India Tier-1 city (Bangalore, Mumbai, Delhi, Hyderabad, Pune)"
          : currency === "EUR"
            ? "Western Europe major city (London, Berlin, Paris, Amsterdam)"
            : "Major US metro (San Francisco, New York, Seattle, Boston)"
        : jobTier === "Tier 3"
          ? currency === "INR"
            ? "India Tier-3 city (smaller cities, lower cost of living)"
            : currency === "EUR"
              ? "Eastern Europe or smaller European city"
              : "Smaller US city or rural area"
          : currency === "INR"
            ? "India Tier-2 city (Jaipur, Ahmedabad, Kochi, Chandigarh, Indore)"
            : currency === "EUR"
              ? "Mid-size European city (average European market)"
              : "Mid-size US city (Austin, Denver, Chicago, Atlanta)";

    const marketContext = tierContext;

    const currencyContext =
      currency === "INR"
        ? "Indian Rupees (INR). Use Indian salary benchmarks. Do NOT convert from USD."
        : currency === "EUR"
          ? "Euros (EUR). Use European salary benchmarks."
          : "US Dollars (USD). Use United States salary benchmarks.";

    // Step 1: Ask AI for PURE market data — do NOT send the offer amount.
    // This prevents the AI from anchoring its range around the user's offer.
    const marketDataPrompt = `You are a salary data expert. Return ONLY a JSON object with real market salary data. No markdown, no extra text.

Role: ${jobTitle}
Experience: ${experience}
Job Type: ${jobType}
Location: ${marketContext}
${company ? `Company: ${company}` : ""}
Industry: ${selectedIndustries.join(", ") || "General"}
Currency: ${currency}

Return the realistic market salary range for this role in ${currency}. Use actual market data for ${marketContext}.

JSON format:
{"marketMin":<number>,"marketMedian":<number>,"marketMax":<number>,"leveragePoints":["<p1>","<p2>","<p3>"],"negotiationScript":"<1 short paragraph>","emailTemplate":"<subject + 2 sentence email>","tactics":["<t1>","<t2>","<t3>"]}

Rules:
- All numbers must be annual salary in ${currency} only
- marketMin < marketMedian < marketMax always
- marketMedian must be the realistic midpoint for this exact role and experience
- Do NOT anchor ranges to any specific number — use real market data only`;

    try {
      setError(null);
      const raw = await generateGeminiText(marketDataPrompt);
      const marketData =
        parseGeminiJson<
          Omit<SalaryAnalysis, "verdict" | "percentageDiff" | "suggestedAsk">
        >(raw);
      if (!marketData) throw new Error("Invalid response");

      const offeredNum = Number(offeredSalary);
      const median = marketData.marketMedian;

      // Step 2: Compute verdict + percentageDiff + suggestedAsk client-side
      // This is 100% accurate since we control the logic, not the AI
      const percentageDiff = Math.round(((offeredNum - median) / median) * 100);

      let verdict: SalaryAnalysis["verdict"];
      let suggestedAsk: number;

      if (percentageDiff > 5) {
        // Above market — ask 5% more on top of the offer
        verdict = "Above Market";
        suggestedAsk = Math.round(offeredNum * 1.1);
      } else if (percentageDiff < -5) {
        // Below market — ask up to the market median or 15% above offer, whichever is higher
        verdict = "Below Market";
        suggestedAsk = Math.max(
          Math.round(offeredNum * 1.15),
          Math.round(median * 0.95),
        );
      } else {
        // Fair offer — ask 8% above offer to negotiate to a good number
        verdict = "Fair Offer";
        suggestedAsk = Math.round(offeredNum * 1.08);
      }

      const parsed: SalaryAnalysis = {
        verdict,
        marketMin: marketData.marketMin,
        marketMedian: marketData.marketMedian,
        marketMax: marketData.marketMax,
        percentageDiff,
        suggestedAsk,
        leveragePoints: marketData.leveragePoints,
        negotiationScript: marketData.negotiationScript,
        emailTemplate: marketData.emailTemplate,
        tactics: marketData.tactics,
      };

      await saveToHistory(parsed);
      const titleSnap = jobTitle.trim();
      setSubmittedJobTitleForResults(titleSnap || null);
      resetOfferFormFields();
      setAnalysis(parsed);
      setPhase("results");
    } catch (err) {
      clearResponseCache(); // clear any cached bad/truncated responses
      handleGeminiError(err, () => analyzeOffer());
      setError("Could not analyze offer. Please try again.");
      setPhase("input");
    }
  };

  const formatSalary = (amount: number, cur: string): string => {
    if (cur === "INR") {
      if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
      if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
      return `₹${amount.toLocaleString()}`;
    }
    const symbol = cur === "EUR" ? "€" : "$";
    if (amount >= 1000000) return `${symbol}${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${symbol}${(amount / 1000).toFixed(0)}K`;
    return `${symbol}${amount.toLocaleString()}`;
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

  const isJobTitleValid = (title: string) => {
    if (!title.trim()) return "Job title is required.";
    if (title.trim().length < 2) return "Job title is too short.";
    if (!/^[a-zA-Z][a-zA-Z0-9\s\-\/&.,()]+$/.test(title.trim()))
      return "Enter a valid job title (Software Engineer, Product Manager).";
    return null;
  };

  const handleJobTitleChange = (text: string) => {
    setJobTitle(text);
    setJobTitleError(isJobTitleValid(text));
  };

  const isFormValid = jobTitle.trim() && !jobTitleError && offeredSalary.trim();

  if (phase === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
          <Animated.View style={[styles.loadingIcon, pulseStyle]}>
            <Ionicons name="cash-outline" size={80} color={theme.accent} />
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
    const headerTitle =
      "job_title" in currentData
        ? currentData.job_title
        : submittedJobTitleForResults || jobTitle || "Salary Analysis";
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (isHistoryView) {
                setSelectedHistory(null);
                setPhase("input");
                setInputTab("history");
              } else {
                navigation.goBack();
              }
            }}
            style={styles.headerBackButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={[
            styles.resultsContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Verdict Banner */}
          <View
            style={[
              styles.resultCard,
              styles.verdictCard,
              {
                backgroundColor: getVerdictColor(currentData.verdict) + "1A",
                borderColor: getVerdictColor(currentData.verdict) + "60",
              },
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
          <View
            style={[
              styles.resultCard,
              styles.resultCardSurface,
              styles.resultCardBorder,
            ]}
          >
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
          <View
            style={[
              styles.resultCard,
              styles.resultCardSurface,
              styles.resultCardBorder,
            ]}
          >
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
          <View
            style={[
              styles.resultCard,
              styles.resultCardSurface,
              styles.resultCardBorder,
            ]}
          >
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
                color={theme.textPrimary}
              />
              <Text style={styles.copyButtonText}>
                {copiedScript ? "Copied ✓" : "Copy Script"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Email Template */}
          <View
            style={[
              styles.resultCard,
              styles.resultCardSurface,
              styles.resultCardBorder,
            ]}
          >
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
                color={theme.textPrimary}
              />
              <Text style={styles.copyButtonText}>
                {copiedEmail ? "Copied ✓" : "Copy Email"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Tactics */}
          <View
            style={[
              styles.resultCard,
              styles.resultCardSurface,
              styles.resultCardBorder,
            ]}
          >
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
                setSubmittedJobTitleForResults(null);
                resetOfferFormFields();
                setPhase("input");
                setAnalysis(null);
              }}
            >
              <Text style={styles.primaryButtonText}>Negotiate Again</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={styles.fixedChrome}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ padding: 4, zIndex: 1 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Salary Coach</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
        <View>
          <Text style={styles.subtitle}>
            Know your worth. Negotiate with confidence.
          </Text>

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
        </View>

        {/* Form Content */}
        {inputTab === "form" && (
          <>
            {error && (
              <View style={styles.errorCard}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color={theme.danger}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Job Title */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Job Title <Text style={{ color: "red" }}>*</Text></Text>
              <TextInput
                style={[styles.input, jobTitleError ? styles.inputError : null]}
                placeholder="Senior Product Manager"
                placeholderTextColor={theme.placeholder}
                value={jobTitle}
                onChangeText={handleJobTitleChange}
              />
              {jobTitleError ? (
                <Text style={styles.fieldError}>{jobTitleError}</Text>
              ) : null}
            </View>

            {/* Company */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Company (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Google, startup, agency..."
                placeholderTextColor={theme.placeholder}
                value={company}
                onChangeText={setCompany}
              />
            </View>

            {/* Offered Salary */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Offer Received <Text style={{ color: "red" }}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="80000"
                placeholderTextColor={theme.placeholder}
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

            {/* Job Type */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Job Type</Text>
              <View style={styles.pillRow}>
                {(["Full Time", "Remote"] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.pill,
                      jobType === type && styles.pillSelected,
                    ]}
                    onPress={() => setJobType(type)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        jobType === type && styles.pillTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Job Tier */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Job Location Tier</Text>
              <View style={styles.pillRow}>
                {(["Tier 1", "Tier 2", "Tier 3"] as const).map((tier) => (
                  <TouchableOpacity
                    key={tier}
                    style={[
                      styles.pill,
                      jobTier === tier && styles.pillSelected,
                    ]}
                    onPress={() => setJobTier(tier)}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        jobTier === tier && styles.pillTextSelected,
                      ]}
                    >
                      {tier}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.inputHint, { marginTop: 8 }]}>
                {jobTier === "Tier 1"
                  ? "Major metros (SF, NYC, Bangalore, London)"
                  : jobTier === "Tier 3"
                    ? "Smaller cities, lower cost of living"
                    : "Mid-size cities (Austin, Pune, Berlin)"}
              </Text>
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
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={styles.loadingText}>Loading history...</Text>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="briefcase-outline"
                  size={48}
                  color={theme.textSecondary}
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
                      <Text style={styles.historyJobTitle}>
                        {item.job_title}
                      </Text>
                      {item.company && (
                        <Text style={styles.historyCompany}>
                          {item.company}
                        </Text>
                      )}
                      <Text style={styles.historySalaryFlow}>
                        <Text style={styles.historySalary}>
                          Offer:{" "}
                          {formatSalary(item.offered_salary, item.currency)}
                        </Text>
                        <Text style={styles.historySalaryArrow}> → </Text>
                        <Text style={styles.historyAsk}>
                          Ask:{" "}
                          {formatSalary(item.suggested_ask, item.currency)}
                        </Text>
                      </Text>
                      <Text style={styles.historyMeta}>
                        {item.experience}
                        {item.location ? ` • ${item.location}` : ""}
                      </Text>
                    </View>
                    <View style={styles.historyRight}>
                      <View style={styles.historyTopRight}>
                        <View
                          style={[
                            styles.verdictBadge,
                            {
                              backgroundColor:
                                getVerdictColor(item.verdict) + "20",
                              borderColor: getVerdictColor(item.verdict) + "60",
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
                        <Text style={styles.historyDate}>
                          {new Date(item.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </Text>
                      </View>
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
    </View>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>) {
  const elevation = getElevation(theme);
  const isLight = theme.background === "#F3F4F8";

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    fixedChrome: {
      flexShrink: 0,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 8,
      flexShrink: 0,
      backgroundColor: theme.background,
    },
    headerBackButton: {
      padding: 4,
      zIndex: 1000,
      alignSelf: "center",
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700",
      color: theme.textPrimary,
      position: "absolute",
      left: 0,
      right: 0,
      textAlign: "center",
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: theme.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 32,
      textAlign: "center",
    },
    errorCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: "rgba(239, 68, 68, 0.1)",
      borderWidth: 1,
      borderColor: isLight
        ? "rgba(239, 68, 68, 0.55)"
        : "rgba(239, 68, 68, 0.2)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    errorText: {
      flex: 1,
      fontSize: 14,
      color: theme.danger,
    },
    inputCard: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 16,
      ...elevation.card,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textPrimary,
      marginBottom: 12,
    },
    inputHint: {
      fontSize: 12,
      color: theme.textMuted,
    },
    input: {
      backgroundColor: theme.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.textPrimary,
    },
    inputError: {
      borderColor: theme.danger,
    },
    fieldError: {
      fontSize: 12,
      color: theme.danger,
      marginTop: 6,
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
      borderColor: theme.border,
      backgroundColor: "transparent",
    },
    pillSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    pillAccent: {
      backgroundColor: theme.primary,
      borderColor: theme.border,
    },
    pillText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.textSecondary,
    },
    pillTextSelected: {
      color: theme.onPrimary,
    },
    pillAccentText: {
      color: theme.onPrimary,
    },
    submitButton: {
      backgroundColor: theme.primary,
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
      color: theme.onPrimary,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 20,
    },
    loadingHeader: {
      position: "absolute",
      top: 25,
      left: 20,
      zIndex: 1,
    },
    loadingIcon: {
      marginBottom: 32,
    },
    loadingTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: theme.textPrimary,
      marginBottom: 16,
      textAlign: "center",
    },
    loadingSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
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
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
    },
    resultCardSurface: {
      backgroundColor: theme.surface,
      ...elevation.card,
    },
    resultCardBorder: {
      borderWidth: 1,
      borderColor: theme.border,
    },
    verdictCard: {
      borderWidth: 1,
      shadowColor: "transparent",
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
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
      color: theme.textPrimary,
      marginBottom: 4,
    },
    verdictDiff: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.textPrimary,
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
      color: theme.textSecondary,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.textPrimary,
    },
    highlight: {
      color: theme.primary,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
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
      backgroundColor: theme.accent,
      marginTop: 6,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      color: theme.textPrimary,
      lineHeight: 20,
    },
    codeBlock: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      marginBottom: 12,
    },
    codeText: {
      fontSize: 14,
      color: theme.textPrimary,
      lineHeight: 20,
    },
    copyButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    copyButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.textPrimary,
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
      backgroundColor: theme.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    tacticNumberText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.onPrimary,
    },
    tacticText: {
      flex: 1,
      fontSize: 14,
      color: theme.textPrimary,
      lineHeight: 20,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      height: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.onPrimary,
    },
    ghostButton: {
      height: 56,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
    },
    ghostButtonText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    tabBar: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderRadius: 14,
      padding: 4,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.border,
      ...elevation.subtle,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.textSecondary,
    },
    tabTextActive: {
      color: theme.onPrimary,
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
      color: theme.textSecondary,
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
      color: theme.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
    },
    historyCard: {
      backgroundColor: theme.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      marginBottom: 10,
      ...elevation.subtle,
    },
    historyCardContent: {
      flexDirection: "row",
    },
    historyLeft: {
      flex: 1,
    },
    historyRight: {
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginLeft: 8,
    },
    historyTopRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 8,
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
      color: theme.textPrimary,
      flex: 1,
    },
    verdictBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
    },
    verdictBadgeText: {
      fontSize: 11,
      fontWeight: "600",
    },
    historyCompany: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    /** Single Text so Offer / arrow / Ask wrap as inline content — avoids orphaned → on wrap */
    historySalaryFlow: {
      flexShrink: 1,
      marginBottom: 4,
      fontSize: 13,
      lineHeight: 22,
      color: theme.textPrimary,
    },
    historySalary: {
      fontSize: 13,
      color: theme.textPrimary,
      lineHeight: 22,
    },
    historySalaryArrow: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 22,
      fontWeight: "600",
    },
    historyAsk: {
      fontSize: 13,
      color: theme.accent,
      fontWeight: "600",
      lineHeight: 22,
    },
    historyMeta: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    historyDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    deleteButton: {
      padding: 4,
    },
    backToHistoryBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.border,
      ...elevation.subtle,
    },
    backToHistoryText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 8,
    },
    warningCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "rgba(255,209,102,0.1)",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isLight ? "rgba(255,209,102,0.55)" : "rgba(255,209,102,0.2)",
      padding: 12,
      marginBottom: 12,
    },
    warningText: {
      fontSize: 13,
      color: "#FFD166",
      flex: 1,
    },
  });
}
