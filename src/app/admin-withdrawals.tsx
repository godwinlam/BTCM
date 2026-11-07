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

interface WithdrawalItem {
  id: number;
  userId: number;
  username: string;
  email: string;
  fullName?: string;
  amount: number;
  currency: 'USDT' | 'BTC';
  fee: number;
  netAmount: number;
  destinationAddress: string;
  network: string;
  txHash?: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  adminNotes?: string;
  processedByAdminId?: number;
  processedByAdmin?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface WithdrawalStats {
  pending: { count: number; totalUsdt: number; totalBtc: number };
  approved: { count: number; totalUsdt: number; totalBtc: number };
  completed: { count: number; totalUsdt: number; totalBtc: number };
  rejected: { count: number; totalUsdt: number; totalBtc: number };
  total: { count: number; totalUsdt: number; totalBtc: number };
}

interface DetailedWithdrawal {
  id: number;
  userId: number;
  username: string;
  email: string;
  fullName?: string;
  amount: number;
  currency: 'USDT' | 'BTC';
  fee: number;
  netAmount: number;
  destinationAddress: string;
  network: string;
  txHash?: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  adminNotes?: string;
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
    status: string;
    starRank: number;
    usdBalance: number;
    btcBalance: number;
    totalInvested: number;
  };
  userWithdrawalHistory?: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    destinationAddress: string;
    txHash?: string;
    createdAt: string;
  }>;
}

