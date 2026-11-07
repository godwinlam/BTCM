import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';

interface DepositItem {
  id: number;
  userId: number;
  username: string;
  email: string;
  fullName?: string;
  amount: number;
  currency: 'USDT' | 'BTC' | 'USDC';
  network: string;
  depositAddress: string;
  txHash?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proofUrl?: string;
  adminNotes?: string;
  rejectionReason?: string;
  processedByAdminId?: number;
  processedByAdmin?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface DepositStats {
  pending: { count: number; totalUsdt: number; totalBtc: number; totalUsdc: number };
  approved: { count: number; totalUsdt: number; totalBtc: number; totalUsdc: number };
  rejected: { count: number; totalUsdt: number; totalBtc: number; totalUsdc: number };
  total: { count: number; totalUsdt: number; totalBtc: number; totalUsdc: number };
  byCurrency?: {
    USDT: { count: number; amount: number };
    BTC: { count: number; amount: number };
    USDC: { count: number; amount: number };
  };
}

interface CurrencyConfig {
  currency: 'USDT' | 'BTC' | 'USDC';
  name: string;
  address: string;
  network: string;
  instructions: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface DepositConfig {
  address: string;
  network: string;
  instructions: string;
  updatedAt?: string;
  updatedBy?: string;
  currencies?: {
    USDT: CurrencyConfig;
    BTC: CurrencyConfig;
    USDC: CurrencyConfig;
  };
}

interface DetailedDeposit {
  id: number;
  userId: number;
  username: string;
  email: string;
  fullName?: string;
  amount: number;
  currency: 'USDT' | 'BTC' | 'USDC';
  network: string;
  depositAddress: string;
  txHash?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  proofUrl?: string;
  adminNotes?: string;
  rejectionReason?: string;
  processedByAdminId?: number;
  processedByAdmin?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
    fullName?: string;
    role: string;
    usdBalance: number;
    btcBalance: number;
    totalInvested: number;
    starRank: number;
  };
  userDepositHistory?: Array<{
    id: number;
    amount: number;
    currency: string;
    network: string;
    status: string;
    txHash?: string;
    createdAt: string;
  }>;
}

export default function AdminDepositsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Access Control & Current Admin
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Data states
  const [stats, setStats] = useState<DepositStats | null>(null);
  const [config, setConfig] = useState<DepositConfig | null>(null);
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
  const [deposits, setDeposits] = useState<DepositItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'USDT' | 'BTC' | 'USDC'>('ALL');

  // Selected config currency to view/edit in Config Panel
  const [selectedConfigCurrency, setSelectedConfigCurrency] = useState<'USDT' | 'BTC' | 'USDC'>('USDT');

  // Banner feedback
  const [bannerNotice, setBannerNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Edit Config Modal State
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [editCurrency, setEditCurrency] = useState<'USDT' | 'BTC' | 'USDC'>('USDT');
  const [editAddress, setEditAddress] = useState('');
  const [editNetwork, setEditNetwork] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false);

