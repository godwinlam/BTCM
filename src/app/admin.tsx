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

interface AdminStats {
  users: {
    total: number;
    admins: number;
    active: number;
    suspended: number;
    totalInvestedUsdt: number;
    totalUsdtInWallets: number;
    totalBtcInWallets: number;
    totalMiningBtcEarned: number;
    totalDirectBonusPaid: number;
    totalBinaryBonusPaid: number;
  };
  contracts: {
    total: number;
    active: number;
    totalVolumeUsd: number;
    totalBtcHarvested: number;
  };
}

interface ManagedUser {
  id: number;
  _id?: string | number;
  username: string;
  email: string;
  fullName: string;
  referralCode: string;
  role: 'admin' | 'user';
  status: 'ACTIVE' | 'SUSPENDED';
  starRank: number;
  starBadge?: string;
  sponsorId?: number;
  sponsorUsername?: string;
  parentUsername?: string;
  binaryPosition?: 'A' | 'B';
  activeContractsCount: number;
  directReferralsCount: number;
  wallet: {
    usdBalance: number;
    btcBalance: number;
    totalInvested: number;
    totalDirectEarned: number;
    totalBinaryEarned: number;
    totalMiningBtcEarned: number;
    totalBinaryConfiscated: number;
  };
  binaryLegs: {
    legACurrent: number;
    legBCurrent: number;
    legATotal: number;
    legBTotal: number;
    pairsCount: number;
  };
  createdAt: string;
}

