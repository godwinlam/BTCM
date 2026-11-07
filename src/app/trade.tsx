import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { StarRankIndicator } from '../components/StarRankIndicator';
import { useIsMobile } from '../hooks/useIsMobile';

type TradeAction = 'BUY' | 'SELL';

interface TradeHistoryItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
  metadata?: {
    action?: string;
    usdtSpent?: number;
    btcReceived?: number;
    btcSold?: number;
    usdtReceived?: number;
    executionPrice?: number;
    fee?: number;
  };
}

export default function TradeScreen() {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Active Trade Mode
  const [action, setAction] = useState<TradeAction>('BUY');

  // User & Balances
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Live BTC Price & Stats
  const [btcPrice, setBtcPrice] = useState<number>(78300);
  const [change24h, setChange24h] = useState<number>(1.5);
  const [high24h, setHigh24h] = useState<number>(79800);
  const [low24h, setLow24h] = useState<number>(76900);
  const [loadingPrice, setLoadingPrice] = useState<boolean>(false);
  const [priceSource, setPriceSource] = useState<string>('live');
  const [feePercentage, setFeePercentage] = useState<number>(2.0);

  // Form input amounts
  const [inputAmount, setInputAmount] = useState<string>('');
  const [percentSelected, setPercentSelected] = useState<number | null>(null);

  // Confirmation Modal
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Toast Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Trade History
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  // Load Initial Data
  useEffect(() => {
    loadUserData();
    loadPriceData();
    loadTradeHistory();

    // Periodic price refresh every 15 seconds
    const interval = setInterval(() => {
      loadPriceData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5500);
  };

  const loadUserData = async () => {
    try {
      setLoadingUser(true);
      const res = await api.getMe();
      if (res && res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      console.warn('Failed to load user profile in Trade:', err.message);
    } finally {
      setLoadingUser(false);
    }
  };

  const loadPriceData = async (showLoading: boolean = true) => {
    try {
      if (showLoading) setLoadingPrice(true);
      const quoteRes = await api.getTradeQuote();
      if (quoteRes && quoteRes.success) {
        if (quoteRes.price) setBtcPrice(quoteRes.price);
        if (quoteRes.change24h !== undefined) setChange24h(quoteRes.change24h);
        if (quoteRes.high24h) setHigh24h(quoteRes.high24h);
        if (quoteRes.low24h) setLow24h(quoteRes.low24h);
        if (quoteRes.source) setPriceSource(quoteRes.source);
        if (quoteRes.feePercentage !== undefined) setFeePercentage(quoteRes.feePercentage);
        if (quoteRes.wallet && user) {
          setUser((prev: any) => ({
            ...prev,
            wallet: {
              ...prev?.wallet,
              usdBalance: quoteRes.wallet.usdBalance,
              btcBalance: quoteRes.wallet.btcBalance,
            },
          }));
        }
      }
    } catch (err) {
      // Fallback to standard price check
      try {
        const p = await api.getBtcPrice();
        if (p && p.price) {
          setBtcPrice(p.price);
          setChange24h(p.change24h);
        }
      } catch (e) {
        // silent
      }
    } finally {
      if (showLoading) setLoadingPrice(false);
    }
  };

  const loadTradeHistory = async () => {
    try {
      setLoadingTrades(true);
      const res = await api.getTradeHistory(1, 30);
      if (res && res.success && res.trades) {
        setTrades(res.trades);
      }
    } catch (err) {
      console.warn('Failed to load trade history:', err);
    } finally {
      setLoadingTrades(false);
    }
  };

  // Quick Percentage Selector
  const handleSelectPercent = (percent: number) => {
    setPercentSelected(percent);
    if (!user || !user.wallet) return;

    if (action === 'BUY') {
      const available = user.wallet.usdBalance || 0;
      const amt = (available * percent).toFixed(2);
      setInputAmount(amt);
    } else {
      const available = user.wallet.btcBalance || 0;
      const amt = (available * percent).toFixed(8);
      setInputAmount(amt);
    }
  };

  // Clear inputs when switching action
  const handleSwitchAction = (newAction: TradeAction) => {
    setAction(newAction);
    setInputAmount('');
    setPercentSelected(null);
  };

  // Numerical Calculations
  const numInput = parseFloat(inputAmount) || 0;
  const availableUsdt = user?.wallet?.usdBalance || 0;
  const availableBtc = user?.wallet?.btcBalance || 0;

  let feeUsdt = 0;
  let netUsdt = 0;
  let calculatedOutput = 0;
  let hasSufficientBalance = false;
  let minRequirementMet = false;

  if (action === 'BUY') {
    feeUsdt = Number((numInput * (feePercentage / 100)).toFixed(2));
    netUsdt = Math.max(0, Number((numInput - feeUsdt).toFixed(2)));
    calculatedOutput = btcPrice > 0 ? Number((netUsdt / btcPrice).toFixed(8)) : 0;
    hasSufficientBalance = availableUsdt >= numInput;
    minRequirementMet = numInput >= 10;
  } else {
    const grossUsdt = Number((numInput * btcPrice).toFixed(2));
    feeUsdt = Number((grossUsdt * (feePercentage / 100)).toFixed(2));
    calculatedOutput = Math.max(0, Number((grossUsdt - feeUsdt).toFixed(2)));
    hasSufficientBalance = availableBtc >= numInput;
    minRequirementMet = numInput >= 0.00005;
  }

  // Pre-confirmation Check
  const handleInitiateTrade = () => {
    if (!user) {
      showToast('Please sign in to execute live Bitcoin trades', 'error');
      router.push('/login' as any);
      return;
    }

    if (numInput <= 0 || isNaN(numInput)) {
      showToast('Please enter a valid amount to trade', 'error');
      return;
    }

    if (action === 'BUY') {
      if (numInput < 10) {
        showToast('Minimum purchase amount is 10 USDT', 'error');
        return;
      }
      if (!hasSufficientBalance) {
        showToast(`Insufficient USDT balance. You have $${availableUsdt.toFixed(2)} USDT`, 'error');
        return;
      }
    } else {
      if (numInput < 0.00005) {
        showToast('Minimum sell amount is 0.00005 BTC', 'error');
        return;
      }
      if (!hasSufficientBalance) {
        showToast(`Insufficient BTC balance. You have ₿${availableBtc.toFixed(8)} BTC`, 'error');
        return;
      }
    }

    setConfirmModalVisible(true);
  };

  // Execute Trade API
  const handleConfirmExecute = async () => {
    try {
      setSubmitting(true);
      const res = await api.executeTrade(action, numInput);

      if (res && res.success) {
        showToast(res.message || 'Trade executed successfully!');
        if (res.wallet) {
          setUser((prev: any) => ({
            ...prev,
            wallet: {
              ...prev?.wallet,
              usdBalance: res.wallet.usdBalance,
              btcBalance: res.wallet.btcBalance,
            },
          }));
        }
        setConfirmModalVisible(false);
        setInputAmount('');
        setPercentSelected(null);
        // Refresh history & balances
        loadTradeHistory();
        loadUserData();
      } else {
        showToast(res.message || 'Trade execution failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Trade execution failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTrades = trades.filter((t) => {
    if (tradeFilter === 'ALL') return true;
    if (tradeFilter === 'BUY') return t.type === 'BUY_BTC';
    if (tradeFilter === 'SELL') return t.type === 'SELL_BTC';
    return true;
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Navbar */}
      <View style={[styles.navbar, isMobile && styles.navbarMobile]}>
        {isMobile ? (
          /* MOBILE NAVBAR */
          <View style={styles.mobileNavWrap}>
            {/* Row 1: Back to Dashboard & Brand */}
            <View style={styles.mobileNavRow1}>
              <TouchableOpacity onPress={() => router.replace('/dashboard' as any)} style={styles.backBtnMobile}>
                <Text style={styles.backBtnText}>← Dashboard</Text>
              </TouchableOpacity>
              <View style={styles.brandRowMobile}>
                <View style={styles.btcIconBadgeSmall}>
                  <Text style={styles.btcIconBadgeTextSmall}>₿</Text>
                </View>
                <View>
                  <Text style={styles.brandTitleMobile}>BTCM // TRADING</Text>
                  <Text style={styles.brandSubtitleMobile}>Real-Time Spot Desk</Text>
                </View>
              </View>
            </View>

            {/* Row 2: Live BTC Price & Profile */}
            <View style={styles.mobileNavRow2}>
              <View style={styles.livePricePillMobile}>
                <View style={styles.liveDot} />
                <Text style={styles.livePriceTextMobile}>BTC/USDT ${btcPrice.toLocaleString()}</Text>
                <Text style={[styles.liveChangeTextMobile, { color: change24h >= 0 ? '#10B981' : '#F43F5E' }]}>
                  {change24h >= 0 ? `+${change24h}%` : `${change24h}%`}
                </Text>
              </View>

              {user && (
                <TouchableOpacity
                  style={styles.profileBadgeBtnMobile}
                  onPress={() => router.push('/profile' as any)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={styles.profileBadgeText}>👤 @{user.username}</Text>
                    {Boolean(user.isStarQualified || (user.starRank && user.starRank >= 1)) && (
                      <StarRankIndicator
                        rank={user.starRank || 1}
                        badge={user.starBadge || ((user.starRank || 0) >= 10 ? '3 CROWN' : (user.starRank || 0) === 9 ? '2 CROWN' : (user.starRank || 0) === 8 ? 'CROWN' : `${user.starRank || 1}★`)}
                        size="xs"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* DESKTOP NAVBAR */
          <>
            <View style={styles.navLeft}>
              <TouchableOpacity onPress={() => router.replace('/dashboard' as any)} style={styles.backBtn}>
                <Text style={styles.backBtnText}>← Dashboard</Text>
              </TouchableOpacity>
              <View style={styles.brandRow}>
                <View style={styles.btcIconBadge}>
                  <Text style={styles.btcIconBadgeText}>₿</Text>
                </View>
                <View>
                  <Text style={styles.brandTitle}>BTCM // BITCOIN TRADING DESK</Text>
                  <Text style={styles.brandSubtitle}>Instant BUY / SELL BTC at Real-Time Institutional Spot Rates</Text>
                </View>
              </View>
            </View>

            <View style={styles.navRight}>
              <View style={styles.livePricePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePriceText}>BTC/USDT ${btcPrice.toLocaleString()}</Text>
                <Text style={[styles.liveChangeText, { color: change24h >= 0 ? '#10B981' : '#F43F5E' }]}>
                  {change24h >= 0 ? `+${change24h}%` : `${change24h}%`}
                </Text>
              </View>

              {user && (
                <TouchableOpacity
                  style={styles.profileBadgeBtn}
                  onPress={() => router.push('/profile' as any)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.profileBadgeText}>👤 @{user.username}</Text>
                    {Boolean(user.isStarQualified || (user.starRank && user.starRank >= 1)) && (
                      <StarRankIndicator
                        rank={user.starRank || 1}
                        badge={user.starBadge || ((user.starRank || 0) >= 10 ? '3 CROWN' : (user.starRank || 0) === 9 ? '2 CROWN' : (user.starRank || 0) === 8 ? 'CROWN' : `${user.starRank || 1}★`)}
                        size="xs"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>

      {/* Toast Notification */}
      {notification && (
        <View
          style={[
            styles.toastBox,
            notification.type === 'error' ? styles.toastError : styles.toastSuccess,
          ]}
        >
          <Text style={styles.toastText}>
            {notification.type === 'error' ? '⚠️ ' : '✅ '}
            {notification.message}
          </Text>
        </View>
      )}

      {loadingUser ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#F7931A" />
          <Text style={styles.loadingText}>Syncing Bitcoin Spot Rates & Balances...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* Market Telemetry Ticker Strip */}
          <View style={[styles.tickerStrip, isMobile && styles.tickerStripMobile]}>
            <View style={styles.tickerItem}>
              <Text style={styles.tickerLabel}>SPOT INDEX</Text>
              <Text style={styles.tickerValueBtc}>${btcPrice.toLocaleString()}</Text>
            </View>
            <View style={styles.tickerDivider} />
            <View style={styles.tickerItem}>
              <Text style={styles.tickerLabel}>24H CHANGE</Text>
              <Text style={[styles.tickerValue, { color: change24h >= 0 ? '#10B981' : '#F43F5E' }]}>
                {change24h >= 0 ? `+${change24h}%` : `${change24h}%`}
              </Text>
            </View>
            <View style={styles.tickerDivider} />
            <View style={styles.tickerItem}>
              <Text style={styles.tickerLabel}>24H HIGH</Text>
              <Text style={styles.tickerValue}>${high24h.toLocaleString()}</Text>
            </View>
            <View style={styles.tickerDivider} />
            <View style={styles.tickerItem}>
              <Text style={styles.tickerLabel}>24H LOW</Text>
              <Text style={styles.tickerValue}>${low24h.toLocaleString()}</Text>
            </View>
            <View style={styles.tickerDivider} />
            <View style={styles.tickerItem}>
              <Text style={styles.tickerLabel}>TRADING FEE</Text>
              <View style={styles.feePill}>
                <Text style={styles.feePillText}>{feePercentage.toFixed(2)}% PLATFORM FEE</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => loadPriceData(true)}
              disabled={loadingPrice}
            >
              {loadingPrice ? (
                <ActivityIndicator size="small" color="#F7931A" />
              ) : (
                <Text style={styles.refreshBtnText}>🔄 Refresh Rate</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* User Available Balance Cards */}
          <View style={[styles.balanceCardRow, isMobile && styles.balanceCardRowMobile]}>
            {/* USDT Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={styles.coinIconUSDT}>
                  <Text style={styles.coinIconText}>₮</Text>
                </View>
                <View>
                  <Text style={styles.coinTitle}>AVAILABLE USDT</Text>
                  <Text style={styles.coinSubtitle}>Cash / Commission Capital</Text>
                </View>
              </View>
              <Text style={styles.balanceAmountGreen}>
                ${availableUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </Text>
              <Text style={styles.balanceSubtext}>Use to instantly Buy Bitcoin at Spot Price</Text>
            </View>

            {/* BTC Balance Card */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <View style={styles.coinIconBTC}>
                  <Text style={styles.coinIconText}>₿</Text>
                </View>
                <View>
                  <Text style={styles.coinTitle}>AVAILABLE BITCOIN</Text>
                  <Text style={styles.coinSubtitle}>1,500-Day Cloud Mining Yields</Text>
                </View>
              </View>
              <Text style={styles.balanceAmountOrange}>
                ₿ {availableBtc.toFixed(8)} BTC
              </Text>
              <Text style={styles.balanceSubtext}>
                ≈ ${(availableBtc * btcPrice).toFixed(2)} USDT at live market rate
              </Text>
            </View>
          </View>

          {/* MAIN TRADING DESK CARD */}
          <View style={styles.tradeCard}>
            {/* Buy / Sell Tab Switcher */}
            <View style={styles.tradeModeSwitch}>
              <TouchableOpacity
                style={[
                  styles.tradeModeBtn,
                  action === 'BUY' && styles.tradeModeBtnBuyActive,
                ]}
                onPress={() => handleSwitchAction('BUY')}
              >
                <Text
                  style={[
                    styles.tradeModeBtnText,
                    action === 'BUY' && styles.tradeModeBtnTextActive,
                  ]}
                >
                  🟢 BUY BITCOIN (USDT → BTC)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tradeModeBtn,
                  action === 'SELL' && styles.tradeModeBtnSellActive,
                ]}
                onPress={() => handleSwitchAction('SELL')}
              >
                <Text
                  style={[
                    styles.tradeModeBtnText,
                    action === 'SELL' && styles.tradeModeBtnTextActive,
                  ]}
                >
                  🔴 SELL BITCOIN (BTC → USDT)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Trading Form */}
            <View style={styles.formSection}>
              {/* Pay Input */}
              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text style={styles.inputLabel}>
                    {action === 'BUY' ? 'YOU SPEND (USDT)' : 'YOU SELL (BTC)'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleSelectPercent(1)}
                    style={styles.maxBtn}
                  >
                    <Text style={styles.maxBtnText}>
                      MAX: {action === 'BUY' ? `$${availableUsdt.toFixed(2)}` : `₿${availableBtc.toFixed(8)}`}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={action === 'BUY' ? 'Min 10 USDT' : 'Min 0.00005 BTC'}
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={inputAmount}
                    onChangeText={(val) => {
                      setInputAmount(val);
                      setPercentSelected(null);
                    }}
                  />
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>
                      {action === 'BUY' ? 'USDT' : 'BTC'}
                    </Text>
                  </View>
                </View>

                {/* Percentage Quick Selectors */}
                <View style={styles.percentRow}>
                  {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                    <TouchableOpacity
                      key={pct}
                      style={[
                        styles.percentBtn,
                        percentSelected === pct && styles.percentBtnActive,
                      ]}
                      onPress={() => handleSelectPercent(pct)}
                    >
                      <Text
                        style={[
                          styles.percentBtnText,
                          percentSelected === pct && styles.percentBtnTextActive,
                        ]}
                      >
                        {pct === 1.0 ? 'MAX' : `${pct * 100}%`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Conversion Arrow Indicator */}
              <View style={styles.convertIconContainer}>
                <View style={styles.convertLine} />
                <View style={styles.convertCircle}>
                  <Text style={styles.convertArrowText}>↓</Text>
                </View>
                <View style={styles.convertLine} />
              </View>

              {/* Estimated Output Result */}
              <View style={styles.outputGroup}>
                <Text style={styles.outputLabel}>
                  {action === 'BUY' ? 'YOU RECEIVE (ESTIMATED BITCOIN)' : 'YOU RECEIVE (ESTIMATED USDT)'}
                </Text>
                <View style={styles.outputWrapper}>
                  <Text style={action === 'BUY' ? styles.outputValueOrange : styles.outputValueGreen}>
                    {action === 'BUY'
                      ? `₿ ${calculatedOutput.toFixed(8)} BTC`
                      : `$ ${calculatedOutput.toFixed(2)} USDT`}
                  </Text>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencyBadgeText}>
                      {action === 'BUY' ? 'BTC' : 'USDT'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Trade Parameter Summary Box */}
              <View style={styles.tradeParamBox}>
                <View style={styles.paramRow}>
                  <Text style={styles.paramLabel}>Execution Spot Price</Text>
                  <Text style={styles.paramValue}>1 BTC = ${btcPrice.toLocaleString()} USDT</Text>
                </View>
                <View style={styles.paramRow}>
                  <Text style={styles.paramLabel}>Platform Trading Fee (2%)</Text>
                  <Text style={styles.paramValueAmber}>
                    {feePercentage.toFixed(2)}% ({numInput > 0 ? `$${feeUsdt.toFixed(2)} USDT` : 'Standard'})
                  </Text>
                </View>
                {action === 'BUY' && numInput > 0 && (
                  <View style={styles.paramRow}>
                    <Text style={styles.paramLabel}>Net Capital Converted</Text>
                    <Text style={styles.paramValue}>${netUsdt.toFixed(2)} USDT</Text>
                  </View>
                )}
                <View style={styles.paramRow}>
                  <Text style={styles.paramLabel}>Slippage Tolerance</Text>
                  <Text style={styles.paramValue}>0.00% (Guaranteed Exec)</Text>
                </View>
                <View style={styles.paramRow}>
                  <Text style={styles.paramLabel}>Settlement Speed</Text>
                  <Text style={styles.paramValue}>⚡ Instant On-Ledger</Text>
                </View>

                {numInput > 0 && (
                  <View style={styles.balancePreviewBox}>
                    <Text style={styles.balancePreviewTitle}>ESTIMATED POST-TRADE BALANCES:</Text>
                    <View style={styles.paramRow}>
                      <Text style={styles.paramLabel}>New USDT Balance:</Text>
                      <Text style={styles.paramValue}>
                        ${(action === 'BUY' ? Math.max(0, availableUsdt - numInput) : availableUsdt + calculatedOutput).toFixed(2)} USDT
                      </Text>
                    </View>
                    <View style={styles.paramRow}>
                      <Text style={styles.paramLabel}>New BTC Balance:</Text>
                      <Text style={styles.paramValueOrange}>
                        ₿ {(action === 'BUY' ? availableBtc + calculatedOutput : Math.max(0, availableBtc - numInput)).toFixed(8)} BTC
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  action === 'BUY' ? styles.submitBtnBuy : styles.submitBtnSell,
                  (!hasSufficientBalance || !minRequirementMet || numInput <= 0) && styles.submitBtnDisabled,
                ]}
                onPress={handleInitiateTrade}
                disabled={!hasSufficientBalance || !minRequirementMet || numInput <= 0}
              >
                <Text style={styles.submitBtnText}>
                  {!minRequirementMet && numInput > 0
                    ? action === 'BUY'
                      ? 'MINIMUM 10 USDT REQUIRED'
                      : 'MINIMUM 0.00005 BTC REQUIRED'
                    : !hasSufficientBalance
                      ? 'INSUFFICIENT BALANCE'
                      : action === 'BUY'
                        ? `⚡ INSTANT BUY ₿ ${calculatedOutput.toFixed(8)} BTC`
                        : `⚡ INSTANT SELL FOR $${calculatedOutput.toFixed(2)} USDT`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TRADE HISTORY LEDGER */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <View>
                <Text style={styles.historyTitle}>📜 Recent Buy & Sell Orders</Text>
                <Text style={styles.historySubtitle}>On-chain synchronized instant spot settlements</Text>
              </View>

              <View style={styles.filterRow}>
                {(['ALL', 'BUY', 'SELL'] as const).map((flt) => (
                  <TouchableOpacity
                    key={flt}
                    style={[styles.filterBtn, tradeFilter === flt && styles.filterBtnActive]}
                    onPress={() => setTradeFilter(flt)}
                  >
                    <Text style={[styles.filterBtnText, tradeFilter === flt && styles.filterBtnTextActive]}>
                      {flt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {loadingTrades ? (
              <View style={styles.historyLoadingBox}>
                <ActivityIndicator size="small" color="#F7931A" />
                <Text style={styles.historyLoadingText}>Loading trading ledger...</Text>
              </View>
            ) : filteredTrades.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Text style={styles.emptyHistoryEmoji}>🪙</Text>
                <Text style={styles.emptyHistoryTitle}>No Trade Orders Found</Text>
                <Text style={styles.emptyHistorySub}>
                  Execute your first Buy or Sell order above to acquire Bitcoin or liquidate mining earnings.
                </Text>
              </View>
            ) : (
              <View style={styles.tableCard}>
                {filteredTrades.map((item) => {
                  const isBuy = item.type === 'BUY_BTC';
                  const dateStr = new Date(item.createdAt).toLocaleString();
                  const meta = item.metadata || {};

                  return isMobile ? (
                    /* MOBILE CLEAN TRADE ORDER CARD */
                    <View key={item.id} style={styles.tableRowMobile}>
                      {/* Row 1: Action Tag & Status Badge */}
                      <View style={styles.orderMobileTopRow}>
                        <View style={[styles.actionTag, isBuy ? styles.actionTagBuy : styles.actionTagSell]}>
                          <Text style={[styles.actionTagText, isBuy ? styles.actionTagTextBuy : styles.actionTagTextSell]}>
                            {isBuy ? 'BUY BTC' : 'SELL BTC'}
                          </Text>
                        </View>
                        <View style={styles.statusCompletedPill}>
                          <Text style={styles.statusCompletedText}>COMPLETED</Text>
                        </View>
                      </View>

                      {/* Row 2: Description & Amount */}
                      <View style={styles.orderMobileMiddleRow}>
                        <Text style={styles.rowDescMobile} numberOfLines={2}>
                          {item.description}
                        </Text>
                        <Text style={isBuy ? styles.rowAmountOrangeMobile : styles.rowAmountGreenMobile}>
                          {isBuy ? `+₿ ${item.amount.toFixed(8)}` : `+$ ${item.amount.toFixed(2)}`}
                        </Text>
                      </View>

                      {/* Row 3: Date & Execution Spot Rate */}
                      <View style={styles.orderMobileBottomRow}>
                        <Text style={styles.rowDate}>{dateStr}</Text>
                        {meta.executionPrice ? (
                          <Text style={styles.rowRate}>@ ${meta.executionPrice.toLocaleString()}/BTC</Text>
                        ) : null}
                      </View>
                    </View>
                  ) : (
                    /* DESKTOP TRADE ORDER ROW */
                    <View key={item.id} style={styles.tableRow}>
                      <View style={styles.rowLeft}>
                        <View style={[styles.actionTag, isBuy ? styles.actionTagBuy : styles.actionTagSell]}>
                          <Text style={[styles.actionTagText, isBuy ? styles.actionTagTextBuy : styles.actionTagTextSell]}>
                            {isBuy ? 'BUY BTC' : 'SELL BTC'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.rowDesc}>{item.description}</Text>
                          <Text style={styles.rowDate}>{dateStr}</Text>
                        </View>
                      </View>

                      <View style={styles.rowRight}>
                        <Text style={isBuy ? styles.rowAmountOrange : styles.rowAmountGreen}>
                          {isBuy ? `+₿ ${item.amount.toFixed(8)}` : `+$ ${item.amount.toFixed(2)}`}
                        </Text>
                        {meta.executionPrice && (
                          <Text style={styles.rowRate}>@ ${meta.executionPrice.toLocaleString()}/BTC</Text>
                        )}
                        <View style={styles.statusCompletedPill}>
                          <Text style={styles.statusCompletedText}>COMPLETED</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* CONFIRMATION MODAL */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {action === 'BUY' ? 'Confirm Instant Bitcoin Purchase' : 'Confirm Instant Bitcoin Sale'}
              </Text>
              <Text style={styles.modalSubtitle}>Zero Slippage Institutional Spot Trade</Text>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.modalSummaryBox}>
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalLabel}>Action:</Text>
                  <Text style={[styles.modalValueBold, { color: action === 'BUY' ? '#10B981' : '#F43F5E' }]}>
                    {action === 'BUY' ? 'BUY BITCOIN' : 'SELL BITCOIN'}
                  </Text>
                </View>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalLabel}>You Spend:</Text>
                  <Text style={styles.modalValue}>
                    {action === 'BUY' ? `$${numInput.toFixed(2)} USDT` : `₿ ${numInput.toFixed(8)} BTC`}
                  </Text>
                </View>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalLabel}>You Receive:</Text>
                  <Text style={[styles.modalValueBold, { color: action === 'BUY' ? '#F7931A' : '#10B981' }]}>
                    {action === 'BUY' ? `₿ ${calculatedOutput.toFixed(8)} BTC` : `$${calculatedOutput.toFixed(2)} USDT`}
                  </Text>
                </View>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalLabel}>Spot Execution Price:</Text>
                  <Text style={styles.modalValue}>1 BTC = ${btcPrice.toLocaleString()} USDT</Text>
                </View>

                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalLabel}>Platform Trading Fee (2%):</Text>
                  <Text style={styles.modalValueAmber}>${feeUsdt.toFixed(2)} USDT</Text>
                </View>

                {action === 'BUY' && (
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalLabel}>Net Capital Converted:</Text>
                    <Text style={styles.modalValue}>${netUsdt.toFixed(2)} USDT</Text>
                  </View>
                )}
              </View>

              <Text style={styles.modalDisclaimer}>
                ⚠️ Please verify order details carefully. Funds will be atomically deducted and Bitcoin/USDT credited to your wallet immediately upon confirmation.
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  action === 'BUY' ? styles.submitBtnBuy : styles.submitBtnSell,
                ]}
                onPress={handleConfirmExecute}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>
                    {action === 'BUY' ? 'Confirm & Buy BTC' : 'Confirm & Sell BTC'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#111726',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  navbarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  mobileNavWrap: {
    width: '100%',
    gap: 8,
  },
  mobileNavRow1: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtnMobile: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  brandRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btcIconBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btcIconBadgeTextSmall: {
    color: '#F7931A',
    fontSize: 14,
    fontWeight: '900',
  },
  brandTitleMobile: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  brandSubtitleMobile: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '500',
  },
  mobileNavRow2: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  livePricePillMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  livePriceTextMobile: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  liveChangeTextMobile: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  profileBadgeBtnMobile: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.4)',
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  backBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btcIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btcIconBadgeText: {
    color: '#F7931A',
    fontSize: 18,
    fontWeight: '900',
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  navRightMobile: {
    width: '100%',
    justifyContent: 'space-between',
  },
  livePricePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  livePriceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  liveChangeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  profileBadgeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.3)',
    borderRadius: 8,
  },
  profileBadgeText: {
    color: '#F7931A',
    fontSize: 13,
    fontWeight: '800',
  },
  toastBox: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  toastError: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.4)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    gap: 20,
  },
  tickerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  tickerStripMobile: {
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  tickerItem: {
    alignItems: 'center',
  },
  tickerLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tickerValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  tickerValueBtc: {
    color: '#F7931A',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  tickerDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  feePill: {
    backgroundColor: 'rgba(247, 147, 26, 0.12)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.35)',
    marginTop: 3,
  },
  feePillText: {
    color: '#F7931A',
    fontSize: 10,
    fontWeight: '800',
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.3)',
  },
  refreshBtnText: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '700',
  },
  balanceCardRow: {
    flexDirection: 'row',
    gap: 16,
  },
  balanceCardRowMobile: {
    flexDirection: 'column',
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#111726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 18,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  coinIconUSDT: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIconBTC: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  coinTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  coinSubtitle: {
    color: '#64748B',
    fontSize: 11,
  },
  balanceAmountGreen: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  balanceAmountOrange: {
    color: '#F7931A',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  balanceSubtext: {
    color: '#94A3B8',
    fontSize: 11,
  },
  tradeCard: {
    backgroundColor: '#111726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
  },
  tradeModeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 4,
    borderRadius: 12,
    marginBottom: 24,
  },
  tradeModeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tradeModeBtnBuyActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  tradeModeBtnSellActive: {
    backgroundColor: 'rgba(244, 63, 94, 0.18)',
    borderWidth: 1,
    borderColor: '#F43F5E',
  },
  tradeModeBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
  },
  tradeModeBtnTextActive: {
    color: '#FFFFFF',
  },
  formSection: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  maxBtn: {
    backgroundColor: 'rgba(247, 147, 26, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  maxBtnText: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  currencyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currencyBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  percentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  percentBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  percentBtnActive: {
    backgroundColor: 'rgba(247, 147, 26, 0.18)',
    borderColor: '#F7931A',
  },
  percentBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  percentBtnTextActive: {
    color: '#F7931A',
  },
  convertIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  convertLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  convertCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  convertArrowText: {
    color: '#F7931A',
    fontSize: 16,
    fontWeight: '900',
  },
  outputGroup: {
    gap: 8,
  },
  outputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  outputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  outputValueOrange: {
    color: '#F7931A',
    fontSize: 20,
    fontWeight: '900',
  },
  outputValueGreen: {
    color: '#10B981',
    fontSize: 20,
    fontWeight: '900',
  },
  tradeParamBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    gap: 8,
    marginTop: 6,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paramLabel: {
    color: '#64748B',
    fontSize: 12,
  },
  paramValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  paramValueGreen: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
  },
  paramValueOrange: {
    color: '#F7931A',
    fontSize: 12,
    fontWeight: '800',
  },
  paramValueAmber: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '800',
  },
  balancePreviewBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  balancePreviewTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  submitBtn: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnBuy: {
    backgroundColor: '#10B981',
  },
  submitBtnSell: {
    backgroundColor: '#F43F5E',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  historySection: {
    backgroundColor: '#111726',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  historyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  historySubtitle: {
    color: '#64748B',
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 3,
    borderRadius: 8,
  },
  filterBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(247, 147, 26, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.4)',
  },
  filterBtnText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  filterBtnTextActive: {
    color: '#F7931A',
  },
  historyLoadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  historyLoadingText: {
    color: '#64748B',
    fontSize: 12,
  },
  emptyHistoryBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 8,
  },
  emptyHistoryEmoji: {
    fontSize: 32,
  },
  emptyHistoryTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyHistorySub: {
    color: '#64748B',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 360,
  },
  tableCard: {
    gap: 10,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
  },
  tableRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  orderMobileTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  orderMobileMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: 10,
    marginTop: 2,
  },
  rowDescMobile: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  rowAmountOrangeMobile: {
    color: '#F7931A',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  rowAmountGreenMobile: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  orderMobileBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 6,
    marginTop: 2,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  actionTagBuy: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionTagSell: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  actionTagText: {
    fontSize: 10,
    fontWeight: '900',
  },
  actionTagTextBuy: {
    color: '#10B981',
  },
  actionTagTextSell: {
    color: '#F43F5E',
  },
  rowDesc: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  rowDate: {
    color: '#64748B',
    fontSize: 10,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rowAmountOrange: {
    color: '#F7931A',
    fontSize: 14,
    fontWeight: '900',
  },
  rowAmountGreen: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '900',
  },
  rowRate: {
    color: '#94A3B8',
    fontSize: 10,
  },
  statusCompletedPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginTop: 2,
  },
  statusCompletedText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#111726',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    gap: 16,
  },
  modalCardMobile: {
    padding: 16,
  },
  modalHeader: {
    gap: 4,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 12,
  },
  modalBody: {
    gap: 12,
  },
  modalSummaryBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    color: '#64748B',
    fontSize: 13,
  },
  modalValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalValueBold: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalValueGreen: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  modalValueAmber: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '800',
  },
  modalDisclaimer: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});