  // Approve Modal State
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [selectedDepositForApprove, setSelectedDepositForApprove] = useState<DepositItem | null>(null);
  const [approveAdminNotes, setApproveAdminNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedDepositForReject, setSelectedDepositForReject] = useState<DepositItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectAdminNotes, setRejectAdminNotes] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Inspect Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailedDeposit, setDetailedDeposit] = useState<DetailedDeposit | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const showNotice = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setBannerNotice({ text: msg, type });
    setTimeout(() => {
      setBannerNotice(null);
    }, 6000);
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    setIsVerifying(true);
    try {
      if (!api.getToken()) {
        setIsAuthorized(false);
        setIsVerifying(false);
        return;
      }

      const res = await api.getMe();
      if (res?.user && res.user.role === 'admin') {
        setCurrentUser(res.user);
        setIsAuthorized(true);
        loadConfig();
        loadStats();
        loadDeposits(1, searchQuery, statusFilter, currencyFilter);
      } else {
        setIsAuthorized(false);
        setCurrentUser(res?.user || null);
      }
    } catch (err) {
      console.error('Admin Auth Check Failed:', err);
      setIsAuthorized(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const loadConfig = async () => {
    try {
      const res = await api.getAdminDepositConfig();
      if (res?.success) {
        setConfig({
          address: res.address || res.config?.address || 'TXv2nE8gQ6R4mN9kY7bL1jF5cW3pA8sD6Z',
          network: res.network || res.config?.network || 'TRC20 (Tron Network)',
          instructions: res.instructions || res.config?.instructions || '',
          updatedAt: res.updatedAt || res.config?.updatedAt,
          updatedBy: res.updatedBy || res.config?.updatedBy,
          currencies: res.currencies || res.config?.currencies,
        });
      }
    } catch (err: any) {
      console.warn('Failed to load deposit config:', err.message);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.getAdminDepositStats();
      if (res?.success && res.stats) {
        setStats(res.stats);
      }
      try {
        const wRes = await api.getAdminWithdrawalStats();
        if (wRes?.stats?.pending?.count !== undefined) {
          setPendingWithdrawalCount(wRes.stats.pending.count);
        }
      } catch (_) {}
    } catch (err: any) {
      console.warn('Failed to load deposit stats:', err.message);
    }
  };

  const loadDeposits = async (
    targetPage = page,
    targetSearch = searchQuery,
    targetStatus = statusFilter,
    targetCurrency = currencyFilter
  ) => {
    setLoading(true);
    try {
      const res = await api.getAdminDeposits({
        page: targetPage,
        limit,
        search: targetSearch.trim() || undefined,
        status: targetStatus !== 'ALL' ? targetStatus : undefined,
        currency: targetCurrency !== 'ALL' ? targetCurrency : undefined,
        sortBy: 'created_at',
        order: 'DESC',
      });

      if (res?.success) {
        setDeposits(res.deposits || []);
        setTotalCount(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        setPage(targetPage);
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to load deposits', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadDeposits(1, searchQuery, statusFilter, currencyFilter);
  };

  const handleStatusFilterChange = (status: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED') => {
    setStatusFilter(status);
    setPage(1);
    loadDeposits(1, searchQuery, status, currencyFilter);
  };

  const handleCurrencyFilterChange = (cur: 'ALL' | 'USDT' | 'BTC' | 'USDC') => {
    setCurrencyFilter(cur);
    setPage(1);
    loadDeposits(1, searchQuery, statusFilter, cur);
  };

  const activeConfigCurrencyData: CurrencyConfig = (config?.currencies && config.currencies[selectedConfigCurrency]) || {
    currency: selectedConfigCurrency,
    name: selectedConfigCurrency === 'BTC' ? 'Bitcoin' : selectedConfigCurrency === 'USDC' ? 'USD Coin' : 'Tether USD',
    address:
      selectedConfigCurrency === 'BTC'
        ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
        : selectedConfigCurrency === 'USDC'
        ? '0x71C836642F4A4E3302293515456275153A649319'
        : config?.address || 'TXv2nE8gQ6R4mN9kY7bL1jF5cW3pA8sD6Z',
    network:
      selectedConfigCurrency === 'BTC'
        ? 'BTC (Native SegWit Network)'
        : selectedConfigCurrency === 'USDC'
        ? 'ERC20 (Ethereum Network)'
        : config?.network || 'TRC20 (Tron Network)',
    instructions:
      selectedConfigCurrency === 'BTC'
        ? 'Transfer BTC directly to this Native SegWit address. Minimum deposit is 0.0001 BTC. Once sent, submit your transaction hash (TxHash) below.'
        : selectedConfigCurrency === 'USDC'
        ? 'Transfer USDC only via ERC20 network. Once sent, submit your transaction hash (TxHash) below for prompt verification and balance credit.'
        : config?.instructions || 'Transfer USDT only via TRC20 network. Once sent, submit your transaction hash (TxHash) below for prompt verification and balance credit.',
    updatedAt: config?.updatedAt,
    updatedBy: config?.updatedBy,
  };

  // 1. Edit Deposit Address Config
  const handleOpenConfigModal = (cur = selectedConfigCurrency) => {
    setEditCurrency(cur);
    const target = config?.currencies?.[cur];
    if (target) {
      setEditAddress(target.address);
      setEditNetwork(target.network);
      setEditInstructions(target.instructions || '');
    } else {
      setEditAddress(activeConfigCurrencyData.address);
      setEditNetwork(activeConfigCurrencyData.network);
      setEditInstructions(activeConfigCurrencyData.instructions);
    }
    setConfigModalVisible(true);
  };

  const handleSwitchEditCurrency = (cur: 'USDT' | 'BTC' | 'USDC') => {
    setEditCurrency(cur);
    const target = config?.currencies?.[cur];
    const defaultAddresses = {
      USDT: 'TXv2nE8gQ6R4mN9kY7bL1jF5cW3pA8sD6Z',
      BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      USDC: '0x71C836642F4A4E3302293515456275153A649319',
    };
    const defaultNetworks = {
      USDT: 'TRC20 (Tron Network)',
      BTC: 'BTC (Native SegWit Network)',
      USDC: 'ERC20 (Ethereum Network)',
    };
    setEditAddress(target?.address || defaultAddresses[cur]);
    setEditNetwork(target?.network || defaultNetworks[cur]);
    setEditInstructions(target?.instructions || '');
  };

  const handleSaveConfig = async () => {
    if (!editAddress.trim()) {
      showNotice('Deposit wallet address cannot be empty.', 'error');
      return;
    }

    setIsUpdatingConfig(true);
    try {
      const res = await api.updateAdminDepositConfig({
        currency: editCurrency,
        address: editAddress.trim(),
        network: editNetwork.trim() || undefined,
        instructions: editInstructions.trim() || undefined,
      });

      if (res?.success) {
        showNotice(
          `Official ${editCurrency} Deposit Wallet Address updated to ${editAddress.trim()}. Visible to all users in 'Deposit' modal!`,
          'success'
        );
        setConfigModalVisible(false);
        loadConfig();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to update deposit wallet config', 'error');
    } finally {
      setIsUpdatingConfig(false);
    }
  };

  // 2. Open Approve Modal
  const handleOpenApproveModal = (deposit: DepositItem) => {
    setSelectedDepositForApprove(deposit);
    setApproveAdminNotes(`Approved and verified on-chain by admin @${currentUser?.username || 'admin'}`);
    setApproveModalVisible(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedDepositForApprove) return;

    setIsApproving(true);
    try {
      const res = await api.approveAdminDeposit(selectedDepositForApprove.id, {
        adminNotes: approveAdminNotes.trim() || undefined,
      });

      if (res?.success) {
        const cur = selectedDepositForApprove.currency;
        const formattedAmt =
          cur === 'BTC'
            ? selectedDepositForApprove.amount.toFixed(8)
            : selectedDepositForApprove.amount.toFixed(2);
        showNotice(
          `Deposit #${selectedDepositForApprove.id} approved! Credited ${formattedAmt} ${cur} to @${selectedDepositForApprove.username}.`,
          'success'
        );
        setApproveModalVisible(false);
        setSelectedDepositForApprove(null);
        loadDeposits();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to approve deposit', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  // 3. Open Reject Modal
  const handleOpenRejectModal = (deposit: DepositItem) => {
    setSelectedDepositForReject(deposit);
    setRejectReason('');
    setRejectAdminNotes('');
    setRejectModalVisible(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedDepositForReject) return;

    if (!rejectReason.trim()) {
      showNotice('Please provide a mandatory reason for rejecting this deposit request.', 'error');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await api.rejectAdminDeposit(selectedDepositForReject.id, {
        reason: rejectReason.trim(),
        adminNotes: rejectAdminNotes.trim() || undefined,
      });

      if (res?.success) {
        showNotice(
          `Deposit #${selectedDepositForReject.id} rejected. Reason: "${rejectReason.trim()}". No funds credited.`,
          'success'
        );
        setRejectModalVisible(false);
        setSelectedDepositForReject(null);
        setRejectReason('');
        loadDeposits();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to reject deposit', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // 4. Open Inspect Modal
  const handleInspectDeposit = async (id: number) => {
    setDetailModalVisible(true);
    setDetailLoading(true);
    try {
      const res = await api.getAdminDeposit(id);
      if (res?.success && res.deposit) {
        setDetailedDeposit(res.deposit);
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to fetch detailed deposit', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper Copy Text to Clipboard
  const handleCopyText = (text: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showNotice(`${label} copied to clipboard!`, 'info');
      } else {
        showNotice(`${label}: ${text}`, 'info');
      }
    } catch (err) {
      showNotice(`${label}: ${text}`, 'info');
    }
  };

  // 1. Loading State
  if (isVerifying) {
    return (
      <View style={styles.accessDeniedContainer}>
        <ActivityIndicator size="large" color="#00F0FF" />
        <Text style={styles.accessDeniedTitle}>Authenticating Security Protocol...</Text>
        <Text style={styles.accessDeniedSub}>Verifying Administrator Privileges & Role Access</Text>
      </View>
    );
  }

  // 2. Access Denied Gate
  if (!isAuthorized) {
    return (
      <View style={styles.accessDeniedContainer}>
        <View style={styles.accessDeniedCard}>
          <Text style={styles.accessDeniedIcon}>🔒</Text>
          <Text style={styles.accessDeniedTitle}>Access Denied</Text>
          <Text style={styles.accessDeniedSub}>
            This console is strictly restricted to system administrators with role{' '}
            <Text style={{ color: '#00F0FF', fontWeight: '800' }}>'admin'</Text>.
          </Text>
          {currentUser ? (
            <View style={styles.currentUserInfoBox}>
              <Text style={styles.currentUserInfoText}>
                Currently signed in as: <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>@{currentUser.username}</Text>{' '}
                (Role: <Text style={{ color: '#FFA726', fontWeight: '800' }}>{currentUser.role || 'user'}</Text>)
              </Text>
            </View>
          ) : (
            <Text style={[styles.currentUserInfoText, { marginTop: 10, textAlign: 'center' }]}>
              Please sign in with an Administrator account.
            </Text>
          )}

          <View style={styles.accessDeniedBtnRow}>
            <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/dashboard' as any)}>
              <Text style={styles.btnSecondaryText}>← Return to Dashboard</Text>
            </TouchableOpacity>
            {!currentUser && (
              <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/login' as any)}>
                <Text style={styles.btnPrimaryText}>⚡ Sign In as Admin</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // 3. Authorized Admin Deposit Management UI
  return (
    <View style={styles.container}>
      {/* Top Admin Header Bar */}
      <View style={[styles.headerBar, isMobile && styles.headerBarMobile]}>
        {isMobile ? (
          /* MOBILE HEADER LAYOUT (Clean, Non-Overlapping Multi-Row) */
          <View style={styles.mobileHeaderWrap}>
            {/* Row 1: Admin Shield Badge & Actions */}
            <View style={styles.mobileHeaderRow1}>
              <View style={styles.adminShieldBadge}>
                <Text style={styles.adminShieldText}>🛡️ ADMIN CONSOLE</Text>
              </View>
              <View style={styles.mobileActionBtns}>
                <TouchableOpacity
                  style={styles.refreshBtn}
                  onPress={() => {
                    loadConfig();
                    loadStats();
                    loadDeposits();
                    showNotice('Deposit data refreshed', 'info');
                  }}
                >
                  <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.backHomeBtn}
                  onPress={() => router.push('/dashboard' as any)}
                >
                  <Text style={styles.backHomeBtnText}>← Dashboard</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 2: Page Title */}
            <Text style={styles.headerTitleMobile}>Deposit Liquidity & Wallet Config</Text>

            {/* Row 3: Admin User Badge & Role */}
            <Text style={styles.headerSubMobile}>
              Active Admin: <Text style={{ color: '#00F0FF', fontWeight: '800' }}>@{currentUser?.username}</Text> • Role:{' '}
              <Text style={{ color: '#00FF66', fontWeight: '700' }}>{currentUser?.role?.toUpperCase()}</Text>
            </Text>
          </View>
        ) : (
          /* DESKTOP HEADER LAYOUT */
          <>
            <View style={styles.headerLeft}>
              <View style={styles.adminShieldBadge}>
                <Text style={styles.adminShieldText}>🛡️ ADMIN CONSOLE</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>Deposit Liquidity & Wallet Config</Text>
                <Text style={styles.headerSub}>
                  Active Admin: <Text style={{ color: '#00F0FF', fontWeight: '800' }}>@{currentUser?.username}</Text> • Role:{' '}
                  <Text style={{ color: '#00FF66', fontWeight: '700' }}>{currentUser?.role?.toUpperCase()}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => {
                  loadConfig();
                  loadStats();
                  loadDeposits();
                  showNotice('Deposit data refreshed', 'info');
                }}
              >
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.push('/dashboard' as any)}>
                <Text style={styles.backHomeBtnText}>← User Dashboard</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Admin Module Switcher Navigation Tabs (Horizontally Scrollable) */}
      <View style={styles.navTabsOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.navTabsContainer, isMobile && styles.navTabsContainerMobile]}
        >
          <TouchableOpacity style={[styles.navTabItem, isMobile && styles.navTabItemMobile]} onPress={() => router.push('/admin' as any)}>
            <Text style={styles.navTabIcon}>👥</Text>
            <Text style={styles.navTabLabel}>{isMobile ? 'Users' : 'User & Node Management'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navTabItem, isMobile && styles.navTabItemMobile]} onPress={() => router.push('/admin-withdrawals' as any)}>
            <Text style={styles.navTabIcon}>💳</Text>
            <Text style={styles.navTabLabel}>{isMobile ? 'Withdrawals' : 'Withdrawal Requests'}</Text>
            {pendingWithdrawalCount > 0 && (
              <View style={styles.navPendingBadge}>
                <Text style={styles.navPendingBadgeText}>{pendingWithdrawalCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navTabItem, styles.navTabItemActive, isMobile && styles.navTabItemMobile]}>
            <Text style={styles.navTabIcon}>📥</Text>
            <Text style={[styles.navTabLabel, styles.navTabLabelActive]}>{isMobile ? 'Deposits' : 'Deposit Management'}</Text>
            {stats && stats.pending.count > 0 && (
              <View style={styles.navPendingBadge}>
                <Text style={styles.navPendingBadgeText}>{stats.pending.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Notice Banner */}
      {bannerNotice && (
        <View
          style={[
            styles.bannerNoticeBox,
            bannerNotice.type === 'error'
              ? styles.bannerNoticeError
              : bannerNotice.type === 'success'
              ? styles.bannerNoticeSuccess
              : styles.bannerNoticeInfo,
          ]}
        >
          <Text style={styles.bannerNoticeText}>{bannerNotice.text}</Text>
        </View>
      )}

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Deposit Wallet Address Configuration Panel */}
        <View style={styles.configCard}>
          {/* Currency Switcher Tabs */}
          <View style={styles.configCurTabsRow}>
            {(['USDT', 'BTC', 'USDC'] as const).map((cur) => {
              const isSelected = selectedConfigCurrency === cur;
              const icon = cur === 'BTC' ? '₿' : cur === 'USDC' ? '🔵' : '💵';
              return (
                <TouchableOpacity
                  key={cur}
                  style={[styles.configCurTab, isSelected && styles.configCurTabActive]}
                  onPress={() => setSelectedConfigCurrency(cur)}
                >
                  <Text style={[styles.configCurTabText, isSelected && styles.configCurTabTextActive]}>
                    {icon} {cur} Deposit Wallet
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.configCardHeader}>
            <View style={{ flex: 1 }}>
              <View style={styles.configHeaderBadgeRow}>
                <Text style={styles.configCardTitle}>⚡ OFFICIAL {selectedConfigCurrency} DEPOSIT WALLET</Text>
                <View style={styles.configNetworkPill}>
                  <Text style={styles.configNetworkPillText}>{activeConfigCurrencyData.network}</Text>
                </View>
              </View>
              <Text style={styles.configCardSub}>
                Displayed in the Deposit section for all logged-in members to copy for {selectedConfigCurrency} account funding.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.btnEditConfig}
              onPress={() => handleOpenConfigModal(selectedConfigCurrency)}
            >
              <Text style={styles.btnEditConfigText}>✏️ Edit {selectedConfigCurrency} Address</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.configAddressRow}>
            <View style={styles.configAddressBox}>
              <Text style={styles.configAddressText} numberOfLines={1}>
                {activeConfigCurrencyData.address}
              </Text>
              <TouchableOpacity
                style={styles.copySmallBtn}
                onPress={() => handleCopyText(activeConfigCurrencyData.address, `${selectedConfigCurrency} Deposit Address`)}
              >
                <Text style={styles.copySmallBtnText}>📋 Copy Address</Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeConfigCurrencyData.instructions ? (
            <Text style={styles.configInstructionsText}>
              Instructions: <Text style={{ color: '#E2E8F0' }}>{activeConfigCurrencyData.instructions}</Text>
            </Text>
          ) : null}

          {activeConfigCurrencyData.updatedAt ? (
            <Text style={styles.configUpdatedInfo}>
              Last updated on {new Date(activeConfigCurrencyData.updatedAt).toLocaleString()}
              {activeConfigCurrencyData.updatedBy ? ` by admin @${activeConfigCurrencyData.updatedBy}` : ''}
            </Text>
          ) : null}
        </View>

        {/* Stat Overview Cards Grid */}
        <View style={[styles.statsGrid, isMobile && styles.statsGridMobile]}>
          {/* Card 1: Pending */}
          <View style={[styles.statCard, styles.statCardPending, isMobile && styles.statCardMobile]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>{isMobile ? '⏳ PENDING' : '⏳ PENDING AUDIT'}</Text>
              <View style={styles.statCountBadgeAmber}>
                <Text style={styles.statCountBadgeText}>{stats?.pending.count || 0}</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#FFA726' }]}>
              ${(stats?.pending.totalUsdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </Text>
            {Boolean(stats?.pending.totalBtc) ? (
              <Text style={[{ color: '#F7931A', fontSize: 11, fontWeight: '700', marginTop: 2 }, isMobile && styles.statCardSubMobile]}>
                + {stats?.pending.totalBtc.toFixed(8)} BTC
              </Text>
            ) : null}
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>{isMobile ? 'Awaiting audit' : 'Awaiting verification & balance credit'}</Text>
          </View>

          {/* Card 2: Approved */}
          <View style={[styles.statCard, styles.statCardApproved, isMobile && styles.statCardMobile]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>{isMobile ? '🟢 APPROVED' : '🟢 APPROVED & CREDITED'}</Text>
              <View style={styles.statCountBadgeGreen}>
                <Text style={styles.statCountBadgeText}>{stats?.approved.count || 0}</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#00FF66' }]}>
              ${(stats?.approved.totalUsdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </Text>
            {Boolean(stats?.approved.totalBtc) ? (
              <Text style={[{ color: '#F7931A', fontSize: 11, fontWeight: '700', marginTop: 2 }, isMobile && styles.statCardSubMobile]}>
                + {stats?.approved.totalBtc.toFixed(8)} BTC
              </Text>
            ) : null}
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>{isMobile ? 'Credited to users' : 'Successfully credited to member wallets'}</Text>
          </View>

          {/* Card 3: Rejected */}
          <View style={[styles.statCard, styles.statCardRejected, isMobile && styles.statCardMobile]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>{isMobile ? '⛔ REJECTED' : '⛔ REJECTED REQUESTS'}</Text>
              <View style={styles.statCountBadgeRed}>
                <Text style={styles.statCountBadgeText}>{stats?.rejected.count || 0}</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#FF4757' }]}>
              ${(stats?.rejected.totalUsdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </Text>
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>{isMobile ? 'Rejected with reason' : 'Rejected with mandatory reason'}</Text>
          </View>

          {/* Card 4: Total */}
          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>{isMobile ? '📊 TOTAL' : '📊 TOTAL DEPOSITS'}</Text>
              <View style={styles.statCountBadgeCyan}>
                <Text style={styles.statCountBadgeText}>{stats?.total.count || 0}</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#00F0FF' }]}>
              ${(stats?.total.totalUsdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </Text>
            {Boolean(stats?.total.totalBtc) ? (
              <Text style={[{ color: '#F7931A', fontSize: 11, fontWeight: '700', marginTop: 2 }, isMobile && styles.statCardSubMobile]}>
                + {stats?.total.totalBtc.toFixed(8)} BTC
              </Text>
            ) : null}
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>{isMobile ? 'Total platform volume' : 'Cumulative platform deposit requests'}</Text>
          </View>
        </View>

        {/* Action Controls & Filters Bar */}
        <View style={styles.toolbarCard}>
          {/* Search Box */}
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, isMobile && styles.searchInputMobile]}
              placeholder={isMobile ? 'Search user, email, TxHash...' : 'Search by @username, email, TxHash, or receiving address...'}
              placeholderTextColor="#667085"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={[styles.searchBtn, isMobile && styles.searchBtnMobile]} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>🔍 Search</Text>
            </TouchableOpacity>
            {searchQuery.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.clearSearchBtn, isMobile && styles.clearSearchBtnMobile]}
                onPress={() => {
                  setSearchQuery('');
                  loadDeposits(1, '', statusFilter, currencyFilter);
                }}
              >
                <Text style={styles.clearSearchBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <View style={[styles.filterPillsRow, isMobile && styles.filterPillsRowMobile]}>
            <View style={[styles.pillsGroup, isMobile && styles.pillsGroupMobile]}>
              <Text style={styles.filterGroupLabel}>STATUS:</Text>
              <View style={styles.pillsContainer}>
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.filterPill, statusFilter === st && styles.filterPillActive]}
                    onPress={() => handleStatusFilterChange(st)}
                  >
                    <Text style={[styles.filterPillText, statusFilter === st && styles.filterPillTextActive]}>
                      {st === 'ALL'
                        ? 'All'
                        : st === 'PENDING'
                        ? '⏳ Pending'
                        : st === 'APPROVED'
                        ? (isMobile ? '🟢 Done' : '🟢 Approved')
                        : '⛔ Rejected'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={[styles.pillsGroup, isMobile && styles.pillsGroupMobile]}>
              <Text style={styles.filterGroupLabel}>CURRENCY:</Text>
              <View style={styles.pillsContainer}>
                {(['ALL', 'USDT', 'BTC', 'USDC'] as const).map((cur) => (
                  <TouchableOpacity
                    key={cur}
                    style={[styles.filterPill, currencyFilter === cur && styles.filterPillActive]}
                    onPress={() => handleCurrencyFilterChange(cur)}
                  >
                    <Text style={[styles.filterPillText, currencyFilter === cur && styles.filterPillTextActive]}>
                      {cur === 'ALL' ? 'All Assets' : cur === 'BTC' ? '₿ BTC' : cur === 'USDC' ? '🔵 USDC' : '💵 USDT'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Results Header */}
        <View style={styles.resultsHeaderRow}>
          <Text style={styles.resultsCountText}>
            Showing <Text style={{ color: '#00F0FF', fontWeight: '800' }}>{deposits.length}</Text> of{' '}
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{totalCount}</Text> deposit records
          </Text>
          {loading && <ActivityIndicator size="small" color="#00F0FF" />}
        </View>

        {/* Deposits List */}
        {loading && deposits.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00F0FF" />
            <Text style={styles.loadingText}>Fetching deposit records...</Text>
          </View>
        ) : deposits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Deposit Requests Found</Text>
            <Text style={styles.emptySub}>No records match the selected status or query filters.</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {deposits.map((item) => {
              return (
                <View key={item.id} style={styles.depositRow}>
                  {/* Row Top: ID, Status, Timestamp */}
                  <View style={styles.rowTopBar}>
                    <View style={styles.rowIdCol}>
                      <Text style={styles.rowIdText}>#{item.id}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          item.status === 'PENDING'
                            ? styles.statusBadgePending
                            : item.status === 'APPROVED'
                            ? styles.statusBadgeApproved
                            : styles.statusBadgeRejected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            item.status === 'PENDING'
                              ? styles.statusBadgeTextPending
                              : item.status === 'APPROVED'
                              ? styles.statusBadgeTextApproved
                              : styles.statusBadgeTextRejected,
                          ]}
                        >
                          {item.status === 'PENDING'
                            ? '⏳ PENDING AUDIT'
                            : item.status === 'APPROVED'
                            ? '🟢 APPROVED & CREDITED'
                            : '⛔ REJECTED'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.rowDateText}>
                      Submitted: {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  {/* Row Main: User, Amount, TxHash & Address */}
                  <View style={[styles.rowMainGrid, isMobile && styles.rowMainGridMobile]}>
                    {/* User Info Column */}
                    <View style={styles.userCol}>
                      <Text style={styles.colLabel}>DEPOSITING USER</Text>
                      <TouchableOpacity onPress={() => handleInspectDeposit(item.id)}>
                        <Text style={styles.userNameText}>@{item.username}</Text>
                      </TouchableOpacity>
                      <Text style={styles.userEmailText}>{item.email}</Text>
                      {item.fullName ? <Text style={styles.userFullNameText}>{item.fullName}</Text> : null}
                    </View>

                    {/* Amount Column */}
                    <View style={styles.amountCol}>
                      <Text style={styles.colLabel}>DEPOSIT AMOUNT</Text>
                      <View style={styles.amountBadgeRow}>
                        <Text style={[styles.amountValueText, { color: item.currency === 'BTC' ? '#F7931A' : '#00F0FF' }]}>
                          {item.currency === 'BTC'
                            ? `${parseFloat(item.amount as any).toFixed(8)} BTC`
                            : item.currency === 'USDC'
                            ? `$${parseFloat(item.amount as any).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`
                            : `$${parseFloat(item.amount as any).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`}
                        </Text>
                        <View
                          style={[
                            styles.currencyPillUsdt,
                            item.currency === 'BTC' && { backgroundColor: 'rgba(247, 147, 26, 0.15)', borderColor: '#F7931A' },
                            item.currency === 'USDC' && { backgroundColor: 'rgba(39, 117, 202, 0.15)', borderColor: '#2775CA' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currencyPillText,
                              item.currency === 'BTC' && { color: '#F7931A' },
                              item.currency === 'USDC' && { color: '#2775CA' },
                            ]}
                          >
                            {item.network || item.currency}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Destination Address & Tx Column */}
                    <View style={styles.destinationCol}>
                      <Text style={styles.colLabel}>DEPOSIT WALLET & TX HASH</Text>
                      <View style={styles.addressBox}>
                        <Text style={styles.addressText} numberOfLines={1}>
                          {item.depositAddress}
                        </Text>
                        <TouchableOpacity
                          style={styles.copySmallBtn}
                          onPress={() => handleCopyText(item.depositAddress, 'Address')}
                        >
                          <Text style={styles.copySmallBtnText}>📋 Copy</Text>
                        </TouchableOpacity>
                      </View>

                      {item.txHash ? (
                        <View style={styles.txBox}>
                          <Text style={styles.txLabel}>TX HASH:</Text>
                          <Text style={styles.txHashText} numberOfLines={1}>
                            {item.txHash}
                          </Text>
                          <TouchableOpacity
                            style={styles.copySmallBtn}
                            onPress={() => handleCopyText(item.txHash!, 'TxHash')}
                          >
                            <Text style={styles.copySmallBtnText}>📋 Copy</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <Text style={styles.noTxNotice}>No TxHash submitted</Text>
                      )}
                    </View>
                  </View>

                  {/* Rejection Reason or Admin Notes */}
                  {item.status === 'REJECTED' && Boolean(item.rejectionReason) ? (
                    <View style={styles.rejectionNoticeBox}>
                      <Text style={styles.rejectionNoticeTitle}>⛔ REJECTION REASON (NOTIFIED TO USER):</Text>
                      <Text style={styles.rejectionNoticeBody}>{item.rejectionReason}</Text>
                    </View>
                  ) : null}

                  {Boolean(item.adminNotes || item.processedByAdmin) ? (
                    <View style={styles.notesBox}>
                      {Boolean(item.processedByAdmin) ? (
                        <Text style={styles.processedByText}>
                          Processed by: <Text style={{ color: '#00F0FF' }}>@{item.processedByAdmin}</Text>
                          {item.processedAt ? ` on ${new Date(item.processedAt).toLocaleString()}` : ''}
                        </Text>
                      ) : null}
                      {Boolean(item.adminNotes) ? (
                        <Text style={styles.notesText}>
                          Note: <Text style={{ color: '#E2E8F0' }}>{item.adminNotes}</Text>
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {/* Row Actions Toolbar */}
                  <View style={styles.rowActionsRow}>
                    <TouchableOpacity
                      style={styles.btnInspect}
                      onPress={() => handleInspectDeposit(item.id)}
                    >
                      <Text style={styles.btnInspectText}>🔍 Inspect Details</Text>
                    </TouchableOpacity>

                    {item.status === 'PENDING' && (
                      <>
                        <TouchableOpacity
                          style={styles.btnActionApprove}
                          onPress={() => handleOpenApproveModal(item)}
                        >
                          <Text style={styles.btnActionApproveText}>✓ Approve & Credit Balance</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnActionReject}
                          onPress={() => handleOpenRejectModal(item)}
                        >
                          <Text style={styles.btnActionRejectText}>⛔ Reject with Reason</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {item.status === 'APPROVED' && (
                      <View style={styles.approvedBadgePill}>
                        <Text style={styles.approvedBadgePillText}>✓ Credited to User Wallet</Text>
                      </View>
                    )}

                    {item.status === 'REJECTED' && (
                      <View style={styles.rejectedBadgePill}>
                        <Text style={styles.rejectedBadgePillText}>⛔ Request Rejected (No Credit)</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
              disabled={page <= 1}
              onPress={() => loadDeposits(page - 1, searchQuery, statusFilter)}
            >
              <Text style={styles.pageBtnText}>← Previous</Text>
            </TouchableOpacity>

            <Text style={styles.pageIndicatorText}>
              Page <Text style={{ color: '#00F0FF', fontWeight: '800' }}>{page}</Text> of{' '}
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{totalPages}</Text>
            </Text>

            <TouchableOpacity
              style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
              disabled={page >= totalPages}
              onPress={() => loadDeposits(page + 1, searchQuery, statusFilter)}
            >
              <Text style={styles.pageBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* MODAL 1: EDIT DEPOSIT WALLET ADDRESS & NETWORK CONFIG     */}
      {/* ========================================================= */}
      <Modal
        visible={configModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfigModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>✏️ Update Official {editCurrency} Deposit Wallet</Text>
                <Text style={styles.modalSubtitle}>
                  This address will be immediately presented to all members in the Deposit section for {editCurrency}.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setConfigModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Currency Selector Tabs */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 8 }}>
              {(['USDT', 'BTC', 'USDC'] as const).map((cur) => {
                const isSelected = editCurrency === cur;
                const icon = cur === 'BTC' ? '₿' : cur === 'USDC' ? '🔵' : '💵';
                return (
                  <TouchableOpacity
                    key={cur}
                    style={[styles.configCurTab, isSelected && styles.configCurTabActive]}
                    onPress={() => handleSwitchEditCurrency(cur)}
                  >
                    <Text style={[styles.configCurTabText, isSelected && styles.configCurTabTextActive]}>
                      {icon} {cur}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Input: Deposit Address */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{editCurrency} DEPOSIT WALLET ADDRESS *</Text>
              <TextInput
                style={styles.formInput}
                placeholder={
                  editCurrency === 'BTC'
                    ? 'e.g. bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
                    : editCurrency === 'USDC'
                    ? 'e.g. 0x71C836642F4A4E3302293515456275153A649319'
                    : 'e.g. TXv2nE8gQ6R4mN9kY7bL1jF5cW3pA8sD6Z'
                }
                placeholderTextColor="#667085"
                value={editAddress}
                onChangeText={setEditAddress}
                autoCapitalize="none"
              />
              <Text style={styles.formHint}>Must be a valid and secure official platform receiving address for {editCurrency}.</Text>
            </View>

            {/* Input: Network */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>{editCurrency} TRANSFER NETWORK</Text>
              <TextInput
                style={styles.formInput}
                placeholder={
                  editCurrency === 'BTC'
                    ? 'BTC (Native SegWit Network)'
                    : editCurrency === 'USDC'
                    ? 'ERC20 (Ethereum Network)'
                    : 'TRC20 (Tron Network)'
                }
                placeholderTextColor="#667085"
                value={editNetwork}
                onChangeText={setEditNetwork}
              />
            </View>

            {/* Input: Instructions */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>USER DEPOSIT INSTRUCTIONS ({editCurrency})</Text>
              <TextInput
                style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="Instructions displayed to members on the deposit modal..."
                placeholderTextColor="#667085"
                multiline
                numberOfLines={3}
                value={editInstructions}
                onChangeText={setEditInstructions}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setConfigModalVisible(false)}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, isUpdatingConfig && styles.btnDisabled]}
                disabled={isUpdatingConfig}
                onPress={handleSaveConfig}
              >
                {isUpdatingConfig ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.btnPrimaryText}>✓ Save & Update {editCurrency} Address</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: APPROVE DEPOSIT & CREDIT USER WALLET             */}
      {/* ========================================================= */}
      <Modal
        visible={approveModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setApproveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>✓ Confirm Deposit Approval</Text>
                <Text style={styles.modalSubtitle}>
                  Deposit #{selectedDepositForApprove?.id} • Immediate Balance Credit
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setApproveModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedDepositForApprove && (
              <View style={styles.modalInfoBox}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>User Account:</Text>
                  <Text style={styles.modalInfoVal}>
                    @{selectedDepositForApprove.username} ({selectedDepositForApprove.email})
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Deposit Amount to Credit:</Text>
                  <Text style={[styles.modalInfoVal, { color: selectedDepositForApprove.currency === 'BTC' ? '#F7931A' : '#00FF66', fontWeight: '800', fontSize: 16 }]}>
                    {selectedDepositForApprove.currency === 'BTC'
                      ? `${selectedDepositForApprove.amount.toFixed(8)} BTC`
                      : `$${selectedDepositForApprove.amount.toFixed(2)} ${selectedDepositForApprove.currency}`}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Credited Target Wallet:</Text>
                  <Text style={[styles.modalInfoVal, { color: selectedDepositForApprove.currency === 'BTC' ? '#F7931A' : '#00F0FF', fontWeight: '700' }]}>
                    {selectedDepositForApprove.currency === 'BTC'
                      ? 'Bitcoin Balance (btc_balance)'
                      : 'USD Mining Balance (usd_balance)'}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Network:</Text>
                  <Text style={styles.modalInfoVal}>{selectedDepositForApprove.network}</Text>
                </View>
                {selectedDepositForApprove.txHash ? (
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Member TxHash:</Text>
                    <Text style={styles.modalAddressVal} numberOfLines={1}>
                      {selectedDepositForApprove.txHash}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ADMIN AUDIT NOTE (OPTIONAL)</Text>
              <TextInput
                style={styles.formInput}
                placeholder={
                  selectedDepositForApprove?.currency === 'BTC'
                    ? 'e.g. Verified on Mempool / Blockstream Explorer block height'
                    : 'e.g. Verified on TRONSCAN / Etherscan block height'
                }
                placeholderTextColor="#667085"
                value={approveAdminNotes}
                onChangeText={setApproveAdminNotes}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setApproveModalVisible(false)}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnActionApprove, isApproving && styles.btnDisabled, { paddingVertical: 12, paddingHorizontal: 18 }]}
                disabled={isApproving}
                onPress={handleConfirmApprove}
              >
                {isApproving ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.btnActionApproveText}>✓ Approve & Credit Funds Now</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: REJECT DEPOSIT WITH MANDATORY REASON             */}
      {/* ========================================================= */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: '#FF4757' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: '#FF4757' }]}>⛔ Reject Deposit Request</Text>
                <Text style={styles.modalSubtitle}>
                  Deposit #{selectedDepositForReject?.id} • Mandatory Reason Required
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedDepositForReject && (
              <View style={styles.modalInfoBox}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>User Account:</Text>
                  <Text style={styles.modalInfoVal}>
                    @{selectedDepositForReject.username} ({selectedDepositForReject.email})
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Requested Amount:</Text>
                  <Text style={[styles.modalInfoVal, { color: '#FF4757', fontWeight: '800' }]}>
                    {selectedDepositForReject.currency === 'BTC'
                      ? `${selectedDepositForReject.amount.toFixed(8)} BTC`
                      : `$${selectedDepositForReject.amount.toFixed(2)} ${selectedDepositForReject.currency}`}
                  </Text>
                </View>
              </View>
            )}

            {/* Input: Rejection Reason */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>REJECTION REASON (MANDATORY) *</Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="e.g. Transaction hash not found on blockchain / Amount received does not match requested amount / Duplicate submission..."
                placeholderTextColor="#667085"
                multiline
                numberOfLines={3}
                value={rejectReason}
                onChangeText={setRejectReason}
              />
              <Text style={styles.formHint}>
                This reason will be visible to @{selectedDepositForReject?.username} in their personal deposit history.
              </Text>
            </View>

            {/* Input: Admin Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>INTERNAL ADMIN NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Checked explorer at 12:45 UTC, 0 confirmations"
                placeholderTextColor="#667085"
                value={rejectAdminNotes}
                onChangeText={setRejectAdminNotes}
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnDanger, isRejecting && styles.btnDisabled]}
                disabled={isRejecting}
                onPress={handleConfirmReject}
              >
                {isRejecting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.btnDangerText}>⛔ Confirm Rejection</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: FULL DEPOSIT & USER INSPECTION MODAL             */}
      {/* ========================================================= */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 760 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>🔍 Deposit & Member Audit Profile</Text>
                <Text style={styles.modalSubtitle}>Comprehensive ledger and transaction verification</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setDetailModalVisible(false);
                  setDetailedDeposit(null);
                }}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#00F0FF" />
                <Text style={{ color: '#94A3B8', marginTop: 12 }}>Loading audit trail...</Text>
              </View>
            ) : detailedDeposit ? (
              <ScrollView style={{ maxHeight: 520 }}>
                {/* Deposit Details */}
                <View style={styles.auditSection}>
                  <Text style={styles.auditSectionTitle}>💳 DEPOSIT TRANSACTION DETAILS</Text>
                  <View style={styles.auditGrid}>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Request ID</Text>
                      <Text style={styles.auditVal}>#{detailedDeposit.id}</Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Status</Text>
                      <Text
                        style={[
                          styles.auditVal,
                          detailedDeposit.status === 'APPROVED'
                            ? { color: '#00FF66' }
                            : detailedDeposit.status === 'REJECTED'
                            ? { color: '#FF4757' }
                            : { color: '#FFA726' },
                        ]}
                      >
                        {detailedDeposit.status}
                      </Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Amount</Text>
                      <Text style={[styles.auditVal, { color: '#00F0FF', fontWeight: '800' }]}>
                        ${detailedDeposit.amount.toFixed(2)} USDT
                      </Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Network</Text>
                      <Text style={styles.auditVal}>{detailedDeposit.network}</Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Submitted At</Text>
                      <Text style={styles.auditVal}>
                        {new Date(detailedDeposit.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.auditLabel}>Destination Wallet Address</Text>
                    <View style={styles.addressBox}>
                      <Text style={styles.addressText}>{detailedDeposit.depositAddress}</Text>
                      <TouchableOpacity
                        style={styles.copySmallBtn}
                        onPress={() => handleCopyText(detailedDeposit.depositAddress, 'Address')}
                      >
                        <Text style={styles.copySmallBtnText}>📋 Copy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {detailedDeposit.txHash ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.auditLabel}>Member Submitted Blockchain TxHash</Text>
                      <View style={styles.txBox}>
                        <Text style={styles.txHashText}>{detailedDeposit.txHash}</Text>
                        <TouchableOpacity
                          style={styles.copySmallBtn}
                          onPress={() => handleCopyText(detailedDeposit.txHash!, 'TxHash')}
                        >
                          <Text style={styles.copySmallBtnText}>📋 Copy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {detailedDeposit.rejectionReason ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.auditLabel, { color: '#FF4757' }]}>Rejection Reason</Text>
                      <Text style={{ color: '#FF6B6B', fontSize: 13, marginTop: 4 }}>
                        {detailedDeposit.rejectionReason}
                      </Text>
                    </View>
                  ) : null}

                  {detailedDeposit.adminNotes ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.auditLabel}>Admin Audit Notes</Text>
                      <Text style={{ color: '#E2E8F0', fontSize: 13, marginTop: 4 }}>
                        {detailedDeposit.adminNotes}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Member Profile */}
                {detailedDeposit.user && (
                  <View style={styles.auditSection}>
                    <Text style={styles.auditSectionTitle}>👤 MEMBER PROFILE & LIVE BALANCES</Text>
                    <View style={styles.auditGrid}>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Username</Text>
                        <Text style={[styles.auditVal, { color: '#00F0FF' }]}>
                          @{detailedDeposit.user.username}
                        </Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Email</Text>
                        <Text style={styles.auditVal}>{detailedDeposit.user.email}</Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Current USDT Balance</Text>
                        <Text style={[styles.auditVal, { color: '#00F0FF', fontWeight: '800' }]}>
                          ${(detailedDeposit.user.usdBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                        </Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Current BTC Balance</Text>
                        <Text style={[styles.auditVal, { color: '#F7931A', fontWeight: '800' }]}>
                          ₿ {(detailedDeposit.user.btcBalance || 0).toFixed(8)} BTC
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* User Previous Deposits */}
                {detailedDeposit.userDepositHistory && detailedDeposit.userDepositHistory.length > 0 && (
                  <View style={styles.auditSection}>
                    <Text style={styles.auditSectionTitle}>
                      📜 PREVIOUS DEPOSITS BY @{detailedDeposit.username} (
                      {detailedDeposit.userDepositHistory.length})
                    </Text>
                    {detailedDeposit.userDepositHistory.map((hist) => (
                      <View key={hist.id} style={styles.historyRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyRowTitle}>
                            #{hist.id} • ${hist.amount} {hist.currency}
                          </Text>
                          <Text style={styles.historyRowSub}>
                            {new Date(hist.createdAt).toLocaleDateString()} • {hist.network}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.historyStatusBadge,
                            hist.status === 'APPROVED'
                              ? { backgroundColor: 'rgba(0,255,102,0.15)', borderColor: '#00FF66' }
                              : hist.status === 'REJECTED'
                              ? { backgroundColor: 'rgba(255,71,87,0.15)', borderColor: '#FF4757' }
                              : { backgroundColor: 'rgba(255,167,38,0.15)', borderColor: '#FFA726' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.historyStatusText,
                              hist.status === 'APPROVED'
                                ? { color: '#00FF66' }
                                : hist.status === 'REJECTED'
                                ? { color: '#FF4757' }
                                : { color: '#FFA726' },
                            ]}
                          >
                            {hist.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : null}

            <View style={[styles.modalBtnRow, { marginTop: 18 }]}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => {
                  setDetailModalVisible(false);
                  setDetailedDeposit(null);
                }}
              >
                <Text style={styles.btnSecondaryText}>Close Inspection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A13',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },

  // Header Bar
  headerBar: {
    backgroundColor: '#0D1322',
    borderBottomWidth: 1,
    borderBottomColor: '#1A243B',
    paddingHorizontal: 24,
    paddingVertical: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerBarMobile: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  mobileHeaderWrap: {
    width: '100%',
    gap: 8,
  },
  mobileHeaderRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  mobileActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitleMobile: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  headerSubMobile: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  adminShieldBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  adminShieldText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  backHomeBtn: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  backHomeBtnText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },

  // Navigation Switcher Tabs
  navTabsOuter: {
    backgroundColor: '#090E1A',
    borderBottomWidth: 1,
    borderBottomColor: '#1A243B',
    width: '100%',
  },
  navTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  navTabsContainerMobile: {
    paddingHorizontal: 8,
    gap: 4,
  },
  navTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    gap: 8,
  },
  navTabItemMobile: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 5,
  },
  navTabItemActive: {
    borderBottomColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  navTabIcon: {
    fontSize: 16,
  },
  navTabLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  navTabLabelActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  navPendingBadge: {
    backgroundColor: '#FF4757',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  navPendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  // Notice Banner
  bannerNoticeBox: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  bannerNoticeSuccess: {
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    borderBottomColor: '#00FF66',
  },
  bannerNoticeError: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderBottomColor: '#FF4757',
  },
  bannerNoticeInfo: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderBottomColor: '#00F0FF',
  },
  bannerNoticeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Config Card
  configCard: {
    backgroundColor: '#0D1322',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    gap: 10,
  },
  configCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  configHeaderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  configCardTitle: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  configNetworkPill: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  configNetworkPillText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '700',
  },
  configCardSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  btnEditConfig: {
    backgroundColor: '#00F0FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  btnEditConfigText: {
    color: '#070A13',
    fontSize: 12,
    fontWeight: '800',
  },
  configAddressRow: {
    marginTop: 6,
  },
  configAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A13',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
  },
  configAddressText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  configInstructionsText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  configUpdatedInfo: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0D1322',
    borderWidth: 1,
    borderColor: '#1A243B',
    borderRadius: 12,
    padding: 16,
  },
  statCardMobile: {
    width: '48.5%',
    minWidth: 140,
    flex: undefined,
    padding: 10,
    borderRadius: 8,
  },
  statCardPending: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA726',
  },
  statCardApproved: {
    borderLeftWidth: 4,
    borderLeftColor: '#00FF66',
  },
  statCardRejected: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF4757',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statCountBadgeAmber: {
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFA726',
  },
  statCountBadgeCyan: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  statCountBadgeGreen: {
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00FF66',
  },
  statCountBadgeRed: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF4757',
  },
  statCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  statCardValue: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  statCardValueMobile: {
    fontSize: 14,
    marginBottom: 2,
  },
  statCardSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  statCardSubMobile: {
    fontSize: 10,
    lineHeight: 13,
  },

  // Toolbar & Filters
  toolbarCard: {
    backgroundColor: '#0D1322',
    borderWidth: 1,
    borderColor: '#1A243B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#070A13',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: '#FFFFFF',
    fontSize: 14,
  },
  searchInputMobile: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  searchBtn: {
    backgroundColor: '#00F0FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchBtnMobile: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  searchBtnText: {
    color: '#070A13',
    fontSize: 13,
    fontWeight: '800',
  },
  clearSearchBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearSearchBtnMobile: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  clearSearchBtnText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    alignItems: 'center',
  },
  filterPillsRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  pillsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  pillsGroupMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  filterGroupLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  filterPill: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  filterPillActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },

  // Results Header
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsCountText: {
    color: '#94A3B8',
    fontSize: 13,
  },

  // Table & Cards
  tableCard: {
    gap: 12,
  },
  depositRow: {
    backgroundColor: '#0D1322',
    borderWidth: 1,
    borderColor: '#1A243B',
    borderRadius: 12,
    padding: 16,
    gap: 14,
  },
  rowTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#141D30',
    paddingBottom: 10,
  },
  rowIdCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowIdText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  rowDateText: {
    color: '#64748B',
    fontSize: 12,
  },

  // Status Badges
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgePending: {
    backgroundColor: 'rgba(255, 167, 38, 0.15)',
    borderColor: '#FFA726',
  },
  statusBadgeApproved: {
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    borderColor: '#00FF66',
  },
  statusBadgeRejected: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderColor: '#FF4757',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadgeTextPending: { color: '#FFA726' },
  statusBadgeTextApproved: { color: '#00FF66' },
  statusBadgeTextRejected: { color: '#FF4757' },

  // Row Main Grid
  rowMainGrid: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'flex-start',
  },
  rowMainGridMobile: {
    flexDirection: 'column',
    gap: 14,
  },
  colLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  userCol: {
    flex: 1.2,
    minWidth: 180,
  },
  userNameText: {
    color: '#00F0FF',
    fontSize: 15,
    fontWeight: '800',
  },
  userEmailText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  userFullNameText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  amountCol: {
    flex: 1.2,
    minWidth: 180,
  },
  amountBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amountValueText: {
    fontSize: 17,
    fontWeight: '900',
  },
  currencyPillUsdt: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: '#00F0FF',
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  currencyPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  destinationCol: {
    flex: 2,
    minWidth: 260,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A13',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  addressText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  copySmallBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  copySmallBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  txBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 6,
    gap: 8,
  },
  txLabel: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '900',
  },
  txHashText: {
    flex: 1,
    color: '#00F0FF',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  noTxNotice: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 6,
  },
  rejectionNoticeBox: {
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4757',
    padding: 10,
    borderRadius: 4,
    gap: 4,
  },
  rejectionNoticeTitle: {
    color: '#FF4757',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  rejectionNoticeBody: {
    color: '#FF6B6B',
    fontSize: 12,
    lineHeight: 18,
  },
  notesBox: {
    backgroundColor: '#070A13',
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    gap: 2,
  },
  processedByText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  notesText: {
    color: '#94A3B8',
    fontSize: 12,
  },

  // Row Actions Toolbar
  rowActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#141D30',
    paddingTop: 10,
  },
  btnInspect: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnInspectText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  btnActionApprove: {
    backgroundColor: '#00FF66',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  btnActionApproveText: {
    color: '#070A13',
    fontSize: 12,
    fontWeight: '900',
  },
  btnActionReject: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderWidth: 1,
    borderColor: '#FF4757',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  btnActionRejectText: {
    color: '#FF4757',
    fontSize: 12,
    fontWeight: '800',
  },
  approvedBadgePill: {
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF66',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  approvedBadgePillText: {
    color: '#00FF66',
    fontSize: 12,
    fontWeight: '800',
  },
  rejectedBadgePill: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4757',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  rejectedBadgePillText: {
    color: '#FF4757',
    fontSize: 12,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.5,
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  pageBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  pageBtnDisabled: {
    opacity: 0.3,
  },
  pageBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  pageIndicatorText: {
    color: '#94A3B8',
    fontSize: 13,
  },

  // Empty / Loading States
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D1322',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A243B',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },

  // Access Denied / Auth Barrier
  accessDeniedContainer: {
    flex: 1,
    backgroundColor: '#070A13',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    backgroundColor: '#0D1322',
    borderWidth: 1,
    borderColor: '#FF4757',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    maxWidth: 500,
    width: '100%',
  },
  accessDeniedIcon: {
    fontSize: 54,
    marginBottom: 16,
  },
  accessDeniedTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },
  accessDeniedSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  currentUserInfoBox: {
    backgroundColor: '#070A13',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  currentUserInfoText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  accessDeniedBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },

  // Modals Generic
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0D1322',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A243B',
    paddingBottom: 14,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseBtnText: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '700',
  },

  // Modal Info Boxes
  modalInfoBox: {
    backgroundColor: '#070A13',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInfoLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  modalInfoVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  modalAddressVal: {
    color: '#00F0FF',
    fontSize: 12,
    fontFamily: 'monospace',
    maxWidth: 320,
  },

  // Form Elements
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#070A13',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 13,
  },
  formHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },

  // Modal Buttons
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  btnPrimary: {
    backgroundColor: '#00F0FF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  btnPrimaryText: {
    color: '#070A13',
    fontSize: 13,
    fontWeight: '800',
  },
  btnSecondary: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnSecondaryText: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  btnDanger: {
    backgroundColor: '#FF4757',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  btnDangerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  // Audit Section & Inspect Modal
  auditSection: {
    backgroundColor: '#070A13',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 14,
    marginBottom: 14,
  },
  auditSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  auditGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  auditItem: {
    flex: 1,
    minWidth: 140,
  },
  auditLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  auditVal: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#141D30',
  },
  historyRowTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  historyRowSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  historyStatusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  historyStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  configCurTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  configCurTab: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  configCurTabActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderColor: '#00F0FF',
  },
  configCurTabText: {
    color: '#8A99AD',
    fontSize: 12,
    fontWeight: '700',
  },
  configCurTabTextActive: {
    color: '#00F0FF',
    fontWeight: '900',
  },
});
