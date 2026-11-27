import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '../services/api';
import { useThemeMode } from '@/context/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';

const STAR_LABELS: Record<number, string> = {
  0: 'Standard (Unranked)',
  1: '1★ Star User',
  2: '2★ Star User',
  3: '3★ Star User',
  4: '4★ Star User',
  5: '5★ Star User',
  6: '6★ Star User',
  7: '7★ Star User',
  8: '👑 Crown User',
  9: '👑 2 Crown User',
  10: '👑 3 Crown User',
};

export default function AdminUserDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isDark, colors, toggleTheme } = useThemeMode();
  const isMobile = useIsMobile();

  // Auth state
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // User detail data
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [contractsPage, setContractsPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const LIST_PAGE_SIZE = 10;
  const [directReferralsCount, setDirectReferralsCount] = useState(0);

  // Notification banner
  const [bannerNotice, setBannerNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showNotice = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setBannerNotice({ text, type });
    setTimeout(() => setBannerNotice(null), 5000);
  };

  // Profile & Role edit state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [starRank, setStarRank] = useState('0');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Wallet adjustment state
  const [walletCurrency, setWalletCurrency] = useState<'USDT' | 'BTC'>('USDT');
  const [walletType, setWalletType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletReason, setWalletReason] = useState('');
  const [isAdjustingWallet, setIsAdjustingWallet] = useState(false);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [isResettingPwd, setIsResettingPwd] = useState(false);

  // KYC review state
  const [kycRejectionReason, setKycRejectionReason] = useState('');
  const [isReviewingKyc, setIsReviewingKyc] = useState(false);

  const loadUserDetail = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const res = await api.getAdminUser(userId);
      if (res?.success && res.user) {
        const u = res.user;
        setUser(u);
        setContracts(res.contracts || []);
        setTransactions(res.transactions || []);
        setContractsPage(1);
        setTxPage(1);
        setDirectReferralsCount(res.directReferralsCount ?? u.directReferralsCount ?? 0);

        setFullName(u.fullName || '');
        setEmail(u.email || '');
        setPhone(u.phone || '');
        setCountry(u.country || '');
        setAddress(u.address || '');
        setRole(u.role === 'admin' ? 'admin' : 'user');
        setStatus(u.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE');
        setStarRank(String(u.starRank ?? 0));
      } else {
        showNotice('User record not found', 'error');
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to load user details', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const verifyAndLoad = async () => {
      setIsVerifying(true);
      try {
        if (!api.getToken()) {
          setIsAuthorized(false);
          setIsVerifying(false);
          return;
        }
        const meRes = await api.getMe();
        if (meRes?.user && meRes.user.role === 'admin') {
          setIsAuthorized(true);
          if (id) {
            await loadUserDetail(String(id));
          } else {
            setLoading(false);
          }
        } else {
          setIsAuthorized(false);
        }
      } catch {
        setIsAuthorized(false);
      } finally {
        setIsVerifying(false);
      }
    };
    verifyAndLoad();
  }, [id, loadUserDetail]);

  const handleSaveProfile = async () => {
    if (!id) return;
    setIsSavingProfile(true);
    try {
      const parsedRank = Math.max(0, Math.min(10, parseInt(starRank, 10) || 0));
      const res = await api.updateAdminUser(String(id), {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country: country.trim(),
        address: address.trim(),
        role,
        status,
        starRank: parsedRank,
      } as any);
      if (res?.success) {
        showNotice(`Updated @${user?.username} profile & permissions successfully!`, 'success');
        await loadUserDetail(String(id));
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to update user', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleQuickStatus = async () => {
    if (!id || !user) return;
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await api.updateAdminUser(String(id), { status: nextStatus });
      if (res?.success) {
        showNotice(`@${user.username} is now ${nextStatus}`, 'success');
        await loadUserDetail(String(id));
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleAdjustWallet = async () => {
    if (!id) return;
    const numAmt = parseFloat(walletAmount);
    if (!numAmt || numAmt <= 0) {
      showNotice('Please enter a valid positive amount', 'error');
      return;
    }
    setIsAdjustingWallet(true);
    try {
      const res = await api.adjustUserWallet(String(id), {
        currency: walletCurrency,
        type: walletType,
        amount: numAmt,
        reason: walletReason.trim() || undefined,
      });
      if (res?.success) {
        showNotice(res.message || 'Wallet adjusted successfully!', 'success');
        setWalletAmount('');
        setWalletReason('');
        await loadUserDetail(String(id));
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to adjust wallet', 'error');
    } finally {
      setIsAdjustingWallet(false);
    }
  };

  const handleResetPassword = async () => {
    if (!id) return;
    if (!newPassword || newPassword.length < 6) {
      showNotice('Password must be at least 6 characters', 'error');
      return;
    }
    setIsResettingPwd(true);
    try {
      const res = await api.resetUserPassword(String(id), newPassword);
      if (res?.success) {
        showNotice(res.message || `Password reset for @${user?.username}`, 'success');
        setNewPassword('');
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsResettingPwd(false);
    }
  };

  const handleKycDecision = async (decision: 'VERIFIED' | 'REJECTED') => {
    if (!id) return;
    setIsReviewingKyc(true);
    try {
      const res = await api.adminReviewKyc(
        String(id),
        decision,
        decision === 'REJECTED' ? kycRejectionReason.trim() || 'Rejected by administrator' : undefined
      );
      if (res?.success) {
        showNotice(res.message || `KYC marked as ${decision}`, 'success');
        setKycRejectionReason('');
        await loadUserDetail(String(id));
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to update KYC status', 'error');
    } finally {
      setIsReviewingKyc(false);
    }
  };

  const bg = colors.background;
  const cardBg = isDark ? '#111622' : '#FFFFFF';
  const subCardBg = isDark ? '#0B0E14' : '#F8FAFC';
  const borderCol = isDark ? '#1E2738' : '#E2E8F0';
  const textPrimary = isDark ? '#FFFFFF' : '#0F172A';
  const textSecondary = isDark ? '#8A99AD' : '#475569';
  const textMuted = isDark ? '#64748B' : '#64748B';
  const inputBg = isDark ? '#0B0E14' : '#F8FAFC';

  if (isVerifying) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color="#00F0FF" />
        <Text style={{ color: textSecondary, marginTop: 12 }}>Verifying Administrator Privileges...</Text>
      </View>
    );
  }

  if (!isAuthorized) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 42 }}>🛡️</Text>
        <Text style={{ color: textPrimary, fontSize: 20, fontWeight: '800', marginTop: 10 }}>
          Admin Authorization Required
        </Text>
        <Text style={{ color: textSecondary, marginTop: 6, marginBottom: 20 }}>
          You need administrator privileges to inspect and modify node users.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/admin')}>
          <Text style={styles.primaryBtnText}>Return to Admin Console</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!id || (!loading && !user)) {
    return (
      <View style={[styles.centerScreen, { backgroundColor: bg }]}>
        <Text style={{ fontSize: 40 }}>🔍</Text>
        <Text style={{ color: textPrimary, fontSize: 18, fontWeight: '800', marginTop: 10 }}>
          User Not Found
        </Text>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => router.push('/admin')}>
          <Text style={styles.primaryBtnText}>← Back to Registered Node Users</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSuspended = user?.status === 'SUSPENDED';
  const kycStatus = user?.kyc?.status || 'UNVERIFIED';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header Bar */}
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: subCardBg, borderColor: borderCol }]}
            onPress={() => router.push('/admin')}
          >
            <Text style={[styles.backBtnText, { color: textPrimary }]}>← Back to Users</Text>
          </TouchableOpacity>

          <View>
            <Text style={[styles.headerTitle, { color: textPrimary }]}>
              {user ? `${user.fullName || user.username} (@${user.username})` : 'Loading User...'}
            </Text>
            <Text style={{ color: textSecondary, fontSize: 12 }}>
              Full-Stack User Inspection, Edit & Wallet Control • ID: #{user?.id || id}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: subCardBg, borderColor: borderCol }]}
            onPress={toggleTheme}
          >
            <Text style={{ color: textPrimary, fontSize: 12, fontWeight: '700' }}>
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </Text>
          </TouchableOpacity>

          {user && (
            <TouchableOpacity
              style={[
                styles.quickStatusBtn,
                {
                  backgroundColor: isSuspended ? 'rgba(0,230,118,0.14)' : 'rgba(239,68,68,0.14)',
                  borderColor: isSuspended ? '#00E676' : '#EF4444',
                },
              ]}
              onPress={handleToggleQuickStatus}
            >
              <Text style={{ color: isSuspended ? '#00E676' : '#EF4444', fontWeight: '800', fontSize: 12 }}>
                {isSuspended ? '✓ Activate User' : '⛔ Suspend User'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {bannerNotice && (
        <View
          style={[
            styles.banner,
            bannerNotice.type === 'success'
              ? { backgroundColor: 'rgba(0,230,118,0.15)', borderColor: '#00E676' }
              : bannerNotice.type === 'error'
              ? { backgroundColor: 'rgba(239,68,68,0.15)', borderColor: '#EF4444' }
              : { backgroundColor: 'rgba(0,240,255,0.15)', borderColor: '#00F0FF' },
          ]}
        >
          <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 13 }}>{bannerNotice.text}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerScreen}>
          <ActivityIndicator size="large" color="#00F0FF" />
          <Text style={{ color: textSecondary, marginTop: 12 }}>Loading full user audit & ledger...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 1. Summary KPI Row */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.kpiLabel, { color: textMuted }]}>USDT BALANCE</Text>
              <Text style={[styles.kpiValue, { color: '#00E676' }]}>
                ${(user.wallet?.usdBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <Text style={{ color: textSecondary, fontSize: 11 }}>
                Direct: ${(user.wallet?.totalDirectEarned || user.wallet?.directReferralBonus || 0).toLocaleString()} • Binary: ${(user.wallet?.totalBinaryEarned || user.wallet?.binaryPairingBonus || 0).toLocaleString()}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.kpiLabel, { color: textMuted }]}>BITCOIN (BTC) BALANCE</Text>
              <Text style={[styles.kpiValue, { color: '#F7931A' }]}>
                ₿ {(user.wallet?.btcBalance || 0).toFixed(8)}
              </Text>
              <Text style={{ color: textSecondary, fontSize: 11 }}>
                Total Mined: ₿ {(user.wallet?.totalMiningBtcEarned || 0).toFixed(8)}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.kpiLabel, { color: textMuted }]}>MINING & REFERRALS</Text>
              <Text style={[styles.kpiValue, { color: '#00F0FF' }]}>
                ${(user.wallet?.totalInvested || 0).toLocaleString()}
              </Text>
              <Text style={{ color: textSecondary, fontSize: 11 }}>
                Contracts: {contracts.length} • Direct Referrals: {directReferralsCount}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.kpiLabel, { color: textMuted }]}>BINARY TREE & SPONSOR</Text>
              {user.sponsorUsername || user.sponsor?.username ? (
                <View style={{ gap: 2 }}>
                  <Text style={[styles.kpiValue, { color: textPrimary, fontSize: 16 }]} numberOfLines={1}>
                    {user.sponsorFullName || user.sponsor?.fullName || user.sponsorUsername || user.sponsor?.username}
                  </Text>
                  <Text style={{ color: '#00F0FF', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
                    @{user.sponsorUsername || user.sponsor?.username}
                    {user.sponsor?.referralCode ? ` • Ref: ${user.sponsor.referralCode}` : ''}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.kpiValue, { color: textPrimary, fontSize: 16 }]}>Direct Root</Text>
              )}
              {(user.parentUsername || user.binaryParent?.username) && (
                <Text style={{ color: textSecondary, fontSize: 11 }} numberOfLines={1}>
                  Parent: {user.binaryParent?.fullName ? `${user.binaryParent.fullName} ` : ''}@{user.parentUsername || user.binaryParent?.username} ({user.binaryPosition || 'A'})
                </Text>
              )}
              <Text style={{ color: textSecondary, fontSize: 11 }}>
                Leg A: ${(user.binaryLegs?.legACurrent || 0).toLocaleString()} | Leg B: ${(user.binaryLegs?.legBCurrent || 0).toLocaleString()} | Pairs: {user.binaryLegs?.pairsCount || 0}
              </Text>
            </View>
          </View>

          {/* 2. Core Profile, Role, Status & Star Rank Editor */}
          <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              👤 Core Profile, Role, Status & Star Rank
            </Text>

            <View style={[styles.formGrid, isMobile && { flexDirection: 'column' }]}>
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  placeholderTextColor={textMuted}
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Email Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email Address"
                  placeholderTextColor={textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Phone</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone Number"
                  placeholderTextColor={textMuted}
                />
              </View>
            </View>

            <View style={[styles.formGrid, isMobile && { flexDirection: 'column' }]}>
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Country</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={country}
                  onChangeText={setCountry}
                  placeholder="Country"
                  placeholderTextColor={textMuted}
                />
              </View>

              <View style={[styles.formField, { flex: 2 }]}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Residential Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Address"
                  placeholderTextColor={textMuted}
                />
              </View>
            </View>

            <View style={[styles.formGrid, isMobile && { flexDirection: 'column' }]}>
              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Role Privilege</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[
                      styles.pillBtn,
                      { borderColor: borderCol, backgroundColor: subCardBg },
                      role === 'user' && { borderColor: '#00F0FF', backgroundColor: 'rgba(0,240,255,0.12)' },
                    ]}
                    onPress={() => setRole('user')}
                  >
                    <Text style={{ color: role === 'user' ? '#00F0FF' : textSecondary, fontWeight: '700', fontSize: 12 }}>
                      Member ('user')
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pillBtn,
                      { borderColor: borderCol, backgroundColor: subCardBg },
                      role === 'admin' && { borderColor: '#00F0FF', backgroundColor: 'rgba(0,240,255,0.12)' },
                    ]}
                    onPress={() => setRole('admin')}
                  >
                    <Text style={{ color: role === 'admin' ? '#00F0FF' : textSecondary, fontWeight: '700', fontSize: 12 }}>
                      🛡️ Admin ('admin')
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>Account Status</Text>
                <View style={styles.pillRow}>
                  <TouchableOpacity
                    style={[
                      styles.pillBtn,
                      { borderColor: borderCol, backgroundColor: subCardBg },
                      status === 'ACTIVE' && { borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.12)' },
                    ]}
                    onPress={() => setStatus('ACTIVE')}
                  >
                    <Text style={{ color: status === 'ACTIVE' ? '#00E676' : textSecondary, fontWeight: '700', fontSize: 12 }}>
                      🟢 ACTIVE
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pillBtn,
                      { borderColor: borderCol, backgroundColor: subCardBg },
                      status === 'SUSPENDED' && { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.12)' },
                    ]}
                    onPress={() => setStatus('SUSPENDED')}
                  >
                    <Text style={{ color: status === 'SUSPENDED' ? '#EF4444' : textSecondary, fontWeight: '700', fontSize: 12 }}>
                      ⛔ SUSPENDED
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(user.binaryPosition === 'A' || user.binaryPosition === 'B') && (
                <View style={styles.formField}>
                  <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                    Default Placement Leg (Read-Only)
                  </Text>
                  <View style={styles.pillRow}>
                    <View
                      style={[
                        styles.pillBtn,
                        {
                          borderColor: user.binaryPosition === 'A' ? '#00F0FF' : borderCol,
                          backgroundColor: user.binaryPosition === 'A' ? 'rgba(0,240,255,0.12)' : subCardBg,
                          opacity: user.binaryPosition === 'A' ? 0.85 : 0.45,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: user.binaryPosition === 'A' ? '#00F0FF' : textSecondary,
                          fontWeight: '700',
                          fontSize: 12,
                        }}
                      >
                        🔒 Leg A (Left)
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pillBtn,
                        {
                          borderColor: user.binaryPosition === 'B' ? '#00F0FF' : borderCol,
                          backgroundColor: user.binaryPosition === 'B' ? 'rgba(0,240,255,0.12)' : subCardBg,
                          opacity: user.binaryPosition === 'B' ? 0.85 : 0.45,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: user.binaryPosition === 'B' ? '#00F0FF' : textSecondary,
                          fontWeight: '700',
                          fontSize: 12,
                        }}
                      >
                        🔒 Leg B (Right)
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.formField}>
              <Text style={[styles.fieldLabel, { color: textSecondary }]}>
                Star Rank Override (0..10): {STAR_LABELS[parseInt(starRank, 10) || 0] || `Rank ${starRank}`}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary, maxWidth: 260 }]}
                value={starRank}
                onChangeText={setStarRank}
                keyboardType="numeric"
                placeholder="0 - 10"
                placeholderTextColor={textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, isSavingProfile && { opacity: 0.6 }]}
              disabled={isSavingProfile}
              onPress={handleSaveProfile}
            >
              <Text style={styles.primaryBtnText}>
                {isSavingProfile ? 'Saving Changes...' : '💾 Save Profile, Role & Rank Changes'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. Wallet Credit / Debit & Password Reset Row */}
          <View style={[styles.twoColRow, isMobile && { flexDirection: 'column' }]}>
            {/* Wallet Adjustment */}
            <View style={[styles.sectionCard, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>💰 Wallet Credit / Debit Adjustment</Text>

              <Text style={[styles.fieldLabel, { color: textSecondary }]}>Currency</Text>
              <View style={styles.pillRow}>
                {(['USDT', 'BTC'] as const).map((curr) => (
                  <TouchableOpacity
                    key={curr}
                    style={[
                      styles.pillBtn,
                      { borderColor: borderCol, backgroundColor: subCardBg },
                      walletCurrency === curr && { borderColor: '#00F0FF', backgroundColor: 'rgba(0,240,255,0.12)' },
                    ]}
                    onPress={() => setWalletCurrency(curr)}
                  >
                    <Text style={{ color: walletCurrency === curr ? '#00F0FF' : textSecondary, fontWeight: '700' }}>
                      {curr}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: textSecondary, marginTop: 10 }]}>Operation Type</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity
                  style={[
                    styles.pillBtn,
                    { borderColor: borderCol, backgroundColor: subCardBg },
                    walletType === 'CREDIT' && { borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.12)' },
                  ]}
                  onPress={() => setWalletType('CREDIT')}
                >
                  <Text style={{ color: walletType === 'CREDIT' ? '#00E676' : textSecondary, fontWeight: '700' }}>
                    + CREDIT (Add)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pillBtn,
                    { borderColor: borderCol, backgroundColor: subCardBg },
                    walletType === 'DEBIT' && { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.12)' },
                  ]}
                  onPress={() => setWalletType('DEBIT')}
                >
                  <Text style={{ color: walletType === 'DEBIT' ? '#EF4444' : textSecondary, fontWeight: '700' }}>
                    − DEBIT (Deduct)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: textSecondary, marginTop: 10 }]}>Amount ({walletCurrency})</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                value={walletAmount}
                onChangeText={setWalletAmount}
                keyboardType="decimal-pad"
                placeholder={walletCurrency === 'BTC' ? 'e.g. 0.01' : 'e.g. 500'}
                placeholderTextColor={textMuted}
              />

              <Text style={[styles.fieldLabel, { color: textSecondary, marginTop: 10 }]}>Reason / Audit Note</Text>
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                value={walletReason}
                onChangeText={setWalletReason}
                placeholder="e.g. Manual deposit bonus or correction"
                placeholderTextColor={textMuted}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 14 }, isAdjustingWallet && { opacity: 0.6 }]}
                disabled={isAdjustingWallet}
                onPress={handleAdjustWallet}
              >
                <Text style={styles.primaryBtnText}>
                  {isAdjustingWallet ? 'Processing...' : `⚡ Execute ${walletType} (${walletCurrency})`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Password Reset & KYC Review */}
            <View style={{ flex: 1, gap: 16 }}>
              <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <Text style={[styles.sectionTitle, { color: textPrimary }]}>🔑 Security & Password Reset</Text>
                <Text style={[styles.fieldLabel, { color: textSecondary }]}>New Password (Min 6 characters)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Enter new password"
                  placeholderTextColor={textMuted}
                />
                <TouchableOpacity
                  style={[styles.warnBtn, { marginTop: 12 }, isResettingPwd && { opacity: 0.6 }]}
                  disabled={isResettingPwd}
                  onPress={handleResetPassword}
                >
                  <Text style={styles.warnBtnText}>
                    {isResettingPwd ? 'Resetting...' : '🔑 Reset User Password'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.sectionTitle, { color: textPrimary, marginBottom: 0 }]}>🪪 KYC Verification</Text>
                  <View
                    style={[
                      styles.kycBadge,
                      kycStatus === 'VERIFIED'
                        ? { backgroundColor: 'rgba(0,230,118,0.15)' }
                        : kycStatus === 'REJECTED'
                        ? { backgroundColor: 'rgba(239,68,68,0.15)' }
                        : { backgroundColor: 'rgba(245,158,11,0.15)' },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '800',
                        color:
                          kycStatus === 'VERIFIED'
                            ? '#00E676'
                            : kycStatus === 'REJECTED'
                            ? '#EF4444'
                            : '#F59E0B',
                      }}
                    >
                      {kycStatus}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { color: textSecondary, marginTop: 12 }]}>
                  Rejection Reason (if rejecting)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={kycRejectionReason}
                  onChangeText={setKycRejectionReason}
                  placeholder="Optional reason for rejection"
                  placeholderTextColor={textMuted}
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <TouchableOpacity
                    style={[styles.approveBtn, { flex: 1 }, isReviewingKyc && { opacity: 0.6 }]}
                    disabled={isReviewingKyc}
                    onPress={() => handleKycDecision('VERIFIED')}
                  >
                    <Text style={styles.approveBtnText}>✓ Approve KYC</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rejectBtn, { flex: 1 }, isReviewingKyc && { opacity: 0.6 }]}
                    disabled={isReviewingKyc}
                    onPress={() => handleKycDecision('REJECTED')}
                  >
                    <Text style={styles.rejectBtnText}>✕ Reject KYC</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* 4. Mining Contracts & Recent Transactions */}
          <View style={[styles.twoColRow, isMobile && { flexDirection: 'column' }]}>
            <View style={[styles.sectionCard, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                ⛏️ Mining Contracts ({contracts.length})
              </Text>
              {contracts.length === 0 ? (
                <Text style={{ color: textMuted, fontSize: 13 }}>No mining contracts found for this user.</Text>
              ) : (
                <>
                  <View style={{ gap: 10 }}>
                    {contracts
                      .slice((contractsPage - 1) * LIST_PAGE_SIZE, contractsPage * LIST_PAGE_SIZE)
                      .map((c: any) => (
                        <View
                          key={c._id || c.id}
                          style={[styles.listItem, { backgroundColor: subCardBg, borderColor: borderCol }]}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: textPrimary, fontWeight: '800', fontSize: 13 }}>
                              ${(c.packagePriceUsd || 0).toLocaleString()} USDT ({c.hashrateThs} TH/s)
                            </Text>
                            <Text
                              style={{
                                color: c.status === 'ACTIVE' ? '#00E676' : '#F59E0B',
                                fontWeight: '800',
                                fontSize: 11,
                              }}
                            >
                              {c.status}
                            </Text>
                          </View>
                          <Text style={{ color: textSecondary, fontSize: 11, marginTop: 4 }}>
                            Mined: ₿ {(c.totalMinedBtc || 0).toFixed(8)} • Days: {c.daysCompleted || 0}/{c.durationDays || 1500}
                          </Text>
                        </View>
                      ))}
                  </View>

                  {Math.ceil(contracts.length / LIST_PAGE_SIZE) > 1 && (
                    <View style={[styles.paginationRow, { borderTopColor: borderCol }]}>
                      <Text style={{ color: textSecondary, fontSize: 11 }}>
                        Page {contractsPage} of {Math.ceil(contracts.length / LIST_PAGE_SIZE)} • 10/page
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[
                            styles.pageBtn,
                            { borderColor: borderCol, backgroundColor: subCardBg },
                            contractsPage <= 1 && { opacity: 0.4 },
                          ]}
                          disabled={contractsPage <= 1}
                          onPress={() => setContractsPage((p) => Math.max(1, p - 1))}
                        >
                          <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>← Prev</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.pageBtn,
                            { borderColor: borderCol, backgroundColor: subCardBg },
                            contractsPage >= Math.ceil(contracts.length / LIST_PAGE_SIZE) && { opacity: 0.4 },
                          ]}
                          disabled={contractsPage >= Math.ceil(contracts.length / LIST_PAGE_SIZE)}
                          onPress={() =>
                            setContractsPage((p) => Math.min(Math.ceil(contracts.length / LIST_PAGE_SIZE), p + 1))
                          }
                        >
                          <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>Next →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={[styles.sectionCard, { flex: 1, backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                📜 Recent Ledger Transactions ({transactions.length})
              </Text>
              {transactions.length === 0 ? (
                <Text style={{ color: textMuted, fontSize: 13 }}>No recent transactions found.</Text>
              ) : (
                <>
                  <View style={{ gap: 10 }}>
                    {transactions
                      .slice((txPage - 1) * LIST_PAGE_SIZE, txPage * LIST_PAGE_SIZE)
                      .map((tx: any) => (
                        <View
                          key={tx._id || tx.id}
                          style={[styles.listItem, { backgroundColor: subCardBg, borderColor: borderCol }]}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: textPrimary, fontWeight: '700', fontSize: 12 }}>{tx.type}</Text>
                            <Text
                              style={{
                                color: tx.amount >= 0 ? '#00E676' : '#EF4444',
                                fontWeight: '800',
                                fontSize: 12,
                              }}
                            >
                              {tx.amount >= 0 ? '+' : ''}
                              {tx.currency === 'BTC' ? Number(tx.amount).toFixed(8) : Number(tx.amount).toFixed(2)}{' '}
                              {tx.currency}
                            </Text>
                          </View>
                          <Text style={{ color: textSecondary, fontSize: 11, marginTop: 3 }} numberOfLines={2}>
                            {tx.description || '—'}
                          </Text>
                        </View>
                      ))}
                  </View>

                  {Math.ceil(transactions.length / LIST_PAGE_SIZE) > 1 && (
                    <View style={[styles.paginationRow, { borderTopColor: borderCol }]}>
                      <Text style={{ color: textSecondary, fontSize: 11 }}>
                        Page {txPage} of {Math.ceil(transactions.length / LIST_PAGE_SIZE)} • 10/page
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TouchableOpacity
                          style={[
                            styles.pageBtn,
                            { borderColor: borderCol, backgroundColor: subCardBg },
                            txPage <= 1 && { opacity: 0.4 },
                          ]}
                          disabled={txPage <= 1}
                          onPress={() => setTxPage((p) => Math.max(1, p - 1))}
                        >
                          <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>← Prev</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.pageBtn,
                            { borderColor: borderCol, backgroundColor: subCardBg },
                            txPage >= Math.ceil(transactions.length / LIST_PAGE_SIZE) && { opacity: 0.4 },
                          ]}
                          disabled={txPage >= Math.ceil(transactions.length / LIST_PAGE_SIZE)}
                          onPress={() =>
                            setTxPage((p) => Math.min(Math.ceil(transactions.length / LIST_PAGE_SIZE), p + 1))
                          }
                        >
                          <Text style={{ color: textPrimary, fontSize: 11, fontWeight: '700' }}>Next →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  backBtnText: { fontSize: 13, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  quickStatusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  banner: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  scrollContent: { padding: 20, gap: 18, maxWidth: 1400, alignSelf: 'center', width: '100%' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  kpiCard: {
    flex: 1,
    minWidth: 230,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  kpiLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  kpiValue: { fontSize: 22, fontWeight: '900' },
  sectionCard: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  formGrid: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  formField: { flex: 1, minWidth: 200, gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pillBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryBtn: {
    backgroundColor: '#00F0FF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  primaryBtnText: { color: '#05080F', fontWeight: '900', fontSize: 13 },
  warnBtn: {
    backgroundColor: '#F59E0B',
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  warnBtnText: { color: '#05080F', fontWeight: '900', fontSize: 13 },
  approveBtn: {
    backgroundColor: 'rgba(0,230,118,0.18)',
    borderColor: '#00E676',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveBtnText: { color: '#00E676', fontWeight: '800', fontSize: 13 },
  rejectBtn: {
    backgroundColor: 'rgba(239,68,68,0.18)',
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectBtnText: { color: '#EF4444', fontWeight: '800', fontSize: 13 },
  kycBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  twoColRow: { flexDirection: 'row', gap: 16 },
  listItem: { padding: 12, borderRadius: 10, borderWidth: 1 },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
  },
  pageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
});
