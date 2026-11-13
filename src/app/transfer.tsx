import React, { useState, useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { StarRankIndicator } from '../components/StarRankIndicator';
import { LanguageSelector } from '../components/LanguageSelector';
import { useIsMobile } from '../hooks/useIsMobile';

type TransferMode = 'transfer' | 'withdraw';
type CurrencyType = 'USDT' | 'BTC';

interface VerifiedRecipient {
  id: string;
  username: string;
  fullName: string;
  referralCode: string;
  starRank?: number;
  starBadge?: string;
  starIcon?: string;
  isStarQualified?: boolean;
}

interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

const BTC_PRICE_USD = 82420;
const PAGE_SIZE = 15;

export default function TransferScreen() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Active view states
  const [mode, setMode] = useState<TransferMode>('transfer');
  const [currency, setCurrency] = useState<CurrencyType>('USDT');

  // User & Balances
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Form Fields - Transfer
  const [recipientInput, setRecipientInput] = useState('');
  const [verifiedRecipient, setVerifiedRecipient] = useState<VerifiedRecipient | null>(null);
  const [checkingRecipient, setCheckingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferPercent, setTransferPercent] = useState<number | null>(null);

  // Form Fields - Withdraw
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNetwork, setWithdrawNetwork] = useState('TRC20');
  const [withdrawPercent, setWithdrawPercent] = useState<number | null>(null);

  // Confirmation Modal
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Feedback Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Transaction Ledger
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const [txFilter, setTxFilter] = useState<'ALL' | 'TRANSFER' | 'WITHDRAWAL'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadUserData();
    loadTransactions();
  }, []);

  // Update default network and recalculate percentage amount when currency switches
  useEffect(() => {
    if (currency === 'USDT') {
      setWithdrawNetwork('TRC20');
    } else {
      setWithdrawNetwork('Native SegWit');
    }

    if (transferPercent !== null && user?.wallet) {
      const rawBal = currency === 'USDT' ? (user.wallet.usdBalance ?? 0) : (user.wallet.btcBalance ?? 0);
      const maxVal = Math.max(0, Number(rawBal) || 0);
      setTransferAmount((maxVal * (transferPercent / 100)).toFixed(currency === 'USDT' ? 2 : 8));
    }
    if (withdrawPercent !== null && user?.wallet) {
      const rawBal = currency === 'USDT' ? (user.wallet.usdBalance ?? 0) : (user.wallet.btcBalance ?? 0);
      const maxVal = Math.max(0, Number(rawBal) || 0);
      setWithdrawAmount((maxVal * (withdrawPercent / 100)).toFixed(currency === 'USDT' ? 2 : 8));
    }
  }, [currency]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadUserData = async () => {
    setLoadingUser(true);
    try {
      const res = await api.getMe();
      if (res.user) {
        setUser(res.user);
      }
    } catch (err: any) {
      if (err.message && err.message.includes('401')) {
        router.replace('/login' as any);
      } else {
        showToast(err.message || 'Failed to load user data', 'error');
      }
    } finally {
      setLoadingUser(false);
    }
  };

  const loadTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await api.getTransactions(200);
      if (res.transactions) {
        setTransactions(res.transactions);
      }
    } catch (err) {
      console.warn('Failed to load transaction history:', err);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleVerifyRecipient = async () => {
    const query = recipientInput.trim();
    if (!query) {
      setRecipientError('Please enter a recipient username, email, or code');
      setVerifiedRecipient(null);
      return;
    }

    setCheckingRecipient(true);
    setRecipientError('');
    setVerifiedRecipient(null);

    try {
      const res = await api.lookupRecipient(query);
      if (res.success && res.user) {
        setVerifiedRecipient(res.user);
        setRecipientError('');
      } else {
        setRecipientError(res.message || t('transfer.pleaseVerifyRecipient'));
      }
    } catch (err: any) {
      setRecipientError(err.message || t('transfer.cannotTransferToSelf'));
    } finally {
      setCheckingRecipient(false);
    }
  };

  // Quick Amount Percentage selector
  const handleSelectPercentage = (percent: number) => {
    const rawBal = currency === 'USDT' ? (user?.wallet?.usdBalance ?? 0) : (user?.wallet?.btcBalance ?? 0);
    const maxVal = Math.max(0, Number(rawBal) || 0);
    const calculated = (maxVal * percent).toFixed(currency === 'USDT' ? 2 : 8);
    const percentInt = Math.round(percent * 100);

    if (mode === 'transfer') {
      setTransferAmount(calculated);
      setTransferPercent(percentInt);
    } else {
      setWithdrawAmount(calculated);
      setWithdrawPercent(percentInt);
    }
  };

  // Use Saved Profile Address
  const handleUseSavedAddress = () => {
    if (!user) return;
    if (currency === 'USDT') {
      if (withdrawNetwork === 'ERC20' && (user.usdtErc20PayoutAddress || user.usdtPayoutAddress)) {
        setWithdrawAddress(user.usdtErc20PayoutAddress || user.usdtPayoutAddress);
        showToast('USDT (ERC20): ' + (user.usdtErc20PayoutAddress || user.usdtPayoutAddress));
      } else if (withdrawNetwork === 'TRC20' && (user.usdtTrc20PayoutAddress || user.usdtPayoutAddress)) {
        setWithdrawAddress(user.usdtTrc20PayoutAddress || user.usdtPayoutAddress);
        showToast('USDT (TRC20): ' + (user.usdtTrc20PayoutAddress || user.usdtPayoutAddress));
      } else if (user.usdtTrc20PayoutAddress || user.usdtPayoutAddress || user.usdtErc20PayoutAddress) {
        setWithdrawAddress(user.usdtTrc20PayoutAddress || user.usdtPayoutAddress || user.usdtErc20PayoutAddress);
        showToast('USDT: ' + (user.usdtTrc20PayoutAddress || user.usdtPayoutAddress || user.usdtErc20PayoutAddress));
      } else {
        showToast(t('transfer.enterValidAddress'), 'error');
      }
    } else {
      if (user.btcPayoutAddress) {
        setWithdrawAddress(user.btcPayoutAddress);
        showToast('BTC: ' + user.btcPayoutAddress);
      } else {
        showToast(t('transfer.enterValidAddress'), 'error');
      }
    }
  };

  // Validation before opening confirmation modal
  const handleInitiateAction = () => {
    if (mode === 'transfer') {
      const amt = parseFloat(transferAmount);
      if (!verifiedRecipient) {
        showToast(t('transfer.pleaseVerifyRecipient'), 'error');
        return;
      }
      if (isNaN(amt) || amt <= 0) {
        showToast(t('transfer.invalidAmount'), 'error');
        return;
      }
      if (currency === 'USDT' && amt < 5) {
        showToast(t('transfer.minTransferUsdt'), 'error');
        return;
      }
      if (currency === 'BTC' && amt < 0.00005) {
        showToast(t('transfer.minTransferBtc'), 'error');
        return;
      }
      const available = currency === 'USDT' ? (user?.wallet?.usdBalance || 0) : (user?.wallet?.btcBalance || 0);
      if (amt > available) {
        showToast(t('transfer.insufficientFunds', { currency }), 'error');
        return;
      }
      setConfirmModalVisible(true);
    } else {
      const amt = parseFloat(withdrawAmount);
      const addr = withdrawAddress.trim();
      if (!addr || addr.length < 15) {
        showToast(t('transfer.enterValidAddress'), 'error');
        return;
      }
      if (isNaN(amt) || amt <= 0) {
        showToast(t('transfer.invalidAmount'), 'error');
        return;
      }
      if (currency === 'USDT' && amt < 10) {
        showToast(t('transfer.minWithdrawUsdt'), 'error');
        return;
      }
      if (currency === 'BTC' && amt < 0.0001) {
        showToast(t('transfer.minWithdrawBtc'), 'error');
        return;
      }
      const available = currency === 'USDT' ? (user?.wallet?.usdBalance || 0) : (user?.wallet?.btcBalance || 0);
      if (amt > available) {
        showToast(t('transfer.insufficientFunds', { currency }), 'error');
        return;
      }
      setConfirmModalVisible(true);
    }
  };

  // Final Submission
  const handleExecuteTransfer = async () => {
    setSubmitting(true);
    try {
      if (mode === 'transfer') {
        const amt = parseFloat(transferAmount);
        const res = await api.transferFunds({
          recipient: verifiedRecipient!.username,
          currency,
          amount: amt,
          note: transferNote.trim(),
        });

        if (res.success) {
          showToast(t('transfer.transferSuccess'));
          setConfirmModalVisible(false);
          setTransferAmount('');
          setTransferNote('');
          setTransferPercent(null);
          setRecipientInput('');
          setVerifiedRecipient(null);
          // Refresh user data & ledger
          await loadUserData();
          await loadTransactions();
        }
      } else {
        const amt = parseFloat(withdrawAmount);
        const res = await api.withdrawFunds({
          currency,
          amount: amt,
          destinationAddress: withdrawAddress.trim(),
          network: withdrawNetwork,
        });

        if (res.success) {
          showToast(t('transfer.withdrawSuccess'));
          setConfirmModalVisible(false);
          setWithdrawAmount('');
          setWithdrawAddress('');
          setWithdrawPercent(null);
          // Refresh user data & ledger
          await loadUserData();
          await loadTransactions();
        }
      }
    } catch (err: any) {
      showToast(err.message || t('transfer.txFailed'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(t('transfer.copied', { label }));
    } else {
      showToast(`${label}: ${text}`);
    }
  };

  // Filtered transactions for the ledger (Wallet Deposits & Direct Referral Bonuses excluded)
  const filteredTransactions = transactions.filter((tx) => {
    if (tx.type === 'WALLET_DEPOSIT' || tx.type === 'DIRECT_REFERRAL_BONUS') {
      return false;
    }
    if (txFilter === 'TRANSFER') {
      return tx.type === 'TRANSFER_SENT' || tx.type === 'TRANSFER_RECEIVED';
    }
    if (txFilter === 'WITHDRAWAL') {
      return tx.type === 'WITHDRAWAL' || tx.type === 'WITHDRAWAL_REFUND';
    }
    return true; // Show all remaining transactions
  });

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (effectivePage - 1) * PAGE_SIZE,
    effectivePage * PAGE_SIZE
  );

  const handleSetFilter = (newFilter: 'ALL' | 'TRANSFER' | 'WITHDRAWAL') => {
    setTxFilter(newFilter);
    setCurrentPage(1);
  };

  const availableUsdt = user?.wallet?.usdBalance || 0;
  const availableBtc = user?.wallet?.btcBalance || 0;
  const currentAvailable = currency === 'USDT' ? availableUsdt : availableBtc;
  const currentValuation =
    currency === 'USDT'
      ? parseFloat(transferAmount || withdrawAmount || '0')
      : parseFloat(transferAmount || withdrawAmount || '0') * BTC_PRICE_USD;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      {/* Top Navbar */}
      <View style={[styles.navbar, isMobile && styles.navbarMobile]}>
        <View style={styles.navLeft}>
          <TouchableOpacity onPress={() => router.replace('/dashboard' as any)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← {t('common.dashboard')}</Text>
          </TouchableOpacity>
          <View style={styles.brandRow}>
            <View style={styles.btcBadge}>
              <Text style={styles.btcBadgeText}>⇄</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>{t('transfer.title')}</Text>
              <Text style={styles.brandSubtitle}>{t('transfer.subtitle')}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.navRight, isMobile && styles.navRightMobile]}>
          <LanguageSelector compact />
          {user && (
            <TouchableOpacity
              style={styles.profileBadgeBtn}
              onPress={() => router.push('/profile' as any)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.profileBadgeText}>👤 @{user.username}</Text>
                {Boolean(user.isStarQualified || (user.starRank && user.starRank >= 1)) && (
                  <StarRankIndicator rank={user.starRank || 1} badge={user.starBadge || ((user.starRank || 0) >= 10 ? '3 CROWN' : (user.starRank || 0) === 9 ? '2 CROWN' : (user.starRank || 0) === 8 ? 'CROWN' : `${user.starRank || 1}★`)} size="xs" />
                )}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Toast Notice */}
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
          <Text style={styles.loadingText}>{t('transfer.connectingLedger')}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* Live Balance Overview Cards */}
          <View style={[styles.balanceCardRow, isMobile && styles.balanceCardRowMobile]}>
            {/* USDT Card */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.balanceCard,
                currency === 'USDT' && styles.balanceCardActiveUSDT,
              ]}
              onPress={() => setCurrency('USDT')}
            >
              <View style={styles.balanceHeader}>
                <View style={styles.coinIconUSDT}>
                  <Text style={styles.coinIconText}>₮</Text>
                </View>
                <View>
                  <Text style={styles.coinTitle}>{t('transfer.usdtTitle')}</Text>
                  <Text style={styles.coinSubtitle}>{t('transfer.usdtSub')}</Text>
                </View>
                {currency === 'USDT' && <View style={styles.activePill}><Text style={styles.activePillText}>{t('transfer.selected')}</Text></View>}
              </View>
              <Text style={styles.balanceAmountGreen}>
                {availableUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </Text>
              <Text style={styles.balanceSubtext}>
                {t('transfer.usdtNote')}
              </Text>
            </TouchableOpacity>

            {/* BTC Card */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.balanceCard,
                currency === 'BTC' && styles.balanceCardActiveBTC,
              ]}
              onPress={() => setCurrency('BTC')}
            >
              <View style={styles.balanceHeader}>
                <View style={styles.coinIconBTC}>
                  <Text style={styles.coinIconText}>₿</Text>
                </View>
                <View>
                  <Text style={styles.coinTitle}>{t('transfer.btcTitle')}</Text>
                  <Text style={styles.coinSubtitle}>{t('transfer.btcSub')}</Text>
                </View>
                {currency === 'BTC' && <View style={styles.activePillGold}><Text style={styles.activePillTextGold}>{t('transfer.selected')}</Text></View>}
              </View>
              <Text style={styles.balanceAmountGold}>
                ₿ {availableBtc.toFixed(8)} BTC
              </Text>
              <Text style={styles.balanceSubtext}>
                {t('transfer.btcMarketVal', { amount: (availableBtc * BTC_PRICE_USD).toFixed(2) })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.modeTabsWrapper}>
            <TouchableOpacity
              style={[styles.modeTab, mode === 'transfer' && styles.modeTabActive]}
              onPress={() => {
                setMode('transfer');
                setRecipientError('');
              }}
            >
              <Text style={[styles.modeTabText, mode === 'transfer' && styles.modeTabTextActive]}>
                {t('transfer.tabTransfer')}
              </Text>
              <Text style={styles.modeTabSub}>{t('transfer.tabTransferSub')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, mode === 'withdraw' && styles.modeTabActive]}
              onPress={() => setMode('withdraw')}
            >
              <Text style={[styles.modeTabText, mode === 'withdraw' && styles.modeTabTextActive]}>
                {t('transfer.tabWithdraw')}
              </Text>
              <Text style={styles.modeTabSub}>{t('transfer.tabWithdrawSub')}</Text>
            </TouchableOpacity>
          </View>

          {/* MAIN TRANSACTION CARD */}
          <View style={styles.mainCard}>
            {/* Header info */}
            <View style={styles.cardTopHeader}>
              <View>
                <Text style={styles.cardHeaderTitle}>
                  {mode === 'transfer' ? t('transfer.sendToMember') : t('transfer.withdrawToWallet')}
                </Text>
                <Text style={styles.cardHeaderSub}>
                  {mode === 'transfer'
                    ? t('transfer.transferDesc')
                    : t('transfer.withdrawDesc')}
                </Text>
              </View>

              {/* Currency Picker Pills */}
              <View style={styles.currencyPills}>
                <TouchableOpacity
                  style={[styles.currPill, currency === 'USDT' && styles.currPillActiveUSDT]}
                  onPress={() => setCurrency('USDT')}
                >
                  <Text style={[styles.currPillText, currency === 'USDT' && styles.currPillTextActive]}>
                    USDT
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.currPill, currency === 'BTC' && styles.currPillActiveBTC]}
                  onPress={() => setCurrency('BTC')}
                >
                  <Text style={[styles.currPillText, currency === 'BTC' && styles.currPillTextActive]}>
                    BTC
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* MODE 1: INTERNAL TRANSFER FORM */}
            {mode === 'transfer' && (
              <View style={styles.formContainer}>
                {/* Recipient Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('transfer.recipientLabel')}</Text>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={[styles.textInput, styles.inputFlex]}
                      placeholder={t('transfer.recipientPlaceholder')}
                      placeholderTextColor="#4B5563"
                      value={recipientInput}
                      onChangeText={(val) => {
                        setRecipientInput(val);
                        setVerifiedRecipient(null);
                        setRecipientError('');
                      }}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={[styles.verifyBtn, checkingRecipient && styles.btnDisabled]}
                      onPress={handleVerifyRecipient}
                      disabled={checkingRecipient}
                    >
                      {checkingRecipient ? (
                        <ActivityIndicator color="#0B0E14" size="small" />
                      ) : (
                        <Text style={styles.verifyBtnText}>{t('transfer.verifyMember')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Verification Results */}
                  {verifiedRecipient && (
                    <View style={styles.verifiedBox}>
                      <Text style={styles.verifiedCheck}>✓</Text>
                      <View style={styles.verifiedInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.verifiedName}>
                            {verifiedRecipient.fullName || verifiedRecipient.username} (@{verifiedRecipient.username})
                          </Text>
                          {Boolean(verifiedRecipient.isStarQualified || (verifiedRecipient.starRank && verifiedRecipient.starRank >= 1)) && (
                            <StarRankIndicator rank={verifiedRecipient.starRank || 1} badge={verifiedRecipient.starBadge || ((verifiedRecipient.starRank || 0) >= 10 ? '3 CROWN' : (verifiedRecipient.starRank || 0) === 9 ? '2 CROWN' : (verifiedRecipient.starRank || 0) === 8 ? 'CROWN' : `${verifiedRecipient.starRank || 1}★`)} size="xs" />
                          )}
                        </View>
                        <Text style={styles.verifiedCode}>
                          {t('transfer.nodeReferralCode', { code: verifiedRecipient.referralCode })}
                        </Text>
                      </View>
                    </View>
                  )}

                  {recipientError ? (
                    <Text style={styles.errorText}>⚠️ {recipientError}</Text>
                  ) : null}

                  {/* Quick suggestions if user has a sponsor */}
                  {Boolean(user?.sponsor?.username && !verifiedRecipient) ? (
                    <View style={styles.suggestionRow}>
                      <Text style={styles.suggestionLabel}>{t('transfer.quickSuggestion')}</Text>
                      <TouchableOpacity
                        style={styles.suggestionPill}
                        onPress={() => {
                          setRecipientInput(user.sponsor.username);
                          setVerifiedRecipient(null);
                        }}
                      >
                        <Text style={styles.suggestionText}>
                          {t('transfer.sponsor', { username: user.sponsor.username })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.amountLabelRow}>
                    <Text style={styles.inputLabel}>{t('transfer.transferAmountLabel', { currency })}</Text>
                    <Text style={styles.availableLabel}>
                      {t('transfer.available', { amount: currentAvailable.toLocaleString(), currency })}
                    </Text>
                  </View>

                  <View style={styles.amountInputRow}>
                    <TextInput
                      style={styles.amountInput}
                      placeholder={currency === 'USDT' ? '0.00' : '0.00000000'}
                      placeholderTextColor="#4B5563"
                      keyboardType="numeric"
                      value={transferAmount}
                      onChangeText={(val) => {
                        setTransferAmount(val);
                        setTransferPercent(null);
                      }}
                    />
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{currency}</Text>
                    </View>
                  </View>

                  {/* Quick percentage buttons */}
                  <View style={styles.quickPercentRow}>
                    <TouchableOpacity
                      style={[styles.percentBtn, transferPercent === 25 && styles.percentBtnActive]}
                      onPress={() => handleSelectPercentage(0.25)}
                    >
                      <Text style={[styles.percentBtnText, transferPercent === 25 && styles.percentBtnTextActive]}>25%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentBtn, transferPercent === 50 && styles.percentBtnActive]}
                      onPress={() => handleSelectPercentage(0.5)}
                    >
                      <Text style={[styles.percentBtnText, transferPercent === 50 && styles.percentBtnTextActive]}>50%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentBtn, transferPercent === 75 && styles.percentBtnActive]}
                      onPress={() => handleSelectPercentage(0.75)}
                    >
                      <Text style={[styles.percentBtnText, transferPercent === 75 && styles.percentBtnTextActive]}>75%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentBtn, transferPercent === 100 && styles.percentBtnActive]}
                      onPress={() => handleSelectPercentage(1)}
                    >
                      <Text style={[styles.percentBtnText, transferPercent === 100 && styles.percentBtnTextActive]}>{t('transfer.maxPercent')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Optional Note */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('transfer.memoLabel')}</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder={t('transfer.memoPlaceholder')}
                    placeholderTextColor="#4B5563"
                    value={transferNote}
                    onChangeText={setTransferNote}
                  />
                </View>

                {/* Transfer Breakdown Box */}
                <View style={styles.breakdownBox}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{t('transfer.recipientNode')}</Text>
                    <Text style={styles.breakdownValCyan}>
                      {verifiedRecipient ? `@${verifiedRecipient.username}` : t('transfer.notVerifiedYet')}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{t('transfer.transferAmount')}</Text>
                    <Text style={styles.breakdownValWhite}>
                      {transferAmount || '0'} {currency}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{t('transfer.estimatedValue')}</Text>
                    <Text style={styles.breakdownValSub}>
                      ≈ {currentValuation.toFixed(2)} USDT
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{t('transfer.internalFee')}</Text>
                    <Text style={styles.breakdownValGreen}>{t('transfer.freeFee', { currency })}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
                    <Text style={styles.breakdownTotalLabel}>{t('transfer.totalDeducted')}</Text>
                    <Text style={styles.breakdownTotalVal}>
                      {transferAmount || '0'} {currency}
                    </Text>
                  </View>
                </View>

                {/* Submit Action */}
                <TouchableOpacity
                  style={[styles.actionSubmitBtn, !verifiedRecipient && styles.btnDisabled]}
                  onPress={handleInitiateAction}
                  disabled={!verifiedRecipient}
                >
                  <Text style={styles.actionSubmitBtnText}>
                    {t('transfer.confirmSendBtn', { amount: transferAmount || '0', currency })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* MODE 2: WITHDRAWAL FORM */}
            {mode === 'withdraw' && (
              <View style={styles.formContainer}>
                {/* Network Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{t('transfer.chooseNetwork')}</Text>
                  {currency === 'USDT' ? (
                    <View style={styles.networkSelectRow}>
                      <TouchableOpacity
                        style={[styles.networkBtn, withdrawNetwork === 'TRC20' && styles.networkBtnActive]}
                        onPress={() => setWithdrawNetwork('TRC20')}
                      >
                        <Text style={[styles.networkBtnText, withdrawNetwork === 'TRC20' && styles.networkBtnTextActive]}>
                          TRC20 (Tron)
                        </Text>
                        <Text style={styles.networkBadge}>{t('transfer.recommended')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.networkBtn, withdrawNetwork === 'ERC20' && styles.networkBtnActive]}
                        onPress={() => setWithdrawNetwork('ERC20')}
                      >
                        <Text style={[styles.networkBtnText, withdrawNetwork === 'ERC20' && styles.networkBtnTextActive]}>
                          ERC20 (Ethereum)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.networkBtn, withdrawNetwork === 'BEP20' && styles.networkBtnActive]}
                        onPress={() => setWithdrawNetwork('BEP20')}
                      >
                        <Text style={[styles.networkBtnText, withdrawNetwork === 'BEP20' && styles.networkBtnTextActive]}>
                          BEP20 (BNB)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.networkSelectRow}>
                      <TouchableOpacity
                        style={[styles.networkBtn, withdrawNetwork === 'Native SegWit' && styles.networkBtnActive]}
                        onPress={() => setWithdrawNetwork('Native SegWit')}
                      >
                        <Text style={[styles.networkBtnText, withdrawNetwork === 'Native SegWit' && styles.networkBtnTextActive]}>
                          Native SegWit (bc1)
                        </Text>
                        <Text style={styles.networkBadge}>{t('transfer.fastest')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.networkBtn, withdrawNetwork === 'Taproot' && styles.networkBtnActive]}
                        onPress={() => setWithdrawNetwork('Taproot')}
                      >
                        <Text style={[styles.networkBtnText, withdrawNetwork === 'Taproot' && styles.networkBtnTextActive]}>
                          Taproot (bc1p)
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.networkBtn, withdrawNetwork === 'Legacy' && styles.networkBtnActive]}
                        onPress={() => setWithdrawNetwork('Legacy')}
                      >
                        <Text style={[styles.networkBtnText, withdrawNetwork === 'Legacy' && styles.networkBtnTextActive]}>
                          Legacy (1...)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Destination Wallet Address Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.amountLabelRow}>
                    <Text style={styles.inputLabel}>{t('transfer.destAddressLabel', { currency })}</Text>
                    <TouchableOpacity onPress={handleUseSavedAddress}>
                      <Text style={styles.savedAddressLink}>{t('transfer.useSavedAddress')}</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.textInput, styles.monoInput]}
                    placeholder={t('transfer.addressPlaceholder', { currency })}
                    placeholderTextColor="#4B5563"
                    value={withdrawAddress}
                    onChangeText={setWithdrawAddress}
                    autoCapitalize="none"
                  />
                  <Text style={styles.fieldHint}>
                    {t('transfer.addressHint')}
                  </Text>
                </View>

                {/* Amount Input */}
                <View style={styles.inputGroup}>
                  <View style={styles.amountLabelRow}>
                    <Text style={styles.inputLabel}>{t('transfer.withdrawAmountLabel', { currency })}</Text>
                    <Text style={styles.availableLabel}>
                      {t('transfer.available', { amount: currentAvailable.toLocaleString(), currency })}
                    </Text>
                  </View>

                  <View style={styles.amountInputRow}>
                    <TextInput
                      style={styles.amountInput}
                      placeholder={currency === 'USDT' ? 'Min 10.00' : 'Min 0.00010000'}
                      placeholderTextColor="#4B5563"
                      keyboardType="numeric"
                      value={withdrawAmount}
                      onChangeText={(val) => {
                        setWithdrawAmount(val);
                        setWithdrawPercent(null);
                      }}
                    />
                    <View style={styles.currencyBadge}>
                      <Text style={styles.currencyBadgeText}>{currency}</Text>
                    </View>
                  </View>

                  {/* Quick percentage buttons */}
                  <View style={styles.quickPercentRow}>
                    <TouchableOpacity
                      style={[styles.percentBtn, withdrawPercent === 25 && styles.percentBtnActive]}
                      onPress={() => handleSelectPercentage(0.25)}
                    >
                      <Text style={[styles.percentBtnText, withdrawPercent === 25 && styles.percentBtnTextActive]}>25%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentBtn, withdrawPercent === 50 && styles.percentBtnActive]}
                      onPress={() => handleSelectPercentage(0.5)}
                    >
                      <Text style={[styles.percentBtnText, withdrawPercent === 50 && styles.percentBtnTextActive]}>50%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentBtn, withdrawPercent === 75 && styles.percentBtnActive]}
                      onPress={() => handleSelectPercentage(0.75)}
                    >
                      <Text style={[styles.percentBtnText, withdrawPercent === 75 && styles.percentBtnTextActive]}>75%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.percentBtn, withdrawPercent === 100 && styles.percentBtnActive]}
                      onPress={() => handleSelectPercentage(1)}
                    >
                      <Text style={[styles.percentBtnText, withdrawPercent === 100 && styles.percentBtnTextActive]}>{t('transfer.maxPercent')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Withdrawal Breakdown */}
                <View style={styles.breakdownBox}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{t('transfer.selectedNetwork')}</Text>
                    <Text style={styles.breakdownValCyan}>{withdrawNetwork}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{t('transfer.destinationAddress')}</Text>
                    <Text style={styles.breakdownValWhite} numberOfLines={1}>
                      {withdrawAddress
                        ? `${withdrawAddress.slice(0, 10)}...${withdrawAddress.slice(-6)}`
                        : t('transfer.noneKeyedIn')}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{t('transfer.withdrawalAmount')}</Text>
                    <Text style={styles.breakdownValWhite}>
                      {withdrawAmount || '0'} {currency}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{t('transfer.poolSubsidyFee')}</Text>
                    <Text style={styles.breakdownValGreen}>{t('transfer.coveredFee', { currency })}</Text>
                  </View>
                  <View style={[styles.breakdownRow, styles.breakdownRowTotal]}>
                    <Text style={styles.breakdownTotalLabel}>{t('transfer.netAmountDispatched')}</Text>
                    <Text style={styles.breakdownTotalValGold}>
                      {withdrawAmount || '0'} {currency}
                    </Text>
                  </View>
                </View>

                {/* Submit Action */}
                <TouchableOpacity
                  style={[styles.actionSubmitBtnWithdraw, (!withdrawAddress || !withdrawAmount) && styles.btnDisabled]}
                  onPress={handleInitiateAction}
                  disabled={!withdrawAddress || !withdrawAmount}
                >
                  <Text style={styles.actionSubmitBtnText}>
                    {t('transfer.dispatchWithdrawBtn', { amount: withdrawAmount || '0', currency })}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* AUDIT & TRANSACTION LEDGER */}
          <View style={styles.ledgerSection}>
            <View style={styles.ledgerHeaderRow}>
              <View>
                <Text style={styles.ledgerTitle}>
                  {t('transfer.ledgerTitle', { count: filteredTransactions.length })}
                </Text>
                <Text style={styles.ledgerSubtitle}>
                  {t('transfer.ledgerShowing', {
                    start: filteredTransactions.length > 0 ? (effectivePage - 1) * PAGE_SIZE + 1 : 0,
                    end: Math.min(effectivePage * PAGE_SIZE, filteredTransactions.length),
                    total: filteredTransactions.length,
                  })}
                </Text>
              </View>

              <View style={styles.ledgerFilterRow}>
                <TouchableOpacity
                  style={[styles.ledgerFilterBtn, txFilter === 'ALL' && styles.ledgerFilterBtnActive]}
                  onPress={() => handleSetFilter('ALL')}
                >
                  <Text style={[styles.ledgerFilterText, txFilter === 'ALL' && styles.ledgerFilterTextActive]}>{t('transfer.filterAll')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ledgerFilterBtn, txFilter === 'TRANSFER' && styles.ledgerFilterBtnActive]}
                  onPress={() => handleSetFilter('TRANSFER')}
                >
                  <Text style={[styles.ledgerFilterText, txFilter === 'TRANSFER' && styles.ledgerFilterTextActive]}>{t('transfer.filterTransfers')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ledgerFilterBtn, txFilter === 'WITHDRAWAL' && styles.ledgerFilterBtnActive]}
                  onPress={() => handleSetFilter('WITHDRAWAL')}
                >
                  <Text style={[styles.ledgerFilterText, txFilter === 'WITHDRAWAL' && styles.ledgerFilterTextActive]}>{t('transfer.filterWithdrawals')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingTx ? (
              <ActivityIndicator color="#F7931A" style={{ marginVertical: 20 }} />
            ) : filteredTransactions.length === 0 ? (
              <View style={styles.emptyLedgerBox}>
                <Text style={styles.emptyLedgerIcon}>📂</Text>
                <Text style={styles.emptyLedgerTitle}>{t('transfer.noHistoryFound')}</Text>
                <Text style={styles.emptyLedgerSub}>
                  {t('transfer.noHistorySub')}
                </Text>
              </View>
            ) : (
              <View style={styles.ledgerList}>
                {paginatedTransactions.map((tx, index) => {
                  if (!tx) return null;

                  const isIncome = [
                    'TRANSFER_RECEIVED',
                    'TRANSFER_IN',
                    'BINARY_PAIRING_BONUS',
                    'MINING_DAILY_YIELD',
                    'MINING_YIELD',
                    'WITHDRAWAL_REFUND',
                    'DIRECT_REFERRAL_BONUS',
                    'WALLET_DEPOSIT',
                  ].includes(tx.type) || Number(tx.amount || 0) > 0;

                  const getTxLabel = (type?: string) => {
                    if (!type) return 'Transaction';
                    switch (type) {
                      case 'TRANSFER_SENT':
                      case 'TRANSFER_OUT':
                        return t('transfer.txTypes.transferSent');
                      case 'TRANSFER_RECEIVED':
                      case 'TRANSFER_IN':
                        return t('transfer.txTypes.transferReceived');
                      case 'WITHDRAWAL':
                        return t('transfer.txTypes.withdrawal');
                      case 'WITHDRAWAL_REFUND':
                        return t('transfer.txTypes.withdrawalRefund');
                      case 'BINARY_PAIRING_BONUS':
                        return t('transfer.txTypes.binaryBonus');
                      case 'MINING_DAILY_YIELD':
                      case 'MINING_YIELD':
                        return t('transfer.txTypes.miningYield');
                      case 'SERVICE_PURCHASE':
                      case 'PACKAGE_PURCHASE':
                        return t('transfer.txTypes.servicePurchase');
                      case 'BINARY_PAIRING_CONFISCATED':
                        return t('transfer.txTypes.binaryConfiscated');
                      case 'DIRECT_REFERRAL_BONUS':
                        return t('transfer.txTypes.referralBonus');
                      case 'WALLET_DEPOSIT':
                        return t('transfer.txTypes.walletDeposit');
                      case 'ADMIN_ADJUSTMENT':
                        return t('transfer.txTypes.adminAdjustment');
                      default:
                        return String(type).replace(/_/g, ' ');
                    }
                  };

                  const isConfiscated = tx.type === 'BINARY_PAIRING_CONFISCATED';

                  const numAmount = Math.abs(Number(tx.amount || 0));
                  const formattedAmount =
                    tx.currency === 'BTC'
                      ? `₿ ${numAmount.toFixed(8)} BTC`
                      : `${numAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ${tx.currency || 'USDT'}`;

                  const txKey = tx.id || (tx as any)._id || `tx-${index}`;
                  const formattedDate = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : 'N/A';
                  const descriptionText = typeof tx.description === 'string' ? tx.description : String(tx.description || '');
                  const txHash = tx.metadata && typeof tx.metadata === 'object' && tx.metadata.txHash ? String(tx.metadata.txHash) : null;

                  return (
                    <View key={txKey} style={styles.ledgerCard}>
                      <View style={styles.ledgerLeft}>
                        <View style={[styles.txIconBubble, isConfiscated ? { backgroundColor: 'rgba(239, 68, 68, 0.15)' } : (isIncome ? styles.bubbleGreen : styles.bubbleOrange)]}>
                          <Text style={[styles.txIconChar, isConfiscated ? { color: '#EF4444' } : null]}>
                            {isConfiscated ? '🚫' : (isIncome ? '↙' : '↗')}
                          </Text>
                        </View>
                        <View style={styles.txMainInfo}>
                          <Text style={styles.txTypeTitle}>
                            {getTxLabel(tx.type)}
                          </Text>
                          <Text style={styles.txDesc} numberOfLines={2}>
                            {descriptionText}
                          </Text>
                          <Text style={styles.txDate}>
                            {formattedDate}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.ledgerRight}>
                        <Text style={[styles.txAmount, isConfiscated ? { color: '#EF4444' } : (isIncome ? styles.txAmountGreen : styles.txAmountRed)]}>
                          {isConfiscated ? '✕ ' : (isIncome ? '+' : '-')}{formattedAmount}
                        </Text>
                        <View style={[styles.statusPill, isConfiscated ? { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: 'rgba(239, 68, 68, 0.5)' } : null]}>
                          <Text style={[styles.statusPillText, isConfiscated ? { color: '#EF4444' } : null]}>
                            {isConfiscated ? t('transfer.statusConfiscated') : t('transfer.statusCompleted')}
                          </Text>
                        </View>

                        {txHash ? (
                          <TouchableOpacity
                            style={styles.copyHashBtn}
                            onPress={() => copyToClipboard(txHash, t('transfer.copyTxHash'))}
                          >
                            <Text style={styles.copyHashText}>{t('transfer.copyTxHash')}</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationRow}>
                <TouchableOpacity
                  style={[styles.pageNavBtn, effectivePage === 1 && styles.pageNavBtnDisabled]}
                  onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={effectivePage === 1}
                >
                  <Text style={[styles.pageNavBtnText, effectivePage === 1 && styles.pageNavBtnTextDisabled]}>
                    {t('transfer.previous')}
                  </Text>
                </TouchableOpacity>

                <View style={styles.pageNumbersCluster}>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - effectivePage) <= 2)
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <Text style={styles.pageEllipsis}>...</Text>}
                          <TouchableOpacity
                            style={[styles.pageNumBtn, effectivePage === p && styles.pageNumBtnActive]}
                            onPress={() => setCurrentPage(p)}
                          >
                            <Text style={[styles.pageNumText, effectivePage === p && styles.pageNumTextActive]}>
                              {p}
                            </Text>
                          </TouchableOpacity>
                        </React.Fragment>
                      );
                    })}
                </View>

                <TouchableOpacity
                  style={[styles.pageNavBtn, effectivePage === totalPages && styles.pageNavBtnDisabled]}
                  onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={effectivePage === totalPages}
                >
                  <Text style={[styles.pageNavBtnText, effectivePage === totalPages && styles.pageNavBtnTextDisabled]}>
                    {t('transfer.next')}
                  </Text>
                </TouchableOpacity>
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
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isMobile && styles.modalCardMobile]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {mode === 'transfer' ? t('transfer.confirmTransferTitle') : t('transfer.confirmWithdrawTitle')}
              </Text>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalNotice}>
                {t('transfer.confirmNotice')}
              </Text>

              <View style={styles.modalDetailBox}>
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>{t('transfer.txType')}</Text>
                  <Text style={styles.modalDetailValCyan}>
                    {mode === 'transfer' ? t('transfer.internalTransferType') : t('transfer.externalWithdrawType')}
                  </Text>
                </View>

                {mode === 'transfer' ? (
                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>{t('transfer.recipient')}</Text>
                    <Text style={styles.modalDetailValWhite}>
                      @{verifiedRecipient?.username} ({verifiedRecipient?.fullName || 'Node'})
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>{t('transfer.network')}</Text>
                      <Text style={styles.modalDetailValWhite}>{withdrawNetwork}</Text>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>{t('transfer.destinationAddress')}</Text>
                      <Text style={styles.modalDetailValWhite} numberOfLines={2}>
                        {withdrawAddress}
                      </Text>
                    </View>
                  </>
                )}

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>{t('transfer.assetCurrency')}</Text>
                  <Text style={styles.modalDetailValGold}>{currency}</Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>{t('transfer.authorizedAmount')}</Text>
                  <Text style={styles.modalDetailValLarge}>
                    {mode === 'transfer' ? transferAmount : withdrawAmount} {currency}
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>{t('transfer.estimatedValuation')}</Text>
                  <Text style={styles.modalDetailValSub}>≈ {currentValuation.toFixed(2)} USDT</Text>
                </View>
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setConfirmModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.modalCancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, submitting && styles.btnDisabled]}
                  onPress={handleExecuteTransfer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#0B0E14" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>
                      {t('transfer.authorizeDispatchBtn')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#0D1117',
    borderBottomWidth: 1,
    borderBottomColor: '#21262D',
  },
  navbarMobile: {
    paddingHorizontal: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    backgroundColor: '#161B22',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  backBtnText: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '700',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btcBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#00F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btcBadgeText: {
    color: '#00F0FF',
    fontSize: 16,
    fontWeight: '800',
  },
  brandTitle: {
    color: '#F0F6FC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: '#8B949E',
    fontSize: 11,
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navRightMobile: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  profileBadgeBtn: {
    backgroundColor: '#161B22',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  profileBadgeText: {
    color: '#E6EDF3',
    fontSize: 12,
    fontWeight: '700',
  },
  toastBox: {
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toastSuccess: {
    backgroundColor: '#064E3B',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  toastError: {
    backgroundColor: '#7F1D1D',
    borderWidth: 1,
    borderColor: '#EF4444',
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
    gap: 12,
  },
  loadingText: {
    color: '#8B949E',
    fontSize: 13,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 1080,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 60,
  },
  balanceCardRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  balanceCardRowMobile: {
    flexDirection: 'column',
  },
  balanceCard: {
    flex: 1,
    backgroundColor: '#121824',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  balanceCardActiveUSDT: {
    borderColor: '#00E676',
    backgroundColor: '#0F1E24',
  },
  balanceCardActiveBTC: {
    borderColor: '#F7931A',
    backgroundColor: '#1D1914',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  coinIconUSDT: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  coinIconBTC: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#451A03',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F7931A',
  },
  coinIconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  coinTitle: {
    color: '#E6EDF3',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  coinSubtitle: {
    color: '#8B949E',
    fontSize: 11,
  },
  activePill: {
    marginLeft: 'auto',
    backgroundColor: '#00E676',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    color: '#0B0E14',
    fontSize: 9,
    fontWeight: '900',
  },
  activePillGold: {
    marginLeft: 'auto',
    backgroundColor: '#F7931A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillTextGold: {
    color: '#0B0E14',
    fontSize: 9,
    fontWeight: '900',
  },
  balanceAmountGreen: {
    color: '#00E676',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceAmountGold: {
    color: '#F7931A',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceSubtext: {
    color: '#6E7681',
    fontSize: 11,
  },
  modeTabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modeTabText: {
    color: '#8B949E',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  modeTabTextActive: {
    color: '#00F0FF',
  },
  modeTabSub: {
    color: '#6B7280',
    fontSize: 10,
  },
  mainCard: {
    backgroundColor: '#121824',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 30,
  },
  cardTopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 12,
  },
  cardHeaderTitle: {
    color: '#F0F6FC',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardHeaderSub: {
    color: '#8B949E',
    fontSize: 12,
    maxWidth: 500,
  },
  currencyPills: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#0D1117',
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#21262D',
  },
  currPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currPillActiveUSDT: {
    backgroundColor: '#064E3B',
    borderWidth: 1,
    borderColor: '#00E676',
  },
  currPillActiveBTC: {
    backgroundColor: '#451A03',
    borderWidth: 1,
    borderColor: '#F7931A',
  },
  currPillText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  currPillTextActive: {
    color: '#FFFFFF',
  },
  formContainer: {
    gap: 18,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  amountLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availableLabel: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '700',
  },
  savedAddressLink: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputFlex: {
    flex: 1,
  },
  textInput: {
    backgroundColor: '#0B0E14',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F9FAFB',
    fontSize: 13,
  },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
  },
  verifyBtn: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 10,
  },
  verifyBtnText: {
    color: '#0B0E14',
    fontSize: 12,
    fontWeight: '800',
  },
  verifiedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#064E3B20',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 10,
    padding: 12,
  },
  verifiedCheck: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '900',
  },
  verifiedInfo: {
    flex: 1,
  },
  verifiedName: {
    color: '#00E676',
    fontSize: 13,
    fontWeight: '700',
  },
  verifiedCode: {
    color: '#A7F3D0',
    fontSize: 11,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionLabel: {
    color: '#6B7280',
    fontSize: 11,
  },
  suggestionPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suggestionText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0E14',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '800',
  },
  currencyBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  currencyBadgeText: {
    color: '#E5E7EB',
    fontSize: 12,
    fontWeight: '800',
  },
  quickPercentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  percentBtn: {
    flex: 1,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#2D3748',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  percentBtnActive: {
    borderColor: '#00F0FF',
    backgroundColor: '#00F0FF15',
  },
  percentBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
  },
  percentBtnTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  networkSelectRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  networkBtn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#0B0E14',
    borderWidth: 1,
    borderColor: '#1F2937',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  networkBtnActive: {
    borderColor: '#00F0FF',
    backgroundColor: '#00F0FF10',
  },
  networkBtnText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
  },
  networkBtnTextActive: {
    color: '#00F0FF',
  },
  networkBadge: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },
  fieldHint: {
    color: '#6B7280',
    fontSize: 11,
  },
  breakdownBox: {
    backgroundColor: '#0B0E14',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  breakdownValCyan: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownValWhite: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownValSub: {
    color: '#6B7280',
    fontSize: 12,
  },
  breakdownValGreen: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownRowTotal: {
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
    paddingTop: 8,
    marginTop: 4,
  },
  breakdownTotalLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  breakdownTotalVal: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '900',
  },
  breakdownTotalValGold: {
    color: '#F7931A',
    fontSize: 16,
    fontWeight: '900',
  },
  actionSubmitBtn: {
    backgroundColor: '#00E676',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#00E676',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  actionSubmitBtnWithdraw: {
    backgroundColor: '#F7931A',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#F7931A',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  actionSubmitBtnText: {
    color: '#0B0E14',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    opacity: 0.45,
  },
  ledgerSection: {
    marginTop: 10,
    gap: 16,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
  },
  ledgerTitle: {
    color: '#F0F6FC',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ledgerSubtitle: {
    color: '#8B949E',
    fontSize: 12,
  },
  ledgerFilterRow: {
    flexDirection: 'row',
    backgroundColor: '#121824',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  ledgerFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  ledgerFilterBtnActive: {
    backgroundColor: '#1F2937',
  },
  ledgerFilterText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  ledgerFilterTextActive: {
    color: '#00F0FF',
  },
  emptyLedgerBox: {
    backgroundColor: '#121824',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  emptyLedgerIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  emptyLedgerTitle: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyLedgerSub: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 400,
  },
  ledgerList: {
    gap: 10,
  },
  ledgerCard: {
    backgroundColor: '#121824',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  ledgerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 240,
  },
  txIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleGreen: {
    backgroundColor: '#064E3B40',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  bubbleOrange: {
    backgroundColor: '#451A0340',
    borderWidth: 1,
    borderColor: '#F7931A',
  },
  txIconChar: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  txMainInfo: {
    flex: 1,
  },
  txTypeTitle: {
    color: '#F9FAFB',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  txDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 4,
  },
  txDate: {
    color: '#6B7280',
    fontSize: 10,
  },
  ledgerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txAmountGreen: {
    color: '#10B981',
  },
  txAmountRed: {
    color: '#F87171',
  },
  statusPill: {
    backgroundColor: '#064E3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  statusPillText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '900',
  },
  copyHashBtn: {
    marginTop: 2,
  },
  copyHashText: {
    color: '#38BDF8',
    fontSize: 10,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#121824',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalCardMobile: {
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '800',
  },
  modalCloseText: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalContent: {
    gap: 16,
  },
  modalNotice: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
  modalDetailBox: {
    backgroundColor: '#0B0E14',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
    gap: 10,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDetailLabel: {
    color: '#6B7280',
    fontSize: 12,
  },
  modalDetailValCyan: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalDetailValWhite: {
    color: '#F9FAFB',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 260,
  },
  modalDetailValGold: {
    color: '#F7931A',
    fontSize: 12,
    fontWeight: '800',
  },
  modalDetailValLarge: {
    color: '#00E676',
    fontSize: 16,
    fontWeight: '900',
  },
  modalDetailValSub: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1F2937',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: '#00E676',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    color: '#0B0E14',
    fontSize: 13,
    fontWeight: '900',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  pageNavBtn: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageNavBtnDisabled: {
    opacity: 0.35,
    borderColor: '#21262D',
  },
  pageNavBtnText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  pageNavBtnTextDisabled: {
    color: '#6E7681',
  },
  pageNumbersCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNumBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#21262D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumBtnActive: {
    backgroundColor: '#00F0FF20',
    borderColor: '#00F0FF',
  },
  pageNumText: {
    color: '#8B949E',
    fontSize: 12,
    fontWeight: '700',
  },
  pageNumTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  pageEllipsis: {
    color: '#4B5563',
    paddingHorizontal: 4,
    fontSize: 12,
  },
});