export default function AdminUserManagement() {
  const router = useRouter();
  const isMobile = useIsMobile();

  // Access control & state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Data state
  const [stats, setStats] = useState<AdminStats>({
    users: {
      total: 0,
      admins: 0,
      active: 0,
      suspended: 0,
      totalInvestedUsdt: 0,
      totalUsdtInWallets: 0,
      totalBtcInWallets: 0,
      totalMiningBtcEarned: 0,
      totalDirectBonusPaid: 0,
      totalBinaryBonusPaid: 0,
    },
    contracts: {
      total: 0,
      active: 0,
      totalVolumeUsd: 0,
      totalBtcHarvested: 0,
    },
  });
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'SUSPENDED'>('all');

  // Notification Banner
  const [bannerNotice, setBannerNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
  const [pendingDepositCount, setPendingDepositCount] = useState(0);

  const showNotice = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setBannerNotice({ text: msg, type });
    setTimeout(() => setBannerNotice(null), 5000);
  };

  // Modals state
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [detailedUserLoading, setDetailedUserLoading] = useState(false);
  const [detailedUser, setDetailedUser] = useState<any>(null);

  // Edit User State
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [editStarRank, setEditStarRank] = useState('0');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Wallet Adjust Modal
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [walletCurrency, setWalletCurrency] = useState<'USDT' | 'BTC'>('USDT');
  const [walletAdjustType, setWalletAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);

  // Reset Password Modal
  const [resetPwdModalVisible, setResetPwdModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPwd, setIsResettingPwd] = useState(false);

  // Create User Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newInitialUsdt, setNewInitialUsdt] = useState('1000');
  const [newSponsor, setNewSponsor] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Initial Auth Verification
  useEffect(() => {
    verifyAdminAuth();
  }, []);

  const verifyAdminAuth = async () => {
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
        // Load admin initial data
        loadStats();
        loadUsers(1, searchQuery, roleFilter, statusFilter);
      } else {
        setIsAuthorized(false);
        setCurrentUser(res?.user || null);
      }
    } catch (err) {
      console.error('Auth verify error:', err);
      setIsAuthorized(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.getAdminStats();
      if (res?.stats) {
        const raw = res.stats;
        const normalizedStats: AdminStats = {
          users: {
            total: raw.users?.total ?? raw.totalUsers ?? 0,
            admins: raw.users?.admins ?? 0,
            active: raw.users?.active ?? raw.totalUsers ?? 0,
            suspended: raw.users?.suspended ?? 0,
            totalInvestedUsdt: raw.users?.totalInvestedUsdt ?? raw.totalInvested ?? 0,
            totalUsdtInWallets: raw.users?.totalUsdtInWallets ?? raw.totalUsdBalance ?? 0,
            totalBtcInWallets: raw.users?.totalBtcInWallets ?? raw.totalBtcBalance ?? 0,
            totalMiningBtcEarned: raw.users?.totalMiningBtcEarned ?? 0,
            totalDirectBonusPaid: raw.users?.totalDirectBonusPaid ?? 0,
            totalBinaryBonusPaid: raw.users?.totalBinaryBonusPaid ?? 0,
          },
          contracts: {
            total: raw.contracts?.total ?? raw.activeContractsCount ?? 0,
            active: raw.contracts?.active ?? raw.activeContractsCount ?? 0,
            totalVolumeUsd: raw.contracts?.totalVolumeUsd ?? 0,
            totalBtcHarvested: raw.contracts?.totalBtcHarvested ?? 0,
          },
        };
        setStats(normalizedStats);
      }
      try {
        const wRes = await api.getAdminWithdrawalStats();
        if (wRes?.stats?.pending?.count !== undefined) {
          setPendingWithdrawalCount(wRes.stats.pending.count);
        }
      } catch (_) {}
      try {
        const dRes = await api.getAdminDepositStats();
        if (dRes?.stats?.pending?.count !== undefined) {
          setPendingDepositCount(dRes.stats.pending.count);
        }
      } catch (_) {}
    } catch (err: any) {
      console.warn('Failed to load admin stats:', err.message);
    }
  };

  const loadUsers = async (
    targetPage = page,
    targetSearch = searchQuery,
    targetRole = roleFilter,
    targetStatus = statusFilter
  ) => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers({
        page: targetPage,
        limit,
        search: targetSearch.trim() || undefined,
        role: targetRole !== 'all' ? targetRole : undefined,
        status: targetStatus !== 'all' ? targetStatus : undefined,
        sortBy: 'id',
        order: 'DESC',
      });

      if (res?.success) {
        setUsers(res.users);
        setTotalCount(res.pagination.total);
        setPage(targetPage);
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to load users list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadUsers(1, searchQuery, roleFilter, statusFilter);
  };

  const handleRoleFilterChange = (role: 'all' | 'admin' | 'user') => {
    setRoleFilter(role);
    setPage(1);
    loadUsers(1, searchQuery, role, statusFilter);
  };

  const handleStatusFilterChange = (status: 'all' | 'ACTIVE' | 'SUSPENDED') => {
    setStatusFilter(status);
    setPage(1);
    loadUsers(1, searchQuery, roleFilter, status);
  };

  // Open User Detail & Edit Modal
  const handleOpenUserDetail = async (user: ManagedUser) => {
    setSelectedUser(user);
    setEditFullName(user.fullName || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'user');
    setEditStatus(user.status || 'ACTIVE');
    setEditStarRank(String(user.starRank || 0));
    setViewModalVisible(true);

    setDetailedUserLoading(true);
    try {
      const res = await api.getAdminUser(user.id);
      if (res?.success) {
        setDetailedUser(res);
      }
    } catch (err: any) {
      showNotice('Failed to fetch user full details: ' + err.message, 'error');
    } finally {
      setDetailedUserLoading(false);
    }
  };

  // Submit User Details Edit
  const handleSaveUserDetails = async () => {
    if (!selectedUser) return;
    setIsUpdatingUser(true);
    try {
      const res = await api.updateAdminUser(selectedUser.id, {
        fullName: editFullName.trim(),
        email: editEmail.trim(),
        role: editRole,
        status: editStatus,
        starRank: parseInt(editStarRank, 10) || 0,
      });

      if (res?.success) {
        showNotice(`User @${selectedUser.username} updated successfully!`, 'success');
        setViewModalVisible(false);
        loadUsers();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to update user', 'error');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Toggle User Status Quick Action (Suspend / Activate)
  const handleToggleStatus = async (user: ManagedUser) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.updateAdminUser(user.id, { status: nextStatus });
      if (res?.success) {
        showNotice(`@${user.username} is now ${nextStatus}`, 'success');
        loadUsers();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to toggle status', 'error');
    }
  };

  // Open Wallet Adjustment Modal
  const handleOpenWalletModal = (user: ManagedUser) => {
    setSelectedUser(user);
    setWalletCurrency('USDT');
    setWalletAdjustType('CREDIT');
    setWalletAmount('');
    setWalletReason('');
    setWalletModalVisible(true);
  };

  const handleConfirmWalletAdjust = async () => {
    if (!selectedUser) return;
    const numAmt = parseFloat(walletAmount);
    if (!numAmt || numAmt <= 0) {
      showNotice('Please enter a valid amount greater than 0', 'error');
      return;
    }

    setIsAdjustingWallet(true);
    try {
      const res = await api.adjustUserWallet(selectedUser.id, {
        currency: walletCurrency,
        type: walletAdjustType,
        amount: numAmt,
        reason: walletReason.trim() || undefined,
      });

      if (res?.success) {
        showNotice(res.message, 'success');
        setWalletModalVisible(false);
        loadUsers();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to adjust wallet balance', 'error');
    } finally {
      setIsAdjustingWallet(false);
    }
  };

  // Open Reset Password Modal
  const handleOpenResetPwdModal = (user: ManagedUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetPwdModalVisible(true);
  };

  const handleConfirmResetPwd = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      showNotice('Password must be at least 6 characters', 'error');
      return;
    }

    setIsResettingPwd(true);
    try {
      const res = await api.resetUserPassword(selectedUser.id, newPassword);
      if (res?.success) {
        showNotice(`Password for @${selectedUser.username} successfully reset!`, 'success');
        setResetPwdModalVisible(false);
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsResettingPwd(false);
    }
  };

  // Submit Create New User
  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newEmail.trim() || !newPwd) {
      showNotice('Please fill in username, email, and password', 'error');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await api.createAdminUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        password: newPwd,
        fullName: newName.trim() || undefined,
        role: newRole,
        initialUsdt: parseFloat(newInitialUsdt) || 0,
        sponsorUsername: newSponsor.trim() || undefined,
      });

      if (res?.success) {
        showNotice(`User @${newUsername.trim()} created successfully with role ${newRole}!`, 'success');
        setCreateModalVisible(false);
        setNewUsername('');
        setNewEmail('');
        setNewPwd('');
        setNewName('');
        setNewSponsor('');
        loadUsers();
        loadStats();
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to create user', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  // 1. Loading State
  if (isVerifying) {
    return (
      <View style={styles.accessDeniedContainer}>
        <ActivityIndicator size="large" color="#00F0FF" />
        <Text style={styles.accessDeniedTitle}>Authenticating Security Protocol...</Text>
        <Text style={styles.accessDeniedSub}>Verifying Administrator Privileges & Role Authentication</Text>
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
            This management console is strictly restricted to system administrators with role{' '}
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

  // 3. Authorized Admin User Management UI
  return (
    <View style={styles.container}>
      {/* Top Admin Header Bar */}
      <View style={[styles.headerBar, isMobile && styles.headerBarMobile]}>
        {isMobile ? (
          /* MOBILE HEADER LAYOUT */
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
                    loadUsers();
                    showNotice('System data refreshed', 'info');
                  }}
                >
                  <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.push('/dashboard' as any)}>
                  <Text style={styles.backHomeBtnText}>← Dashboard</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 2: Page Title */}
            <Text style={styles.headerTitleMobile}>User & Node Management System</Text>

            {/* Row 3: Admin Subtitle & Create Action */}
            <View style={styles.mobileHeaderRow3}>
              <Text style={styles.headerSubMobile}>
                Admin: <Text style={{ color: '#00F0FF', fontWeight: '800' }}>@{currentUser?.username}</Text>
              </Text>
              <TouchableOpacity style={styles.createUserBtnMobile} onPress={() => setCreateModalVisible(true)}>
                <Text style={styles.createUserBtnTextMobile}>+ Create User / Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* DESKTOP HEADER LAYOUT */
          <>
            <View style={styles.headerLeft}>
              <View style={styles.adminShieldBadge}>
                <Text style={styles.adminShieldText}>🛡️ ADMIN CONSOLE</Text>
              </View>
              <View>
                <Text style={styles.headerTitle}>User & Node Management System</Text>
                <Text style={styles.headerSub}>
                  Logged in as Master Administrator <Text style={{ color: '#00F0FF', fontWeight: '800' }}>@{currentUser?.username}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={() => {
                  loadStats();
                  loadUsers();
                  showNotice('System data refreshed', 'info');
                }}
              >
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.createUserBtn} onPress={() => setCreateModalVisible(true)}>
                <Text style={styles.createUserBtnText}>+ Create User / Admin</Text>
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
          <TouchableOpacity style={[styles.navTabItem, styles.navTabItemActive, isMobile && styles.navTabItemMobile]}>
            <Text style={styles.navTabIcon}>👥</Text>
            <Text style={[styles.navTabLabel, styles.navTabLabelActive]}>{isMobile ? 'Users' : 'User & Node Management'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTabItem, isMobile && styles.navTabItemMobile]}
            onPress={() => router.push('/admin-withdrawals' as any)}
          >
            <Text style={styles.navTabIcon}>💳</Text>
            <Text style={styles.navTabLabel}>{isMobile ? 'Withdrawals' : 'Withdrawal Requests'}</Text>
            {pendingWithdrawalCount > 0 && (
              <View style={styles.navPendingBadge}>
                <Text style={styles.navPendingBadgeText}>{pendingWithdrawalCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTabItem, isMobile && styles.navTabItemMobile]}
            onPress={() => router.push('/admin-deposits' as any)}
          >
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
          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <Text style={styles.statCardLabel}>{isMobile ? 'TOTAL USERS' : 'TOTAL NETWORK USERS'}</Text>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile]}>{stats?.users?.total?.toLocaleString() ?? '0'}</Text>
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>
              🟢 {stats?.users?.active?.toLocaleString() ?? '0'} Active • ⛔ {stats?.users?.suspended ?? 0} Suspended
            </Text>
          </View>

          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <Text style={styles.statCardLabel}>{isMobile ? 'ADMINS' : 'SYSTEM ADMINISTRATORS'}</Text>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#00F0FF' }]}>
              {stats?.users?.admins?.toLocaleString() ?? '0'}
            </Text>
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>{isMobile ? 'Role: admin' : "Role: 'admin' with privileged console access"}</Text>
          </View>

          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <Text style={styles.statCardLabel}>{isMobile ? 'USDT BALANCES' : 'TOTAL USER USDT BALANCES'}</Text>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#00E676' }]}>
              ${stats?.users?.totalUsdtInWallets?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
            </Text>
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>
              Invested: ${stats?.users?.totalInvestedUsdt?.toLocaleString(undefined, { minimumFractionDigits: 2 }) ?? '0.00'}
            </Text>
          </View>

          <View style={[styles.statCard, isMobile && styles.statCardMobile]}>
            <Text style={styles.statCardLabel}>{isMobile ? 'BITCOIN ROI' : 'BITCOIN ROI DISTRIBUTED'}</Text>
            <Text style={[styles.statCardValue, isMobile && styles.statCardValueMobile, { color: '#F7931A' }]}>
              ₿ {stats?.users?.totalMiningBtcEarned?.toFixed(6) ?? '0.000000'} BTC
            </Text>
            <Text style={[styles.statCardSub, isMobile && styles.statCardSubMobile]}>
              {stats?.contracts?.active ?? 0} Active Rigs {isMobile ? 'earning yield' : 'earning automated yield'}
            </Text>
          </View>
        </View>

        {/* Search & Filter Toolbar */}
        <View style={styles.toolbarCard}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder={isMobile ? 'Search user, email, name...' : 'Search user by username, email, full name, or referral code...'}
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    loadUsers(1, '', roleFilter, statusFilter);
                  }}
                >
                  <Text style={styles.searchClearText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterTabsRow}>
            {/* Role Filter Tabs */}
            <View style={styles.filterPillsGroup}>
              <Text style={styles.filterGroupLabel}>Role:</Text>
              <TouchableOpacity
                style={[styles.filterPill, roleFilter === 'all' && styles.filterPillActive]}
                onPress={() => handleRoleFilterChange('all')}
              >
                <Text style={[styles.filterPillText, roleFilter === 'all' && styles.filterPillTextActive]}>
                  All ({stats?.users?.total ?? 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, roleFilter === 'admin' && styles.filterPillActiveCyan]}
                onPress={() => handleRoleFilterChange('admin')}
              >
                <Text style={[styles.filterPillText, roleFilter === 'admin' && styles.filterPillTextActiveCyan]}>
                  👑 Admins ({stats?.users?.admins ?? 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, roleFilter === 'user' && styles.filterPillActive]}
                onPress={() => handleRoleFilterChange('user')}
              >
                <Text style={[styles.filterPillText, roleFilter === 'user' && styles.filterPillTextActive]}>
                  👤 Members ({Math.max(0, (stats?.users?.total ?? 0) - (stats?.users?.admins ?? 0))})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status Filter Tabs */}
            <View style={styles.filterPillsGroup}>
              <Text style={styles.filterGroupLabel}>Status:</Text>
              <TouchableOpacity
                style={[styles.filterPill, statusFilter === 'all' && styles.filterPillActive]}
                onPress={() => handleStatusFilterChange('all')}
              >
                <Text style={[styles.filterPillText, statusFilter === 'all' && styles.filterPillTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, statusFilter === 'ACTIVE' && styles.filterPillActiveGreen]}
                onPress={() => handleStatusFilterChange('ACTIVE')}
              >
                <Text style={[styles.filterPillText, statusFilter === 'ACTIVE' && styles.filterPillTextActiveGreen]}>
                  🟢 Active ({stats?.users?.active ?? 0})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, statusFilter === 'SUSPENDED' && styles.filterPillActiveRed]}
                onPress={() => handleStatusFilterChange('SUSPENDED')}
              >
                <Text style={[styles.filterPillText, statusFilter === 'SUSPENDED' && styles.filterPillTextActiveRed]}>
                  ⛔ Suspended ({stats?.users?.suspended ?? 0})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Users Table / Directory */}
        <View style={styles.tableCard}>
          <View style={styles.tableCardHeader}>
            <Text style={styles.tableCardTitle}>
              Registered Node Users ({totalCount.toLocaleString()})
            </Text>
            {loading && <ActivityIndicator size="small" color="#00F0FF" />}
          </View>

          {users.length === 0 && !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No matching users found</Text>
              <Text style={styles.emptySub}>Try adjusting your search query or role/status filters.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.tableWrapper}>
                {/* Table Header Row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.th, { width: 60 }]}>ID</Text>
                  <Text style={[styles.th, { width: 180 }]}>USER / EMAIL</Text>
                  <Text style={[styles.th, { width: 90 }]}>ROLE</Text>
                  <Text style={[styles.th, { width: 95 }]}>STATUS</Text>
                  <Text style={[styles.th, { width: 100 }]}>STAR RANK</Text>
                  <Text style={[styles.th, { width: 120 }]}>USDT BALANCE</Text>
                  <Text style={[styles.th, { width: 140 }]}>BITCOIN (ROI)</Text>
                  <Text style={[styles.th, { width: 110 }]}>INVESTED</Text>
                  <Text style={[styles.th, { width: 85 }]}>RIGS</Text>
                  <Text style={[styles.th, { width: 120 }]}>SPONSOR</Text>
                  <Text style={[styles.th, { width: 280 }]}>ACTIONS</Text>
                </View>

                {/* Table Body Rows */}
                {users.map((u) => {
                  const isAdmin = u.role === 'admin';
                  const isSuspended = u.status === 'SUSPENDED';

                  return (
                    <View key={u.id} style={styles.tableRow}>
                      <Text style={[styles.td, { width: 60, color: '#64748B', fontWeight: '700' }]}>#{u.id}</Text>
                      <View style={{ width: 180, gap: 2 }}>
                        <Text style={[styles.td, { color: '#FFFFFF', fontWeight: '800' }]} numberOfLines={1}>
                          @{u.username}
                        </Text>
                        <Text style={{ color: '#8A99AD', fontSize: 10 }} numberOfLines={1}>
                          {u.email}
                        </Text>
                        <Text style={{ color: '#64748B', fontSize: 9 }}>Ref: {u.referralCode}</Text>
                      </View>

                      {/* Role */}
                      <View style={{ width: 90 }}>
                        <View style={isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeUser}>
                          <Text style={isAdmin ? styles.roleBadgeAdminText : styles.roleBadgeUserText}>
                            {isAdmin ? '👑 ADMIN' : 'MEMBER'}
                          </Text>
                        </View>
                      </View>

                      {/* Status */}
                      <View style={{ width: 95 }}>
                        <View style={isSuspended ? styles.statusBadgeSuspended : styles.statusBadgeActive}>
                          <Text style={isSuspended ? styles.statusBadgeSuspendedText : styles.statusBadgeActiveText}>
                            {isSuspended ? '⛔ SUSPENDED' : '🟢 ACTIVE'}
                          </Text>
                        </View>
                      </View>

                      {/* Star Rank */}
                      <View style={{ width: 100 }}>
                        {u.starRank && u.starRank > 0 ? (
                          <View style={styles.starRankBadge}>
                            <Text style={styles.starRankBadgeText}>
                              {u.starRank >= 10
                                ? '👑 3 CROWN'
                                : u.starRank === 9
                                ? '👑 2 CROWN'
                                : u.starRank === 8
                                ? '👑 CROWN'
                                : `${u.starRank}★ STAR`}
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#64748B', fontSize: 11 }}>Standard</Text>
                        )}
                      </View>

                      {/* USDT Balance */}
                      <Text style={[styles.td, { width: 120, color: '#00E676', fontWeight: '700' }]}>
                        ${(u.wallet?.usdBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </Text>

                      {/* BTC Balance */}
                      <Text style={[styles.td, { width: 140, color: '#F7931A', fontWeight: '700' }]}>
                        ₿ {(u.wallet?.btcBalance || 0).toFixed(8)}
                      </Text>

                      {/* Invested */}
                      <Text style={[styles.td, { width: 110, color: '#FFFFFF', fontWeight: '600' }]}>
                        ${(u.wallet?.totalInvested || 0).toLocaleString()}
                      </Text>

                      {/* Active Rigs */}
                      <Text style={[styles.td, { width: 85, color: '#00F0FF', fontWeight: '700' }]}>
                        {u.activeContractsCount || 0} active
                      </Text>

                      {/* Sponsor */}
                      <Text style={[styles.td, { width: 120, color: '#8A99AD' }]} numberOfLines={1}>
                        {u.sponsorUsername ? `@${u.sponsorUsername}` : 'Direct Root'}
                      </Text>

                      {/* Actions Cluster */}
                      <View style={{ width: 280, flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity style={styles.actionBtnInspect} onPress={() => handleOpenUserDetail(u)}>
                          <Text style={styles.actionBtnInspectText}>👁️ Inspect</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtnWallet} onPress={() => handleOpenWalletModal(u)}>
                          <Text style={styles.actionBtnWalletText}>💰 Wallet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtnPwd} onPress={() => handleOpenResetPwdModal(u)}>
                          <Text style={styles.actionBtnPwdText}>🔑 Pwd</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={isSuspended ? styles.actionBtnActivate : styles.actionBtnSuspend}
                          onPress={() => handleToggleStatus(u)}
                        >
                          <Text style={isSuspended ? styles.actionBtnActivateText : styles.actionBtnSuspendText}>
                            {isSuspended ? 'Unban' : 'Suspend'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Pagination Controls */}
          <View style={styles.paginationRow}>
            <Text style={styles.paginationText}>
              Showing page <Text style={{ color: '#00F0FF', fontWeight: '800' }}>{page}</Text> of{' '}
              {Math.max(1, Math.ceil(totalCount / limit))} ({totalCount} total members)
            </Text>

            <View style={styles.paginationBtnGroup}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                disabled={page <= 1 || loading}
                onPress={() => loadUsers(page - 1, searchQuery, roleFilter, statusFilter)}
              >
                <Text style={[styles.pageBtnText, page <= 1 && styles.pageBtnTextDisabled]}>← Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pageBtn, page >= Math.ceil(totalCount / limit) && styles.pageBtnDisabled]}
                disabled={page >= Math.ceil(totalCount / limit) || loading}
                onPress={() => loadUsers(page + 1, searchQuery, roleFilter, statusFilter)}
              >
                <Text style={[styles.pageBtnText, page >= Math.ceil(totalCount / limit) && styles.pageBtnTextDisabled]}>
                  Next →
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ========================================================= */}
      {/* MODAL 1: VIEW & EDIT USER PROFILE DETAILS */}
      {/* ========================================================= */}
      <Modal visible={viewModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBoxLarge, isMobile && styles.modalBoxMobile]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>User Profile & Placement Inspection</Text>
                <Text style={styles.modalSub}>
                  Deep audit of @{selectedUser?.username} (ID: #{selectedUser?.id})
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setViewModalVisible(false)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }}>
              {detailedUserLoading ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color="#00F0FF" />
                  <Text style={{ color: '#8A99AD', marginTop: 10 }}>Fetching complete audit ledger & tree data...</Text>
                </View>
              ) : (
                <View style={{ gap: 16 }}>
                  {/* Editable Core Fields */}
                  <View style={styles.editCard}>
                    <Text style={styles.editCardTitle}>Core Profile & Access Role</Text>
                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>Full Name</Text>
                        <TextInput
                          style={styles.formInput}
                          value={editFullName}
                          onChangeText={setEditFullName}
                          placeholder="Full Name"
                          placeholderTextColor="#64748B"
                        />
                      </View>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>Email Address</Text>
                        <TextInput
                          style={styles.formInput}
                          value={editEmail}
                          onChangeText={setEditEmail}
                          placeholder="Email"
                          placeholderTextColor="#64748B"
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>Role Privilege</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.roleSelectBtn, editRole === 'user' && styles.roleSelectBtnActive]}
                            onPress={() => setEditRole('user')}
                          >
                            <Text style={styles.roleSelectBtnText}>Member ('user')</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.roleSelectBtn, editRole === 'admin' && styles.roleSelectBtnActiveCyan]}
                            onPress={() => setEditRole('admin')}
                          >
                            <Text style={[styles.roleSelectBtnText, editRole === 'admin' && { color: '#00F0FF' }]}>
                              🛡️ Administrator ('admin')
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>Account Status</Text>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            style={[styles.roleSelectBtn, editStatus === 'ACTIVE' && styles.roleSelectBtnActiveGreen]}
                            onPress={() => setEditStatus('ACTIVE')}
                          >
                            <Text style={[styles.roleSelectBtnText, editStatus === 'ACTIVE' && { color: '#00E676' }]}>
                              🟢 ACTIVE
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.roleSelectBtn, editStatus === 'SUSPENDED' && styles.roleSelectBtnActiveRed]}
                            onPress={() => setEditStatus('SUSPENDED')}
                          >
                            <Text style={[styles.roleSelectBtnText, editStatus === 'SUSPENDED' && { color: '#EF4444' }]}>
                              ⛔ SUSPENDED
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={styles.formCol}>
                        <Text style={styles.fieldLabel}>Star Rank Override (0 = Standard, 1..7 = Stars, 8 = Crown, 9 = 2 Crown, 10 = 3 Crown)</Text>
                        <TextInput
                          style={styles.formInput}
                          value={editStarRank}
                          onChangeText={setEditStarRank}
                          keyboardType="numeric"
                          placeholder="Star Rank (0 - 10)"
                          placeholderTextColor="#64748B"
                        />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.saveChangesBtn}
                      disabled={isUpdatingUser}
                      onPress={handleSaveUserDetails}
                    >
                      <Text style={styles.saveChangesBtnText}>
                        {isUpdatingUser ? 'Saving Changes...' : '💾 Save Profile & Role Changes'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Network Placement & Leg Volumes */}
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>🌲 Binary Placement & Leg Sales Volumes</Text>
                    <View style={styles.treeInfoGrid}>
                      <View style={styles.treeInfoItem}>
                        <Text style={styles.treeInfoLabel}>SPONSOR</Text>
                        <Text style={styles.treeInfoValue}>
                          {detailedUser?.user?.sponsor ? `@${detailedUser.user.sponsor.username}` : 'None (Direct Root)'}
                        </Text>
                      </View>
                      <View style={styles.treeInfoItem}>
                        <Text style={styles.treeInfoLabel}>BINARY PARENT</Text>
                        <Text style={styles.treeInfoValue}>
                          {detailedUser?.user?.binaryParent ? `@${detailedUser.user.binaryParent.username} (${detailedUser.user.binaryPosition || 'A'})` : 'Root Node'}
                        </Text>
                      </View>
                      <View style={styles.treeInfoItem}>
                        <Text style={styles.treeInfoLabel}>LEG A (LEFT) VOLUME</Text>
                        <Text style={[styles.treeInfoValue, { color: '#38BDF8' }]}>
                          ${(detailedUser?.user?.binaryLegs?.legATotal || 0).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.treeInfoItem}>
                        <Text style={styles.treeInfoLabel}>LEG B (RIGHT) VOLUME</Text>
                        <Text style={[styles.treeInfoValue, { color: '#F59E0B' }]}>
                          ${(detailedUser?.user?.binaryLegs?.legBTotal || 0).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.treeInfoItem}>
                        <Text style={styles.treeInfoLabel}>BINARY PAIRS PAID</Text>
                        <Text style={[styles.treeInfoValue, { color: '#00E676' }]}>
                          {detailedUser?.user?.binaryLegs?.pairsCount || 0} pairs
                        </Text>
                      </View>
                      <View style={styles.treeInfoItem}>
                        <Text style={styles.treeInfoLabel}>CONFISCATED VOLUME</Text>
                        <Text style={[styles.treeInfoValue, { color: '#EF4444' }]}>
                          ${detailedUser?.user?.totalBinaryConfiscated || 0}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Active Mining Contracts */}
                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>
                      ⚡ Active Mining Contracts ({detailedUser?.contracts?.length || 0})
                    </Text>
                    {detailedUser?.contracts?.length === 0 ? (
                      <Text style={{ color: '#8A99AD', fontSize: 12 }}>No mining contracts active for this user.</Text>
                    ) : (
                      detailedUser?.contracts?.map((c: any) => (
                        <View key={c.id} style={styles.contractMiniRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                              {c.package_name} ({c.tier} USDT Tier)
                            </Text>
                            <Text style={{ color: '#8A99AD', fontSize: 10 }}>
                              Status: <Text style={{ color: '#00E676' }}>{c.status}</Text> • Day {c.days_completed}/{c.max_days || 1500}
                            </Text>
                          </View>
                          <Text style={{ color: '#F7931A', fontWeight: '800', fontSize: 12 }}>
                            ₿ {parseFloat(c.daily_btc_yield || 0).toFixed(6)} / day
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 2: ADJUST USER WALLET (CREDIT / DEBIT) */}
      {/* ========================================================= */}
      <Modal visible={walletModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isMobile && styles.modalBoxMobile]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Adjust User Balance</Text>
                <Text style={styles.modalSub}>
                  Crediting / Debiting wallet for @{selectedUser?.username}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setWalletModalVisible(false)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14 }}>
              {/* Current Balances Box */}
              <View style={styles.currentBalancePillRow}>
                <View style={styles.currentBalancePill}>
                  <Text style={styles.currentBalancePillLabel}>CURRENT USDT:</Text>
                  <Text style={styles.currentBalancePillVal}>
                    ${(selectedUser?.wallet?.usdBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.currentBalancePill}>
                  <Text style={styles.currentBalancePillLabel}>CURRENT BTC:</Text>
                  <Text style={[styles.currentBalancePillVal, { color: '#F7931A' }]}>
                    ₿ {(selectedUser?.wallet?.btcBalance || 0).toFixed(8)}
                  </Text>
                </View>
              </View>

              {/* Currency Selector */}
              <View>
                <Text style={styles.fieldLabel}>Currency</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, walletCurrency === 'USDT' && styles.toggleBtnActiveGreen]}
                    onPress={() => setWalletCurrency('USDT')}
                  >
                    <Text style={[styles.toggleBtnText, walletCurrency === 'USDT' && { color: '#00E676' }]}>
                      💵 USDT (Mining Balance)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, walletCurrency === 'BTC' && styles.toggleBtnActiveOrange]}
                    onPress={() => setWalletCurrency('BTC')}
                  >
                    <Text style={[styles.toggleBtnText, walletCurrency === 'BTC' && { color: '#F7931A' }]}>
                      ₿ Bitcoin (BTC)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Type: Credit or Debit */}
              <View>
                <Text style={styles.fieldLabel}>Adjustment Operation</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, walletAdjustType === 'CREDIT' && styles.toggleBtnActiveGreen]}
                    onPress={() => setWalletAdjustType('CREDIT')}
                  >
                    <Text style={[styles.toggleBtnText, walletAdjustType === 'CREDIT' && { color: '#00E676' }]}>
                      ➕ CREDIT (Deposit to User)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, walletAdjustType === 'DEBIT' && styles.toggleBtnActiveRed]}
                    onPress={() => setWalletAdjustType('DEBIT')}
                  >
                    <Text style={[styles.toggleBtnText, walletAdjustType === 'DEBIT' && { color: '#EF4444' }]}>
                      ➖ DEBIT (Deduct from User)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount */}
              <View>
                <Text style={styles.fieldLabel}>Amount to {walletAdjustType}</Text>
                <TextInput
                  style={styles.formInput}
                  value={walletAmount}
                  onChangeText={setWalletAmount}
                  keyboardType="numeric"
                  placeholder={walletCurrency === 'USDT' ? 'e.g. 500.00' : 'e.g. 0.00500000'}
                  placeholderTextColor="#64748B"
                />
              </View>

              {/* Reason / Memo */}
              <View>
                <Text style={styles.fieldLabel}>Audit Memo / Reason</Text>
                <TextInput
                  style={styles.formInput}
                  value={walletReason}
                  onChangeText={setWalletReason}
                  placeholder="e.g. Compensation bonus, OTC deposit, manual correction"
                  placeholderTextColor="#64748B"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmActionBtn,
                  walletAdjustType === 'DEBIT' ? { backgroundColor: '#EF4444' } : { backgroundColor: '#00E676' },
                ]}
                disabled={isAdjustingWallet}
                onPress={handleConfirmWalletAdjust}
              >
                <Text style={styles.confirmActionBtnText}>
                  {isAdjustingWallet
                    ? 'Processing...'
                    : `Confirm ${walletAdjustType} of ${walletAmount || '0'} ${walletCurrency}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 3: RESET USER PASSWORD */}
      {/* ========================================================= */}
      <Modal visible={resetPwdModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isMobile && styles.modalBoxMobile]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reset User Password</Text>
                <Text style={styles.modalSub}>
                  Assign a new password for @{selectedUser?.username}
                </Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setResetPwdModalVisible(false)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14 }}>
              <View>
                <Text style={styles.fieldLabel}>New Password (min 6 characters)</Text>
                <TextInput
                  style={styles.formInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new secure password"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={styles.saveChangesBtn}
                disabled={isResettingPwd}
                onPress={handleConfirmResetPwd}
              >
                <Text style={styles.saveChangesBtnText}>
                  {isResettingPwd ? 'Resetting Password...' : '🔑 Update Password'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* MODAL 4: CREATE NEW USER OR ADMIN */}
      {/* ========================================================= */}
      <Modal visible={createModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isMobile && styles.modalBoxMobile]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Provision New Member / Admin</Text>
                <Text style={styles.modalSub}>Directly create a new user node in the system</Text>
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={styles.fieldLabel}>Username *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newUsername}
                    onChangeText={setNewUsername}
                    placeholder="e.g. node_miner10"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Email Address *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    placeholder="e.g. miner10@btcm.io"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Password *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newPwd}
                    onChangeText={setNewPwd}
                    placeholder="Set temporary or permanent password"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="e.g. Satoshi Nakamoto"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Role Privilege</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                      style={[styles.toggleBtn, newRole === 'user' && styles.toggleBtnActiveGreen]}
                      onPress={() => setNewRole('user')}
                    >
                      <Text style={[styles.toggleBtnText, newRole === 'user' && { color: '#00E676' }]}>
                        👤 Regular Member
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleBtn, newRole === 'admin' && styles.toggleBtnActiveCyan]}
                      onPress={() => setNewRole('admin')}
                    >
                      <Text style={[styles.toggleBtnText, newRole === 'admin' && { color: '#00F0FF' }]}>
                        🛡️ Administrator
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Initial USDT Balance</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newInitialUsdt}
                    onChangeText={setNewInitialUsdt}
                    keyboardType="numeric"
                    placeholder="e.g. 1000"
                    placeholderTextColor="#64748B"
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Sponsor Username (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newSponsor}
                    onChangeText={setNewSponsor}
                    placeholder="e.g. andy, admin, etc."
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>

                <TouchableOpacity
                  style={styles.confirmActionBtn}
                  disabled={isCreatingUser}
                  onPress={handleCreateUser}
                >
                  <Text style={styles.confirmActionBtnText}>
                    {isCreatingUser ? 'Creating Account...' : '✨ Create User Account'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D14',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 60,
    gap: 16,
  },

  // Access Denied / Verifying
  accessDeniedContainer: {
    flex: 1,
    backgroundColor: '#090D14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    maxWidth: 480,
    width: '100%',
    backgroundColor: '#111726',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  accessDeniedIcon: {
    fontSize: 48,
  },
  accessDeniedTitle: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  accessDeniedSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  currentUserInfoBox: {
    backgroundColor: '#0A0F1A',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    width: '100%',
  },
  currentUserInfoText: {
    color: '#8A99AD',
    fontSize: 12,
    textAlign: 'center',
  },
  accessDeniedBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    width: '100%',
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#00F0FF',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 12,
  },

  // Header Bar
  headerBar: {
    backgroundColor: '#0F1626',
    borderBottomWidth: 1,
    borderBottomColor: '#1A2333',
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
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
  mobileHeaderRow3: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  headerSubMobile: {
    color: '#8A99AD',
    fontSize: 11,
  },
  createUserBtnMobile: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  createUserBtnTextMobile: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  adminShieldBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminShieldText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  refreshBtn: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  createUserBtn: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  createUserBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  backHomeBtn: {
    backgroundColor: '#1B2433',
    borderColor: '#2D3A4F',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  backHomeBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
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

  // Banner Notice
  bannerNoticeBox: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  bannerNoticeSuccess: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderBottomColor: 'rgba(0, 230, 118, 0.4)',
  },
  bannerNoticeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomColor: 'rgba(239, 68, 68, 0.4)',
  },
  bannerNoticeInfo: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderBottomColor: 'rgba(0, 240, 255, 0.4)',
  },
  bannerNoticeText: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Stat Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statsGridMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#101626',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  statCardMobile: {
    width: '48.5%',
    minWidth: 140,
    flex: undefined,
    padding: 10,
    borderRadius: 8,
  },
  statCardLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statCardValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  statCardValueMobile: {
    fontSize: 14,
  },
  statCardSub: {
    color: '#8A99AD',
    fontSize: 10,
    marginTop: 2,
  },
  statCardSubMobile: {
    fontSize: 9.5,
    lineHeight: 12,
  },

  // Search & Filter Toolbar
  toolbarCard: {
    backgroundColor: '#101626',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090D14',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
    fontSize: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    paddingVertical: 8,
  },
  searchClearText: {
    color: '#64748B',
    padding: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  searchBtn: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 6,
  },
  searchBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  filterTabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterGroupLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
    marginRight: 2,
  },
  filterPill: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  filterPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#CBD5E1',
  },
  filterPillActiveCyan: {
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    borderColor: '#00F0FF',
  },
  filterPillActiveGreen: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    borderColor: '#00E676',
  },
  filterPillActiveRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  filterPillText: {
    color: '#8A99AD',
    fontSize: 11,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  filterPillTextActiveCyan: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  filterPillTextActiveGreen: {
    color: '#00E676',
    fontWeight: '800',
  },
  filterPillTextActiveRed: {
    color: '#EF4444',
    fontWeight: '800',
  },

  // Table
  tableCard: {
    backgroundColor: '#101626',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  tableCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    color: '#8A99AD',
    fontSize: 12,
  },
  tableWrapper: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E273A',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#161F2E',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  th: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C111C',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#1A2333',
  },
  td: {
    fontSize: 11,
  },

  // Badges
  roleBadgeAdmin: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  roleBadgeAdminText: {
    color: '#00F0FF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  roleBadgeUser: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: '#475569',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  roleBadgeUserText: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '700',
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: '#00E676',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusBadgeActiveText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadgeSuspended: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  statusBadgeSuspendedText: {
    color: '#EF4444',
    fontSize: 9,
    fontWeight: '800',
  },
  starRankBadge: {
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderColor: '#F7931A',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  starRankBadgeText: {
    color: '#F7931A',
    fontSize: 9.5,
    fontWeight: '800',
  },

  // Table Row Action Buttons
  actionBtnInspect: {
    backgroundColor: '#1E293B',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnInspectText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '700',
  },
  actionBtnWallet: {
    backgroundColor: '#1E293B',
    borderColor: '#00E676',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnWalletText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  actionBtnPwd: {
    backgroundColor: '#1E293B',
    borderColor: '#F7931A',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnPwdText: {
    color: '#F7931A',
    fontSize: 10,
    fontWeight: '700',
  },
  actionBtnSuspend: {
    backgroundColor: '#1E293B',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnSuspendText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  actionBtnActivate: {
    backgroundColor: '#1E293B',
    borderColor: '#00E676',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionBtnActivateText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },

  // Pagination
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
  },
  paginationText: {
    color: '#8A99AD',
    fontSize: 11,
  },
  paginationBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  pageBtn: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pageBtnTextDisabled: {
    color: '#64748B',
  },

  // Modals General
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#101626',
    borderWidth: 1,
    borderColor: '#243048',
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  modalBoxLarge: {
    width: '100%',
    maxWidth: 700,
    backgroundColor: '#101626',
    borderWidth: 1,
    borderColor: '#243048',
    borderRadius: 14,
    padding: 20,
    gap: 14,
  },
  modalBoxMobile: {
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#1A2333',
    paddingBottom: 10,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseBtnText: {
    color: '#8A99AD',
    fontSize: 16,
    fontWeight: '700',
  },

  // Edit Card
  editCard: {
    backgroundColor: '#090D14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  editCardTitle: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '800',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  formCol: {
    flex: 1,
    minWidth: 200,
    gap: 4,
  },
  fieldLabel: {
    color: '#8A99AD',
    fontSize: 10.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  formInput: {
    backgroundColor: '#101626',
    borderColor: '#243048',
    borderWidth: 1,
    borderRadius: 6,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
  },
  roleSelectBtn: {
    flex: 1,
    backgroundColor: '#101626',
    borderColor: '#243048',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  roleSelectBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: '#FFFFFF',
  },
  roleSelectBtnActiveCyan: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  roleSelectBtnActiveGreen: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: '#00E676',
  },
  roleSelectBtnActiveRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  roleSelectBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  saveChangesBtn: {
    backgroundColor: '#00F0FF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  saveChangesBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },

  // Detail Section Card
  detailSectionCard: {
    backgroundColor: '#090D14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  detailSectionTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  treeInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  treeInfoItem: {
    width: '31%',
    minWidth: 140,
    backgroundColor: '#101626',
    borderWidth: 1,
    borderColor: '#1E273A',
    borderRadius: 6,
    padding: 8,
    gap: 2,
  },
  treeInfoLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
  },
  treeInfoValue: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '700',
  },
  contractMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#101626',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E273A',
  },

  // Wallet Modal
  currentBalancePillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  currentBalancePill: {
    flex: 1,
    backgroundColor: '#090D14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 6,
    padding: 10,
    gap: 2,
  },
  currentBalancePillLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
  },
  currentBalancePillVal: {
    color: '#00E676',
    fontSize: 14,
    fontWeight: '800',
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#090D14',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  toggleBtnActiveGreen: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: '#00E676',
  },
  toggleBtnActiveOrange: {
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderColor: '#F7931A',
  },
  toggleBtnActiveCyan: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  toggleBtnActiveRed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  toggleBtnText: {
    color: '#8A99AD',
    fontSize: 11,
    fontWeight: '700',
  },
  confirmActionBtn: {
    backgroundColor: '#00F0FF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  confirmActionBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },
});