export default function AdminWithdrawalsPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Access Control & Current Admin
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Data states
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'USDT' | 'BTC'>('ALL');

  // Banner feedback
  const [bannerNotice, setBannerNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pendingDepositCount, setPendingDepositCount] = useState(0);

  // Complete Modal State
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedWithdrawalForComplete, setSelectedWithdrawalForComplete] = useState<WithdrawalItem | null>(null);
  const [completeTxHash, setCompleteTxHash] = useState('');
  const [completeAdminNotes, setCompleteAdminNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Reject Modal State
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedWithdrawalForReject, setSelectedWithdrawalForReject] = useState<WithdrawalItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Detail / Inspect Modal State
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailedWithdrawal, setDetailedWithdrawal] = useState<DetailedWithdrawal | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action in progress (e.g., direct approve)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const showNotice = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setBannerNotice({ text: msg, type });
    setTimeout(() => {
      setBannerNotice(null);
    }, 6000);
  };

  // Auth verification
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
        loadStats();
        loadWithdrawals(1, searchQuery, statusFilter, currencyFilter);
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

  const loadStats = async () => {
    try {
      const res = await api.getAdminWithdrawalStats();
      if (res?.success && res.stats) {
        setStats(res.stats);
      }
      try {
        const dRes = await api.getAdminDepositStats();
        if (dRes?.stats?.pending?.count !== undefined) {
          setPendingDepositCount(dRes.stats.pending.count);
        }
      } catch (_) {}
    } catch (err: any) {
      console.warn('Failed to load withdrawal stats:', err.message);
    }
  };

  const loadWithdrawals = async (
    targetPage = page,
    targetSearch = searchQuery,
    targetStatus = statusFilter,
    targetCurrency = currencyFilter
  ) => {
    setLoading(true);
    try {
      const res = await api.getAdminWithdrawals({
        page: targetPage,
        limit,
        search: targetSearch.trim() || undefined,
        status: targetStatus !== 'ALL' ? targetStatus : undefined,
        currency: targetCurrency !== 'ALL' ? targetCurrency : undefined,
        sortBy: 'created_at',
        order: 'DESC',
      });

      if (res?.success) {
        setWithdrawals(res.withdrawals || []);
        setTotalCount(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
        setPage(targetPage);
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to load withdrawals', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadWithdrawals(1, searchQuery, statusFilter, currencyFilter);
  };

  const handleStatusFilterChange = (status: 'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED') => {
    setStatusFilter(status);
    setPage(1);
    loadWithdrawals(1, searchQuery, status, currencyFilter);
  };

  const handleCurrencyFilterChange = (currency: 'ALL' | 'USDT' | 'BTC') => {
    setCurrencyFilter(currency);
    setPage(1);
    loadWithdrawals(1, searchQuery, statusFilter, currency);
  };

  // 1. Direct Approve Action
  const handleDirectApprove = async (withdrawal: WithdrawalItem) => {
    setActionLoadingId(withdrawal.id);
    try {
      const res = await api.approveAdminWithdrawal(withdrawal.id, {
        adminNotes: `Approved by admin @${currentUser?.username || 'admin'}`,
      });

      if (res?.success) {
        showNotice(`Withdrawal #${withdrawal.id} marked as APPROVED. Ready for on-chain payout.`, 'success');
        loadWithdrawals();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to approve withdrawal', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Open Complete Modal
  const handleOpenCompleteModal = (withdrawal: WithdrawalItem) => {
    setSelectedWithdrawalForComplete(withdrawal);
    setCompleteTxHash(withdrawal.txHash || '');
    setCompleteAdminNotes(withdrawal.adminNotes || '');
    setCompleteModalVisible(true);
  };

  // Generate Realistic Blockchain Hash
  const handleGenerateSampleTxHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    setCompleteTxHash(hash);
  };

  // Submit Complete Action
  const handleConfirmComplete = async () => {
    if (!selectedWithdrawalForComplete) return;

    if (!completeTxHash.trim()) {
      showNotice('Please provide the transaction hash (TxHash) for blockchain verification.', 'error');
      return;
    }

    setIsCompleting(true);
    try {
      const res = await api.completeAdminWithdrawal(selectedWithdrawalForComplete.id, {
        txHash: completeTxHash.trim(),
        adminNotes: completeAdminNotes.trim() || undefined,
      });

      if (res?.success) {
        showNotice(
          `Withdrawal #${selectedWithdrawalForComplete.id} marked as COMPLETED with TxHash: ${completeTxHash.slice(0, 10)}...`,
          'success'
        );
        setCompleteModalVisible(false);
        setSelectedWithdrawalForComplete(null);
        setCompleteTxHash('');
        setCompleteAdminNotes('');
        loadWithdrawals();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to complete withdrawal', 'error');
    } finally {
      setIsCompleting(false);
    }
  };

  // 3. Open Reject Modal
  const handleOpenRejectModal = (withdrawal: WithdrawalItem) => {
    setSelectedWithdrawalForReject(withdrawal);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  // Submit Reject & Refund Action
  const handleConfirmReject = async () => {
    if (!selectedWithdrawalForReject) return;

    if (!rejectReason.trim()) {
      showNotice('Please provide a mandatory reason for rejecting this withdrawal.', 'error');
      return;
    }

    setIsRejecting(true);
    try {
      const res = await api.rejectAdminWithdrawal(selectedWithdrawalForReject.id, {
        reason: rejectReason.trim(),
      });

      if (res?.success) {
        showNotice(
          `Withdrawal #${selectedWithdrawalForReject.id} REJECTED. Fully refunded ${selectedWithdrawalForReject.amount} ${selectedWithdrawalForReject.currency} to @${selectedWithdrawalForReject.username}!`,
          'success'
        );
        setRejectModalVisible(false);
        setSelectedWithdrawalForReject(null);
        setRejectReason('');
        loadWithdrawals();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to reject and refund withdrawal', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // 4. Inspect Full Withdrawal Details
  const handleInspectWithdrawal = async (id: number) => {
    setDetailModalVisible(true);
    setDetailLoading(true);
    try {
      const res = await api.getAdminWithdrawal(id);
      if (res?.success && res.withdrawal) {
        setDetailedWithdrawal(res.withdrawal);
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to fetch detailed withdrawal', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Helper Copy Text to Clipboard (Web-safe)
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

  // --- Render 1: Loading State ---
  if (isVerifying) {
    return (
      <View style={styles.accessDeniedContainer}>
        <ActivityIndicator size="large" color="#00F0FF" />
        <Text style={styles.accessDeniedTitle}>Authenticating Security Protocol...</Text>
        <Text style={styles.accessDeniedSub}>Verifying Administrator Privileges & Role Access</Text>
      </View>
    );
  }

  // --- Render 2: Access Denied Gate ---
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

  // --- Render 3: Full Admin Withdrawal UI ---
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
                    loadStats();
                    loadWithdrawals();
                    showNotice('Withdrawal data refreshed', 'info');
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
            <Text style={styles.headerTitleMobile}>Withdrawal Liquidity & Payout Engine</Text>

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
                <Text style={styles.headerTitle}>Withdrawal Liquidity & Payout Engine</Text>
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
                  loadStats();
                  loadWithdrawals();
                  showNotice('Withdrawal data refreshed', 'info');
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

          <TouchableOpacity style={[styles.navTabItem, styles.navTabItemActive, isMobile && styles.navTabItemMobile]}>
            <Text style={styles.navTabIcon}>💳</Text>
            <Text style={[styles.navTabLabel, styles.navTabLabelActive]}>{isMobile ? 'Withdrawals' : 'Withdrawal Requests'}</Text>
            {stats && stats.pending.count > 0 && (
              <View style={styles.navPendingBadge}>
                <Text style={styles.navPendingBadgeText}>{stats.pending.count}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.navTabItem, isMobile && styles.navTabItemMobile]} onPress={() => router.push('/admin-deposits' as any)}>
            <Text style={styles.navTabIcon}>📥</Text>
            <Text style={styles.navTabLabel}>{isMobile ? 'Deposits' : 'Deposit Management'}</Text>
            {pendingDepositCount > 0 && (
              <View style={styles.navPendingBadge}>
                <Text style={styles.navPendingBadgeText}>{pendingDepositCount}</Text>
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
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>
              ₿ {(stats?.pending.totalBtc || 0).toFixed(8)} BTC {isMobile ? 'pending' : 'pending payout'}
            </Text>
          </View>

          {/* Card 2: Approved */}
          <View style={[styles.statCard, styles.statCardApproved, isMobile && styles.statCardMobile]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>{isMobile ? '🔵 APPROVED' : '🔵 APPROVED (IN QUEUE)'}</Text>
              <View style={styles.statCountBadgeCyan}>
                <Text style={styles.statCountBadgeText}>{stats?.approved.count || 0}</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#00F0FF' }]}>
              ${(stats?.approved.totalUsdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </Text>
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>
              ₿ {(stats?.approved.totalBtc || 0).toFixed(8)} BTC {isMobile ? 'in queue' : 'awaiting broadcast'}
            </Text>
          </View>

          {/* Card 3: Completed */}
          <View style={[styles.statCard, styles.statCardCompleted, isMobile && styles.statCardMobile]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>{isMobile ? '🟢 COMPLETED' : '🟢 COMPLETED DISBURSEMENTS'}</Text>
              <View style={styles.statCountBadgeGreen}>
                <Text style={styles.statCountBadgeText}>{stats?.completed.count || 0}</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#00FF66' }]}>
              ${(stats?.completed.totalUsdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </Text>
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>
              ₿ {(stats?.completed.totalBtc || 0).toFixed(8)} BTC {isMobile ? 'settled' : 'successfully paid'}
            </Text>
          </View>

          {/* Card 4: Rejected / Refunded */}
          <View style={[styles.statCard, styles.statCardRejected, isMobile && styles.statCardMobile]}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>{isMobile ? '⛔ REJECTED' : '⛔ REJECTED & REFUNDED'}</Text>
              <View style={styles.statCountBadgeRed}>
                <Text style={styles.statCountBadgeText}>{stats?.rejected.count || 0}</Text>
              </View>
            </View>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#FF4757' }]}>
              ${(stats?.rejected.totalUsdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
            </Text>
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>
              ₿ {(stats?.rejected.totalBtc || 0).toFixed(8)} BTC {isMobile ? 'refunded' : '100% refunded to user wallets'}
            </Text>
          </View>
        </View>

        {/* Action Controls & Filters Bar */}
        <View style={styles.toolbarCard}>
          {/* Search Box */}
          <View style={styles.searchRow}>
            <TextInput
              style={[styles.searchInput, isMobile && styles.searchInputMobile]}
              placeholder={isMobile ? 'Search user, email, address...' : 'Search by @username, email, destination address or TxHash...'}
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
                  loadWithdrawals(1, '', statusFilter, currencyFilter);
                }}
              >
                <Text style={styles.clearSearchBtnText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <View style={[styles.filterPillsRow, isMobile && styles.filterPillsRowMobile]}>
            {/* Status Pills */}
            <View style={[styles.pillsGroup, isMobile && styles.pillsGroupMobile]}>
              <Text style={styles.filterGroupLabel}>STATUS:</Text>
              <View style={styles.pillsContainer}>
                {(['ALL', 'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'] as const).map((st) => (
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
                        ? '🔵 Approved'
                        : st === 'COMPLETED'
                        ? (isMobile ? '🟢 Done' : '🟢 Completed')
                        : '⛔ Rejected'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Currency Pills */}
            <View style={[styles.pillsGroup, isMobile && styles.pillsGroupMobile]}>
              <Text style={styles.filterGroupLabel}>CURRENCY:</Text>
              <View style={styles.pillsContainer}>
                {(['ALL', 'USDT', 'BTC'] as const).map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[styles.filterPill, currencyFilter === curr && styles.filterPillActive]}
                    onPress={() => handleCurrencyFilterChange(curr)}
                  >
                    <Text style={[styles.filterPillText, currencyFilter === curr && styles.filterPillTextActive]}>
                      {curr === 'ALL' ? 'All' : curr === 'USDT' ? (isMobile ? '💵 USDT' : '💵 USDT (TRC20)') : (isMobile ? '₿ BTC' : '₿ BTC (Native)')}
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
            Showing <Text style={{ color: '#00F0FF', fontWeight: '800' }}>{withdrawals.length}</Text> of{' '}
            <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{totalCount}</Text> withdrawal records
          </Text>
          {loading && <ActivityIndicator size="small" color="#00F0FF" />}
        </View>

        {/* Withdrawals Table / Card List */}
        {loading && withdrawals.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00F0FF" />
            <Text style={styles.loadingText}>Fetching on-chain withdrawal logs...</Text>
          </View>
        ) : withdrawals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Withdrawal Requests Found</Text>
            <Text style={styles.emptySub}>No records match the selected status or query filters.</Text>
          </View>
        ) : (
          <View style={styles.tableCard}>
            {withdrawals.map((item) => {
              const isActionLoading = actionLoadingId === item.id;
              return (
                <View key={item.id} style={styles.withdrawalRow}>
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
                            : item.status === 'COMPLETED'
                            ? styles.statusBadgeCompleted
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
                              : item.status === 'COMPLETED'
                              ? styles.statusBadgeTextCompleted
                              : styles.statusBadgeTextRejected,
                          ]}
                        >
                          {item.status === 'PENDING'
                            ? '⏳ PENDING AUDIT'
                            : item.status === 'APPROVED'
                            ? '🔵 APPROVED'
                            : item.status === 'COMPLETED'
                            ? '🟢 COMPLETED'
                            : '⛔ REJECTED / REFUNDED'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.rowDateText}>
                      Requested: {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  {/* Row Main: User, Amount, Destination */}
                  <View style={[styles.rowMainGrid, isMobile && styles.rowMainGridMobile]}>
                    {/* User Info Column */}
                    <View style={styles.userCol}>
                      <Text style={styles.colLabel}>REQUESTING USER</Text>
                      <TouchableOpacity onPress={() => handleInspectWithdrawal(item.id)}>
                        <Text style={styles.userNameText}>@{item.username}</Text>
                      </TouchableOpacity>
                      <Text style={styles.userEmailText}>{item.email}</Text>
                      {item.fullName ? <Text style={styles.userFullNameText}>{item.fullName}</Text> : null}
                    </View>

                    {/* Amount & Currency Column */}
                    <View style={styles.amountCol}>
                      <Text style={styles.colLabel}>AMOUNT & ASSET</Text>
                      <View style={styles.amountBadgeRow}>
                        <Text
                          style={[
                            styles.amountValueText,
                            item.currency === 'BTC' ? { color: '#F7931A' } : { color: '#00F0FF' },
                          ]}
                        >
                          {item.currency === 'BTC'
                            ? `${item.amount.toFixed(8)} BTC`
                            : `${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT`}
                        </Text>
                        <View
                          style={[
                            styles.currencyPill,
                            item.currency === 'BTC' ? styles.currencyPillBtc : styles.currencyPillUsdt,
                          ]}
                        >
                          <Text style={styles.currencyPillText}>{item.network || item.currency}</Text>
                        </View>
                      </View>
                      <Text style={styles.netAmountSub}>Net Payout: {item.netAmount || item.amount} {item.currency} (Fee: 0)</Text>
                    </View>

                    {/* Destination Address & Tx Column */}
                    <View style={styles.destinationCol}>
                      <Text style={styles.colLabel}>DESTINATION WALLET ADDRESS</Text>
                      <View style={styles.addressBox}>
                        <Text style={styles.addressText} numberOfLines={1}>
                          {item.destinationAddress}
                        </Text>
                        <TouchableOpacity
                          style={styles.copySmallBtn}
                          onPress={() => handleCopyText(item.destinationAddress, 'Address')}
                        >
                          <Text style={styles.copySmallBtnText}>📋 Copy</Text>
                        </TouchableOpacity>
                      </View>

                      {/* TxHash if present */}
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
                        <Text style={styles.noTxNotice}>No on-chain broadcast hash yet</Text>
                      )}
                    </View>
                  </View>

                  {/* Admin Notes or Processing Info */}
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
                      onPress={() => handleInspectWithdrawal(item.id)}
                    >
                      <Text style={styles.btnInspectText}>🔍 Inspect Details</Text>
                    </TouchableOpacity>

                    {/* Pending actions */}
                    {item.status === 'PENDING' && (
                      <>
                        <TouchableOpacity
                          style={[styles.btnActionApprove, isActionLoading && styles.btnDisabled]}
                          disabled={isActionLoading}
                          onPress={() => handleDirectApprove(item)}
                        >
                          {isActionLoading ? (
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <Text style={styles.btnActionApproveText}>✓ Approve</Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnActionComplete}
                          onPress={() => handleOpenCompleteModal(item)}
                        >
                          <Text style={styles.btnActionCompleteText}>🚀 Pay & Complete</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnActionReject}
                          onPress={() => handleOpenRejectModal(item)}
                        >
                          <Text style={styles.btnActionRejectText}>⛔ Reject & Refund</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Approved actions */}
                    {item.status === 'APPROVED' && (
                      <>
                        <TouchableOpacity
                          style={styles.btnActionComplete}
                          onPress={() => handleOpenCompleteModal(item)}
                        >
                          <Text style={styles.btnActionCompleteText}>🚀 Finalize Payout (TxHash)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.btnActionReject}
                          onPress={() => handleOpenRejectModal(item)}
                        >
                          <Text style={styles.btnActionRejectText}>⛔ Reject & Refund</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Completed actions */}
                    {item.status === 'COMPLETED' && (
                      <View style={styles.completedBadgePill}>
                        <Text style={styles.completedBadgePillText}>✓ Payout Confirmed On-Chain</Text>
                      </View>
                    )}

                    {/* Rejected actions */}
                    {item.status === 'REJECTED' && (
                      <View style={styles.refundedBadgePill}>
                        <Text style={styles.refundedBadgePillText}>↩ Funds Fully Refunded to Wallet</Text>
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
              onPress={() => loadWithdrawals(page - 1, searchQuery, statusFilter, currencyFilter)}
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
              onPress={() => loadWithdrawals(page + 1, searchQuery, statusFilter, currencyFilter)}
            >
              <Text style={styles.pageBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL 1: PAY & COMPLETE WITH BLOCKCHAIN TX HASH           */}
      {/* ========================================================= */}
      <Modal
        visible={completeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>🚀 Confirm On-Chain Disbursement</Text>
                <Text style={styles.modalSubtitle}>
                  Mark withdrawal #{selectedWithdrawalForComplete?.id} as COMPLETED and broadcast TxHash.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCompleteModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedWithdrawalForComplete && (
              <View style={styles.modalInfoBox}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>User Account:</Text>
                  <Text style={styles.modalInfoVal}>
                    @{selectedWithdrawalForComplete.username} ({selectedWithdrawalForComplete.email})
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Payout Amount:</Text>
                  <Text style={[styles.modalInfoVal, { color: '#00FF66', fontWeight: '800' }]}>
                    {selectedWithdrawalForComplete.amount} {selectedWithdrawalForComplete.currency}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Destination Network:</Text>
                  <Text style={styles.modalInfoVal}>
                    {selectedWithdrawalForComplete.network || selectedWithdrawalForComplete.currency}
                  </Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalInfoLabel}>Recipient Address:</Text>
                  <Text style={styles.modalAddressVal} numberOfLines={2}>
                    {selectedWithdrawalForComplete.destinationAddress}
                  </Text>
                </View>
              </View>
            )}

            {/* Input: Blockchain TxHash */}
            <View style={styles.formGroup}>
              <View style={styles.formLabelRow}>
                <Text style={styles.formLabel}>TRANSACTION HASH (TX HASH) *</Text>
                <TouchableOpacity onPress={handleGenerateSampleTxHash}>
                  <Text style={styles.autoGenerateText}>⚡ Generate 64-char Hash</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 0x8a9bf2810398ef3bc10283c748a... or TRC20 Hash"
                placeholderTextColor="#667085"
                value={completeTxHash}
                onChangeText={setCompleteTxHash}
                autoCapitalize="none"
              />
              <Text style={styles.formHint}>
                This transaction hash is recorded permanently in the user's ledger and verification portal.
              </Text>
            </View>

            {/* Input: Admin Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>ADMIN AUDIT NOTE (OPTIONAL)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Disbursed via Binance Enterprise Custody Hot Wallet #1"
                placeholderTextColor="#667085"
                value={completeAdminNotes}
                onChangeText={setCompleteAdminNotes}
              />
            </View>

            {/* Actions */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => setCompleteModalVisible(false)}
              >
                <Text style={styles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnPrimary, isCompleting && styles.btnDisabled]}
                disabled={isCompleting}
                onPress={handleConfirmComplete}
              >
                {isCompleting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text style={styles.btnPrimaryText}>✓ Finalize & Mark Completed</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: REJECT AND AUTOMATIC WALLET REFUND               */}
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
                <Text style={[styles.modalTitle, { color: '#FF4757' }]}>⛔ Reject & Auto-Refund</Text>
                <Text style={styles.modalSubtitle}>
                  Withdrawal #{selectedWithdrawalForReject?.id} • Automatic Balance Reversal
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedWithdrawalForReject && (
              <View style={styles.refundWarningBox}>
                <Text style={styles.refundWarningTitle}>⚠️ AUTOMATIC WALLET REFUND POLICY</Text>
                <Text style={styles.refundWarningText}>
                  Upon rejection, <Text style={{ color: '#00FF66', fontWeight: '800' }}>
                    {selectedWithdrawalForReject.amount} {selectedWithdrawalForReject.currency}
                  </Text>{' '}
                  will be refunded <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>immediately</Text> into{' '}
                  <Text style={{ color: '#00F0FF', fontWeight: '800' }}>@{selectedWithdrawalForReject.username}</Text>'s{' '}
                  account balance with an audited transaction record.
                </Text>
              </View>
            )}

            {/* Input: Rejection Reason */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>REJECTION REASON (MANDATORY) *</Text>
              <TextInput
                style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="e.g. Invalid TRC20 address provided / Suspicious activity detected / Requested by user..."
                placeholderTextColor="#667085"
                multiline
                numberOfLines={3}
                value={rejectReason}
                onChangeText={setRejectReason}
              />
            </View>

            {/* Actions */}
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
                  <Text style={styles.btnDangerText}>⛔ Confirm Rejection & Refund Funds</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: FULL WITHDRAWAL & USER INSPECTION MODAL          */}
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
                <Text style={styles.modalTitle}>🔍 Withdrawal & User Audit Record</Text>
                <Text style={styles.modalSubtitle}>Comprehensive ledger and member profile verification</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setDetailModalVisible(false);
                  setDetailedWithdrawal(null);
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
            ) : detailedWithdrawal ? (
              <ScrollView style={{ maxHeight: 520 }}>
                {/* Withdrawal Core Summary */}
                <View style={styles.auditSection}>
                  <Text style={styles.auditSectionTitle}>💳 WITHDRAWAL DETAILS</Text>
                  <View style={styles.auditGrid}>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Request ID</Text>
                      <Text style={styles.auditVal}>#{detailedWithdrawal.id}</Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Status</Text>
                      <Text
                        style={[
                          styles.auditVal,
                          detailedWithdrawal.status === 'COMPLETED'
                            ? { color: '#00FF66' }
                            : detailedWithdrawal.status === 'REJECTED'
                            ? { color: '#FF4757' }
                            : { color: '#FFA726' },
                        ]}
                      >
                        {detailedWithdrawal.status}
                      </Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Gross Amount</Text>
                      <Text style={[styles.auditVal, { color: '#00F0FF', fontWeight: '800' }]}>
                        {detailedWithdrawal.amount} {detailedWithdrawal.currency}
                      </Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Fee / Net</Text>
                      <Text style={styles.auditVal}>
                        Fee: 0 • Net: {detailedWithdrawal.netAmount || detailedWithdrawal.amount}{' '}
                        {detailedWithdrawal.currency}
                      </Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Network</Text>
                      <Text style={styles.auditVal}>{detailedWithdrawal.network}</Text>
                    </View>
                    <View style={styles.auditItem}>
                      <Text style={styles.auditLabel}>Requested At</Text>
                      <Text style={styles.auditVal}>
                        {new Date(detailedWithdrawal.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <View style={{ marginTop: 12 }}>
                    <Text style={styles.auditLabel}>Destination Wallet Address</Text>
                    <View style={styles.addressBox}>
                      <Text style={styles.addressText}>{detailedWithdrawal.destinationAddress}</Text>
                      <TouchableOpacity
                        style={styles.copySmallBtn}
                        onPress={() => handleCopyText(detailedWithdrawal.destinationAddress, 'Address')}
                      >
                        <Text style={styles.copySmallBtnText}>📋 Copy</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {detailedWithdrawal.txHash ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.auditLabel}>Blockchain TxHash</Text>
                      <View style={styles.txBox}>
                        <Text style={styles.txHashText}>{detailedWithdrawal.txHash}</Text>
                        <TouchableOpacity
                          style={styles.copySmallBtn}
                          onPress={() => handleCopyText(detailedWithdrawal.txHash!, 'TxHash')}
                        >
                          <Text style={styles.copySmallBtnText}>📋 Copy</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {detailedWithdrawal.adminNotes ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={styles.auditLabel}>Admin Audit Notes</Text>
                      <Text style={{ color: '#E2E8F0', fontSize: 13, marginTop: 4 }}>
                        {detailedWithdrawal.adminNotes}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Member Profile Information */}
                {detailedWithdrawal.user && (
                  <View style={styles.auditSection}>
                    <Text style={styles.auditSectionTitle}>👤 MEMBER PROFILE & BALANCES</Text>
                    <View style={styles.auditGrid}>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Username</Text>
                        <Text style={[styles.auditVal, { color: '#00F0FF' }]}>
                          @{detailedWithdrawal.user.username}
                        </Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Email</Text>
                        <Text style={styles.auditVal}>{detailedWithdrawal.user.email}</Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Account Role</Text>
                        <Text style={styles.auditVal}>{detailedWithdrawal.user.role?.toUpperCase()}</Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Account Status</Text>
                        <Text
                          style={[
                            styles.auditVal,
                            detailedWithdrawal.user.status === 'ACTIVE' ? { color: '#00FF66' } : { color: '#FF4757' },
                          ]}
                        >
                          {detailedWithdrawal.user.status}
                        </Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Current USDT Balance</Text>
                        <Text style={[styles.auditVal, { color: '#00F0FF', fontWeight: '800' }]}>
                          ${(detailedWithdrawal.user.usdBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                        </Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Current BTC Balance</Text>
                        <Text style={[styles.auditVal, { color: '#F7931A', fontWeight: '800' }]}>
                          ₿ {(detailedWithdrawal.user.btcBalance || 0).toFixed(8)} BTC
                        </Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Total Rig Invested</Text>
                        <Text style={styles.auditVal}>
                          ${(detailedWithdrawal.user.totalInvested || 0).toLocaleString()} USDT
                        </Text>
                      </View>
                      <View style={styles.auditItem}>
                        <Text style={styles.auditLabel}>Star Rank</Text>
                        <Text style={styles.auditVal}>⭐ {detailedWithdrawal.user.starRank || 0} Star</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Member Recent Withdrawals History */}
                {detailedWithdrawal.userWithdrawalHistory && detailedWithdrawal.userWithdrawalHistory.length > 0 && (
                  <View style={styles.auditSection}>
                    <Text style={styles.auditSectionTitle}>
                      📜 PREVIOUS WITHDRAWALS BY @{detailedWithdrawal.username} (
                      {detailedWithdrawal.userWithdrawalHistory.length})
                    </Text>
                    {detailedWithdrawal.userWithdrawalHistory.map((hist) => (
                      <View key={hist.id} style={styles.historyRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyRowTitle}>
                            #{hist.id} • {hist.amount} {hist.currency}
                          </Text>
                          <Text style={styles.historyRowSub}>
                            {new Date(hist.createdAt).toLocaleDateString()} • {hist.destinationAddress.slice(0, 16)}...
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.historyStatusBadge,
                            hist.status === 'COMPLETED'
                              ? { backgroundColor: 'rgba(0,255,102,0.15)', borderColor: '#00FF66' }
                              : hist.status === 'REJECTED'
                              ? { backgroundColor: 'rgba(255,71,87,0.15)', borderColor: '#FF4757' }
                              : { backgroundColor: 'rgba(255,167,38,0.15)', borderColor: '#FFA726' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.historyStatusText,
                              hist.status === 'COMPLETED'
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
                  setDetailedWithdrawal(null);
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
    borderLeftColor: '#00F0FF',
  },
  statCardCompleted: {
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
  withdrawalRow: {
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
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  statusBadgeCompleted: {
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
  statusBadgeTextApproved: { color: '#00F0FF' },
  statusBadgeTextCompleted: { color: '#00FF66' },
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
  currencyPill: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  currencyPillUsdt: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: '#00F0FF',
  },
  currencyPillBtc: {
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    borderColor: '#F7931A',
  },
  currencyPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  netAmountSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
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
    backgroundColor: 'rgba(0, 255, 102, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.2)',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 6,
    gap: 8,
  },
  txLabel: {
    color: '#00FF66',
    fontSize: 10,
    fontWeight: '900',
  },
  txHashText: {
    flex: 1,
    color: '#00FF66',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  noTxNotice: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 6,
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
    backgroundColor: '#00F0FF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  btnActionApproveText: {
    color: '#070A13',
    fontSize: 12,
    fontWeight: '800',
  },
  btnActionComplete: {
    backgroundColor: '#00FF66',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  btnActionCompleteText: {
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
  completedBadgePill: {
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF66',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  completedBadgePillText: {
    color: '#00FF66',
    fontSize: 12,
    fontWeight: '800',
  },
  refundedBadgePill: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4757',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  refundedBadgePillText: {
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
  formLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  formLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  autoGenerateText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
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

  // Warning Box
  refundWarningBox: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: '#FF4757',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  refundWarningTitle: {
    color: '#FF4757',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  refundWarningText: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 20,
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
});
