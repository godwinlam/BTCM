import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { StarRankIndicator } from '@/components/StarRankIndicator';
import { QRCodeView, generateQrDataUri } from '@/components/QRCodeView';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useIsMobile } from '@/hooks/useIsMobile';

interface KycInfo {
  status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  documentType?: 'PASSPORT' | 'NATIONAL_ID' | 'DRIVING_LICENSE' | string;
  documentNumber?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  selfieImageUrl?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface UserProfile {
  _id: string;
  id?: number | string;
  username: string;
  email: string;
  fullName: string;
  phone?: string;
  country?: string;
  address?: string;
  bio?: string;
  btcPayoutAddress?: string;
  usdtPayoutAddress?: string;
  usdtTrc20PayoutAddress?: string;
  usdtErc20PayoutAddress?: string;
  usdcPayoutAddress?: string;
  defaultPlacementLeg?: string;
  referralCode: string;
  sponsor?: { username: string; referralCode: string };
  binaryParent?: { username: string };
  binaryPosition?: string;
  starRank?: number;
  starBadge?: string;
  starIcon?: string;
  isStarQualified?: boolean;
  role?: string;
  status?: string;
  kyc?: KycInfo;
  wallet: {
    usdBalance: number;
    btcBalance: number;
    totalDirectEarned: number;
    totalBinaryEarned: number;
    totalMiningBtcEarned: number;
    totalInvested: number;
  };
  binaryLegs: {
    legACurrent: number;
    legBCurrent: number;
    legATotal: number;
    legBTotal: number;
    pairsCount: number;
  };
  createdAt?: string;
}

export default function UserProfileScreen() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'info' | 'kyc' | 'payout' | 'mlm' | 'security' | 'stats'>('info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Profile Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [btcPayoutAddress, setBtcPayoutAddress] = useState('');
  const [usdtPayoutAddress, setUsdtPayoutAddress] = useState('');
  const [usdtTrc20PayoutAddress, setUsdtTrc20PayoutAddress] = useState('');
  const [usdtErc20PayoutAddress, setUsdtErc20PayoutAddress] = useState('');
  const [usdcPayoutAddress, setUsdcPayoutAddress] = useState('');
  const [defaultPlacementLeg, setDefaultPlacementLeg] = useState<'A' | 'B' | 'AUTO'>('A');

  // KYC Setup State
  const [kycDocType, setKycDocType] = useState<'PASSPORT' | 'NATIONAL_ID' | 'DRIVING_LICENSE'>('PASSPORT');
  const [kycDocNumber, setKycDocNumber] = useState('');
  const [kycFrontImage, setKycFrontImage] = useState('');
  const [kycBackImage, setKycBackImage] = useState('');
  const [kycSelfieImage, setKycSelfieImage] = useState('');
  const [submittingKyc, setSubmittingKyc] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      if (!api.getToken()) {
        router.replace('/login' as any);
        return;
      }

      const res = await api.getMe();
      if (res?.user) {
        populateUserState(res.user);
      } else {
        router.replace('/login' as any);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load profile', 'error');
      router.replace('/login' as any);
    } finally {
      setLoading(false);
    }
  };

  const populateUserState = (u: UserProfile) => {
    setUser(u);
    setFullName(u.fullName || '');
    setEmail(u.email || '');
    setPhone(u.phone || '');
    setCountry(u.country || '');
    setAddress(u.address || u.bio || '');
    setBtcPayoutAddress(u.btcPayoutAddress || '');
    setUsdtPayoutAddress(u.usdtPayoutAddress || u.usdtTrc20PayoutAddress || '');
    setUsdtTrc20PayoutAddress(u.usdtTrc20PayoutAddress || u.usdtPayoutAddress || '');
    setUsdtErc20PayoutAddress(u.usdtErc20PayoutAddress || '');
    setUsdcPayoutAddress(u.usdcPayoutAddress || '');
    setDefaultPlacementLeg((u.defaultPlacementLeg as 'A' | 'B' | 'AUTO') || 'A');
    if (u.kyc) {
      if (u.kyc.documentType === 'PASSPORT' || u.kyc.documentType === 'NATIONAL_ID' || u.kyc.documentType === 'DRIVING_LICENSE') {
        setKycDocType(u.kyc.documentType);
      }
      setKycDocNumber(u.kyc.documentNumber || '');
      setKycFrontImage(u.kyc.frontImageUrl || '');
      setKycBackImage(u.kyc.backImageUrl || '');
      setKycSelfieImage(u.kyc.selfieImageUrl || '');
    }
  };

  const handleFileUpload = (setter: (val: string) => void, fieldName: string) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            showToast(`${fieldName} exceeds 5MB limit. Please upload a smaller image.`, 'error');
            return;
          }
          const reader = new FileReader();
          reader.onload = (loadEvent) => {
            const base64 = loadEvent.target?.result as string;
            setter(base64);
            showToast(`${fieldName} loaded successfully!`);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      showToast('Image picker is ready. Please select or paste the document image URL.');
    }
  };

  const handleSubmitKyc = async () => {
    if (!kycDocNumber.trim()) {
      showToast('Please enter your official document identification number.', 'error');
      return;
    }
    if (!kycFrontImage) {
      showToast('Please upload or provide your ID/Passport front photo proof.', 'error');
      return;
    }

    setSubmittingKyc(true);
    try {
      const res = await api.submitKyc({
        documentType: kycDocType,
        documentNumber: kycDocNumber.trim(),
        frontImageUrl: kycFrontImage,
        backImageUrl: kycBackImage,
        selfieImageUrl: kycSelfieImage,
      });

      if (res?.user) {
        populateUserState(res.user);
      }
      showToast('KYC application submitted successfully! Under compliance review.');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit KYC verification', 'error');
    } finally {
      setSubmittingKyc(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await api.updateProfile({
        fullName,
        email,
        phone,
        country,
        address,
        bio: address,
        btcPayoutAddress,
        usdtPayoutAddress: usdtTrc20PayoutAddress || usdtPayoutAddress,
        usdtTrc20PayoutAddress,
        usdtErc20PayoutAddress,
        usdcPayoutAddress,
        defaultPlacementLeg,
      });

      if (res?.user) {
        populateUserState(res.user);
        showToast('Profile information successfully saved!');
      } else {
        showToast('Profile updated!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showToast('Please enter both current and new password', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.updatePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password changed successfully! Keep your credentials safe.');
    } catch (err: any) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    router.replace('/login' as any);
  };

  const copyToClipboard = (text: string, label: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast(`${label} copied to clipboard!`);
    } else {
      showToast(`${label}: ${text}`);
    }
  };

  const getReferralUrl = () => {
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      return `${origin}/register?ref=${user?.referralCode || ''}`;
    }
    return `http://192.168.1.112:8081/register?ref=${user?.referralCode || ''}`;
  };

  const handleDownloadQr = () => {
    const inviteUrl = getReferralUrl();
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas) {
        try {
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `BTCM-Invite-${user?.referralCode || 'QR'}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast('Invite QR Code downloaded successfully (PNG)!');
          return;
        } catch (e) {
          console.warn('Canvas toDataURL failed, falling back to SVG:', e);
        }
      }
      const dataUri = generateQrDataUri(inviteUrl);
      const link = document.createElement('a');
      link.href = dataUri;
      link.download = `BTCM-Invite-${user?.referralCode || 'QR'}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Invite QR Code downloaded successfully (SVG)!');
    } else {
      copyToClipboard(inviteUrl, 'Shareable Invite URL');
    }
  };

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
              <Text style={styles.btcBadgeText}>₿</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>BTCM // {t('profile.title').toUpperCase()}</Text>
              <Text style={styles.brandSubtitle}>{t('profile.subtitle')}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.navRight, isMobile && styles.navRightMobile]}>
          <LanguageSelector compact />
          {user?.role === 'admin' && (
            <TouchableOpacity style={styles.adminBtn} onPress={() => router.push('/admin' as any)}>
              <Text style={styles.adminBtnText}>🛡️ {t('common.admin')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>{t('common.logout')}</Text>
          </TouchableOpacity>
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

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#F7931A" />
          <Text style={styles.loadingText}>Loading Miner Profile & Node Credentials...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Profile Banner */}
          <View style={[styles.heroCard, isMobile && styles.heroCardMobile]}>
            <View style={styles.heroLeft}>
              <View style={styles.avatarGlow}>
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'M'}
                </Text>
              </View>
              <View style={styles.heroMeta}>
                <View style={styles.nameRow}>
                  <Text style={styles.heroFullName}>{user?.fullName || user?.username}</Text>
                  {Boolean(user?.isStarQualified || (user?.starRank && user?.starRank >= 1)) && (
                    <StarRankIndicator rank={user?.starRank || 1} badge={user?.starBadge || ((user?.starRank || 0) >= 10 ? '3 CROWN' : (user?.starRank || 0) === 9 ? '2 CROWN' : (user?.starRank || 0) === 8 ? 'CROWN' : `${user?.starRank || 1}★`)} size="sm" />
                  )}
                  <View style={styles.statusPill}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusPillText}>{t('common.active')}</Text>
                  </View>
                  {user?.kyc?.status === 'VERIFIED' ? (
                    <View style={[styles.statusPill, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10B981' }]}>
                      <Text style={{ fontSize: 10 }}>🛡️</Text>
                      <Text style={[styles.statusPillText, { color: '#10B981' }]}>{t('profile.kycVerified')}</Text>
                    </View>
                  ) : user?.kyc?.status === 'PENDING' ? (
                    <View style={[styles.statusPill, { backgroundColor: 'rgba(247, 147, 26, 0.2)', borderColor: '#F7931A' }]}>
                      <Text style={{ fontSize: 10 }}>⏳</Text>
                      <Text style={[styles.statusPillText, { color: '#F7931A' }]}>{t('profile.kycPending')}</Text>
                    </View>
                  ) : user?.kyc?.status === 'REJECTED' ? (
                    <View style={[styles.statusPill, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' }]}>
                      <Text style={{ fontSize: 10 }}>❌</Text>
                      <Text style={[styles.statusPillText, { color: '#EF4444' }]}>{t('common.error')}</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.statusPill, { backgroundColor: 'rgba(100, 116, 139, 0.2)', borderColor: '#64748B' }]}
                      onPress={() => setActiveTab('kyc')}
                    >
                      <Text style={{ fontSize: 10 }}>⚠️</Text>
                      <Text style={[styles.statusPillText, { color: '#94A3B8' }]}>{t('profile.kycUnverified')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.heroUsername}>@{user?.username} • ID: #{user?.id || user?._id}</Text>
                <Text style={styles.heroEmail}>✉️ {user?.email} {user?.country ? `• 🌍 ${user.country}` : ''}</Text>
              </View>
            </View>

            {/* Quick Hero Financial Chips */}
            <View style={[styles.heroRight, isMobile && styles.heroRightMobile]}>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatLabel}>MINING BALANCE</Text>
                <Text style={styles.heroStatValueUsd}>
                  {user?.wallet?.usdBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'} USDT
                </Text>
              </View>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatLabel}>BITCOIN (ROI)</Text>
                <Text style={styles.heroStatValueBtc}>
                  ₿ {user?.wallet?.btcBalance?.toFixed(8) || '0.00000000'}
                </Text>
              </View>
              <View style={styles.heroStatBox}>
                <Text style={styles.heroStatLabel}>AFFILIATE BONUS</Text>
                <Text style={styles.heroStatValueBonus}>
                  +{((user?.wallet?.totalDirectEarned || 0) + (user?.wallet?.totalBinaryEarned || 0)).toFixed(2)} USDT
                </Text>
              </View>
            </View>
          </View>

          {/* Profile Navigation Tabs */}
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'info' && styles.tabBtnActive]}
                onPress={() => setActiveTab('info')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'info' && styles.tabBtnTextActive]}>
                  👤 Personal Info
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'kyc' && styles.tabBtnActive]}
                onPress={() => setActiveTab('kyc')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'kyc' && styles.tabBtnTextActive]}>
                  🛡️ KYC Verification {user?.kyc?.status === 'VERIFIED' ? '✓' : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'payout' && styles.tabBtnActive]}
                onPress={() => setActiveTab('payout')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'payout' && styles.tabBtnTextActive]}>
                  ₿ Crypto Payouts
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'mlm' && styles.tabBtnActive]}
                onPress={() => setActiveTab('mlm')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'mlm' && styles.tabBtnTextActive]}>
                  🌲 Affiliate Hub
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'stats' && styles.tabBtnActive]}
                onPress={() => setActiveTab('stats')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'stats' && styles.tabBtnTextActive]}>
                  📊 Hashrate & Earnings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'security' && styles.tabBtnActive]}
                onPress={() => setActiveTab('security')}
              >
                <Text style={[styles.tabBtnText, activeTab === 'security' && styles.tabBtnTextActive]}>
                  🔒 Password & Security
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* TAB 1: PERSONAL INFO */}
          {activeTab === 'info' && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Account & Contact Details</Text>
                <Text style={styles.sectionSubtitle}>
                  Update your personal credentials and contact methods for mining notifications.
                </Text>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="e.g. Satoshi Nakamoto"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="e.g. miner@domain.com"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PHONE / MOBILE (OPTIONAL)</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholder="e.g. +1 555 123 4567"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>COUNTRY / REGION</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={country}
                      onChangeText={setCountry}
                      placeholder="e.g. Singapore, Switzerland, USA"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>FULL ADDRESS</Text>
                <View style={[styles.inputWrapper, styles.textareaWrapper]}>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={3}
                    placeholder="Enter your complete residential or postal address (street, city, state/province, postal code)..."
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#0B0E14" />
                ) : (
                  <Text style={styles.saveBtnText}>💾 Save Profile Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: KYC COMPLIANCE SETUP */}
          {activeTab === 'kyc' && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <Text style={styles.sectionTitle}>KYC Identity Verification</Text>
                  {user?.kyc?.status === 'VERIFIED' ? (
                    <View style={styles.kycStatusBadgeVerified}>
                      <Text style={styles.kycStatusBadgeTextVerified}>✅ VERIFIED & ACCREDITED</Text>
                    </View>
                  ) : user?.kyc?.status === 'PENDING' ? (
                    <View style={styles.kycStatusBadgePending}>
                      <Text style={styles.kycStatusBadgeTextPending}>⏳ PENDING COMPLIANCE REVIEW</Text>
                    </View>
                  ) : user?.kyc?.status === 'REJECTED' ? (
                    <View style={styles.kycStatusBadgeRejected}>
                      <Text style={styles.kycStatusBadgeTextRejected}>❌ REJECTED - RESUBMISSION REQUIRED</Text>
                    </View>
                  ) : (
                    <View style={styles.kycStatusBadgeUnverified}>
                      <Text style={styles.kycStatusBadgeTextUnverified}>⚠️ UNVERIFIED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sectionSubtitle}>
                  Submit official government-issued identification to unlock institutional withdrawal limits and AML compliance certification.
                </Text>
              </View>

              {/* KYC Status Banner */}
              {user?.kyc?.status === 'VERIFIED' ? (
                <View style={styles.kycNoticeCardVerified}>
                  <Text style={styles.kycNoticeTitleVerified}>🎉 Tier-2 Identity Verification Passed</Text>
                  <Text style={styles.kycNoticeSub}>
                    Your identity has been fully verified and logged into the cryptographic KYC registry. Your account holds full institutional privileges with unthrottled high-limit crypto withdrawals.
                  </Text>
                  {user?.kyc?.reviewedAt && (
                    <Text style={styles.kycMetaText}>Verified At: {new Date(user.kyc.reviewedAt).toLocaleString()}</Text>
                  )}
                </View>
              ) : user?.kyc?.status === 'PENDING' ? (
                <View style={styles.kycNoticeCardPending}>
                  <Text style={styles.kycNoticeTitlePending}>⏳ Verification Under Compliance Review</Text>
                  <Text style={styles.kycNoticeSub}>
                    Your submitted documents ({user?.kyc?.documentType} #{user?.kyc?.documentNumber}) have been securely queued for automated and compliance officer inspection. Verification usually completes within 12 to 24 hours.
                  </Text>
                  {user?.kyc?.submittedAt && (
                    <Text style={styles.kycMetaText}>Submitted At: {new Date(user.kyc.submittedAt).toLocaleString()}</Text>
                  )}
                </View>
              ) : user?.kyc?.status === 'REJECTED' ? (
                <View style={styles.kycNoticeCardRejected}>
                  <Text style={styles.kycNoticeTitleRejected}>❌ Verification Request Rejected</Text>
                  <Text style={styles.kycNoticeSub}>
                    Reason: {user?.kyc?.rejectionReason || 'Document unreadable, expired, or mismatching registration identity.'}
                  </Text>
                  <Text style={[styles.kycNoticeSub, { marginTop: 6, fontWeight: '700' }]}>
                    Please review the guidelines below, re-upload clear photos, and submit again.
                  </Text>
                </View>
              ) : (
                <View style={styles.kycNoticeCardInfo}>
                  <Text style={styles.kycNoticeTitleInfo}>ℹ️ Why complete KYC verification?</Text>
                  <Text style={styles.kycNoticeSub}>
                    Verified miners receive priority blockchain transaction dispatch, bypass manual security holds on payouts, and qualify for high-tier MLM Star Rank binary overrides.
                  </Text>
                </View>
              )}

              {/* KYC Form */}
              <View style={styles.kycFormCard}>
                <Text style={styles.kycSectionHeading}>1. SELECT IDENTIFICATION DOCUMENT TYPE</Text>
                <View style={styles.kycDocTypeGrid}>
                  <TouchableOpacity
                    style={[styles.kycDocTypeBtn, kycDocType === 'PASSPORT' && styles.kycDocTypeBtnActive]}
                    onPress={() => setKycDocType('PASSPORT')}
                    disabled={user?.kyc?.status === 'VERIFIED' || user?.kyc?.status === 'PENDING'}
                  >
                    <Text style={styles.kycDocTypeIcon}>🛂</Text>
                    <Text style={[styles.kycDocTypeText, kycDocType === 'PASSPORT' && styles.kycDocTypeTextActive]}>
                      International Passport
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.kycDocTypeBtn, kycDocType === 'NATIONAL_ID' && styles.kycDocTypeBtnActive]}
                    onPress={() => setKycDocType('NATIONAL_ID')}
                    disabled={user?.kyc?.status === 'VERIFIED' || user?.kyc?.status === 'PENDING'}
                  >
                    <Text style={styles.kycDocTypeIcon}>🪪</Text>
                    <Text style={[styles.kycDocTypeText, kycDocType === 'NATIONAL_ID' && styles.kycDocTypeTextActive]}>
                      National ID Card
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.kycDocTypeBtn, kycDocType === 'DRIVING_LICENSE' && styles.kycDocTypeBtnActive]}
                    onPress={() => setKycDocType('DRIVING_LICENSE')}
                    disabled={user?.kyc?.status === 'VERIFIED' || user?.kyc?.status === 'PENDING'}
                  >
                    <Text style={styles.kycDocTypeIcon}>🚗</Text>
                    <Text style={[styles.kycDocTypeText, kycDocType === 'DRIVING_LICENSE' && styles.kycDocTypeTextActive]}>
                      Driver's License
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.inputGroup, { marginTop: 18 }]}>
                  <Text style={styles.label}>DOCUMENT IDENTIFICATION NUMBER *</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={kycDocNumber}
                      onChangeText={setKycDocNumber}
                      placeholder={
                        kycDocType === 'PASSPORT'
                          ? 'e.g. P12345678 or E98765432'
                          : kycDocType === 'NATIONAL_ID'
                          ? 'e.g. 784-1990-1234567-1'
                          : 'e.g. DL-9876543210'
                      }
                      placeholderTextColor="#64748B"
                      editable={user?.kyc?.status !== 'VERIFIED' && user?.kyc?.status !== 'PENDING'}
                    />
                  </View>
                </View>

                {/* Document Upload Panels */}
                <Text style={[styles.kycSectionHeading, { marginTop: 24 }]}>2. UPLOAD DOCUMENT PROOF PHOTOS</Text>
                <Text style={styles.kycUploadSubtext}>
                  Photos must be clear, high-resolution, unedited, and display all four corners of the ID without glare or blur (Max 5MB per image).
                </Text>

                <View style={styles.kycUploadGrid}>
                  {/* Front Photo */}
                  <View style={styles.kycUploadBox}>
                    <Text style={styles.kycUploadTitle}>📄 Document Front *</Text>
                    <Text style={styles.kycUploadHint}>Photo page of Passport or Front of National ID</Text>

                    {kycFrontImage ? (
                      <View style={styles.kycPreviewContainer}>
                        {Platform.OS === 'web' ? (
                          React.createElement('img', {
                            src: kycFrontImage,
                            alt: 'Document Front',
                            style: { width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 },
                          })
                        ) : (
                          <View style={styles.kycNativePreviewBox}>
                            <Text style={styles.kycPreviewReadyText}>✅ Front Image Ready</Text>
                          </View>
                        )}
                        {user?.kyc?.status !== 'VERIFIED' && user?.kyc?.status !== 'PENDING' && (
                          <TouchableOpacity
                            style={styles.kycChangePhotoBtn}
                            onPress={() => handleFileUpload(setKycFrontImage, 'Document Front')}
                          >
                            <Text style={styles.kycChangePhotoText}>🔄 Change Photo</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.kycDropzone}
                        onPress={() => handleFileUpload(setKycFrontImage, 'Document Front')}
                        disabled={user?.kyc?.status === 'VERIFIED' || user?.kyc?.status === 'PENDING'}
                      >
                        <Text style={styles.kycDropzoneIcon}>📷</Text>
                        <Text style={styles.kycDropzoneLabel}>Click to Choose / Upload Front</Text>
                        <Text style={styles.kycDropzoneSub}>PNG, JPG, WEBP up to 5MB</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Back Photo */}
                  <View style={styles.kycUploadBox}>
                    <Text style={styles.kycUploadTitle}>📄 Document Back (Optional)</Text>
                    <Text style={styles.kycUploadHint}>Back of National ID / Driving License (if applicable)</Text>

                    {kycBackImage ? (
                      <View style={styles.kycPreviewContainer}>
                        {Platform.OS === 'web' ? (
                          React.createElement('img', {
                            src: kycBackImage,
                            alt: 'Document Back',
                            style: { width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 },
                          })
                        ) : (
                          <View style={styles.kycNativePreviewBox}>
                            <Text style={styles.kycPreviewReadyText}>✅ Back Image Ready</Text>
                          </View>
                        )}
                        {user?.kyc?.status !== 'VERIFIED' && user?.kyc?.status !== 'PENDING' && (
                          <TouchableOpacity
                            style={styles.kycChangePhotoBtn}
                            onPress={() => handleFileUpload(setKycBackImage, 'Document Back')}
                          >
                            <Text style={styles.kycChangePhotoText}>🔄 Change Photo</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.kycDropzone}
                        onPress={() => handleFileUpload(setKycBackImage, 'Document Back')}
                        disabled={user?.kyc?.status === 'VERIFIED' || user?.kyc?.status === 'PENDING'}
                      >
                        <Text style={styles.kycDropzoneIcon}>🖼️</Text>
                        <Text style={styles.kycDropzoneLabel}>Click to Choose / Upload Back</Text>
                        <Text style={styles.kycDropzoneSub}>Optional for single-page Passports</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Selfie with ID */}
                  <View style={styles.kycUploadBox}>
                    <Text style={styles.kycUploadTitle}>🤳 Facial Liveness / Selfie Photo</Text>
                    <Text style={styles.kycUploadHint}>Hold your ID next to your face with today's date note</Text>

                    {kycSelfieImage ? (
                      <View style={styles.kycPreviewContainer}>
                        {Platform.OS === 'web' ? (
                          React.createElement('img', {
                            src: kycSelfieImage,
                            alt: 'Selfie with ID',
                            style: { width: '100%', height: 160, objectFit: 'cover', borderRadius: 8 },
                          })
                        ) : (
                          <View style={styles.kycNativePreviewBox}>
                            <Text style={styles.kycPreviewReadyText}>✅ Selfie Image Ready</Text>
                          </View>
                        )}
                        {user?.kyc?.status !== 'VERIFIED' && user?.kyc?.status !== 'PENDING' && (
                          <TouchableOpacity
                            style={styles.kycChangePhotoBtn}
                            onPress={() => handleFileUpload(setKycSelfieImage, 'Selfie with ID')}
                          >
                            <Text style={styles.kycChangePhotoText}>🔄 Change Photo</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.kycDropzone}
                        onPress={() => handleFileUpload(setKycSelfieImage, 'Selfie with ID')}
                        disabled={user?.kyc?.status === 'VERIFIED' || user?.kyc?.status === 'PENDING'}
                      >
                        <Text style={styles.kycDropzoneIcon}>🤳</Text>
                        <Text style={styles.kycDropzoneLabel}>Click to Choose / Upload Selfie</Text>
                        <Text style={styles.kycDropzoneSub}>Verifies identity authenticity</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Submission Action */}
                {user?.kyc?.status !== 'VERIFIED' && (
                  <View style={{ marginTop: 26 }}>
                    <TouchableOpacity
                      style={[
                        styles.saveBtn,
                        (submittingKyc || user?.kyc?.status === 'PENDING') && styles.btnDisabled,
                        { backgroundColor: user?.kyc?.status === 'PENDING' ? '#334155' : '#10B981' },
                      ]}
                      onPress={handleSubmitKyc}
                      disabled={submittingKyc || user?.kyc?.status === 'PENDING'}
                    >
                      {submittingKyc ? (
                        <ActivityIndicator color="#0B0E14" />
                      ) : (
                        <Text style={[styles.saveBtnText, { color: user?.kyc?.status === 'PENDING' ? '#94A3B8' : '#0B0E14' }]}>
                          {user?.kyc?.status === 'PENDING'
                            ? '⏳ Verification Currently Under Review'
                            : user?.kyc?.status === 'REJECTED'
                            ? '🔄 Resubmit KYC Verification'
                            : '🛡️ Submit Identity Verification for Approval'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Compliance & Privacy Guarantees */}
              <View style={styles.kycGuaranteeCard}>
                <Text style={styles.kycGuaranteeTitle}>🔐 COMPLIANCE & PRIVACY GUARANTEE</Text>
                <Text style={styles.kycGuaranteeItem}>
                  • All identification uploads are encrypted with AES-256 and stored in restricted zero-trust security enclosures.
                </Text>
                <Text style={styles.kycGuaranteeItem}>
                  • Document data is exclusively utilized for regulatory AML/CFT sanctions screening and identity ownership authentication.
                </Text>
                <Text style={styles.kycGuaranteeItem}>
                  • Under no circumstances are miner KYC records shared with unauthorized third parties or marketing networks.
                </Text>
              </View>
            </View>
          )}

          {/* TAB 3: CRYPTO PAYOUTS */}
          {activeTab === 'payout' && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Cryptocurrency Payout Configuration</Text>
                <Text style={styles.sectionSubtitle}>
                  Set your automated receiving addresses for daily Bitcoin mining yields and USDT referral payouts.
                </Text>
              </View>

              <View style={styles.payoutCard}>
                <View style={styles.payoutHeader}>
                  <View style={styles.cryptoIconBtc}>
                    <Text style={styles.cryptoIconText}>₿</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payoutTitle}>Bitcoin (BTC) Payout Address</Text>
                    <Text style={styles.payoutSub}>
                      Receives automated or manual daily Bitcoin yields (SegWit / Native Taproot / Legacy).
                    </Text>
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={btcPayoutAddress}
                    onChangeText={setBtcPayoutAddress}
                    placeholder="e.g. bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.fieldHint}>
                  ⚡ Daily mining rewards are calculated according to your ASIC contracts (max 1,500 days lifecycle).
                </Text>
              </View>

              {/* USDT TRC20 */}
              <View style={styles.payoutCard}>
                <View style={styles.payoutHeader}>
                  <View style={styles.cryptoIconUsdt}>
                    <Text style={styles.cryptoIconText}>₮</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={styles.payoutTitle}>Tether (USDT - TRC20) Address</Text>
                      <View style={styles.networkBadgePill}>
                        <Text style={styles.networkBadgeText}>TRON / TRC20</Text>
                      </View>
                    </View>
                    <Text style={styles.payoutSub}>
                      Fast & low-fee Tron TRC20 network address for receiving instant 10% direct purchase rewards and 10% binary pairing bonuses.
                    </Text>
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={usdtTrc20PayoutAddress}
                    onChangeText={setUsdtTrc20PayoutAddress}
                    placeholder="e.g. TTYx8W8D9P3QvG7kRt2L5mZn9X1A4s7B (Tron network)"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.fieldHint}>
                  ⭐ Primary Tron TRC-20 wallet for automated or instant commission withdrawals.
                </Text>
              </View>

              {/* USDT ERC20 */}
              <View style={styles.payoutCard}>
                <View style={styles.payoutHeader}>
                  <View style={styles.cryptoIconUsdtErc}>
                    <Text style={[styles.cryptoIconText, { color: '#FFFFFF' }]}>₮</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={styles.payoutTitle}>Tether (USDT - ERC20) Address</Text>
                      <View style={[styles.networkBadgePill, { backgroundColor: 'rgba(98, 126, 234, 0.15)', borderColor: '#627EEA' }]}>
                        <Text style={[styles.networkBadgeText, { color: '#627EEA' }]}>ETHEREUM / ERC20</Text>
                      </View>
                    </View>
                    <Text style={styles.payoutSub}>
                      Ethereum ERC-20 network address for hardware wallets, cold storage, or DeFi custodial accounts.
                    </Text>
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={usdtErc20PayoutAddress}
                    onChangeText={setUsdtErc20PayoutAddress}
                    placeholder="e.g. 0x71C26a6FfE65fF6D19Fe43d57fB0bC18... (Ethereum network)"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.fieldHint}>
                  🔗 Supported standard ERC-20 token address on Ethereum mainnet.
                </Text>
              </View>

              {/* USDC */}
              <View style={styles.payoutCard}>
                <View style={styles.payoutHeader}>
                  <View style={styles.cryptoIconUsdc}>
                    <Text style={[styles.cryptoIconText, { color: '#FFFFFF' }]}>$</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={styles.payoutTitle}>USD Coin (USDC) Payout Address</Text>
                      <View style={[styles.networkBadgePill, { backgroundColor: 'rgba(39, 117, 202, 0.15)', borderColor: '#2775CA' }]}>
                        <Text style={[styles.networkBadgeText, { color: '#2775CA' }]}>USDC</Text>
                      </View>
                    </View>
                    <Text style={styles.payoutSub}>
                      Regulated digital dollar USD Coin (USDC) receiving address for compliant payouts and corporate treasury.
                    </Text>
                  </View>
                </View>

                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    value={usdcPayoutAddress}
                    onChangeText={setUsdcPayoutAddress}
                    placeholder="e.g. 0x89205A3A3b2A556108d85613ec08152ab... (USDC address)"
                    placeholderTextColor="#64748B"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.fieldHint}>
                  💵 Regulated USDC payouts directly credited to your multi-chain or ERC20 wallet.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#0B0E14" />
                ) : (
                  <Text style={styles.saveBtnText}>💾 Update Payout Addresses</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gotoTransferBtn}
                onPress={() => router.push('/transfer' as any)}
              >
                <Text style={styles.gotoTransferBtnText}>⇄ Open Asset Transfer & Withdrawal Page</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 3: MLM & AFFILIATE HUB */}
          {activeTab === 'mlm' && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Binary Affiliate Hub</Text>
                <Text style={styles.sectionSubtitle}>
                  Earn 10% direct reward on downline package purchases and 10% on every 1,000 USDT pairing cycle.
                </Text>
              </View>

              {/* Star Ranking Status Display Card */}
              <View style={styles.starRankProfileCard}>
                <View style={styles.starRankProfileHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={{ fontSize: 24 }}>⭐</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.starRankProfileTitle}>
                        {(user?.starRank || 0) >= 10
                          ? '👑👑👑 3 CROWN QUALIFIED MINER'
                          : (user?.starRank || 0) === 9
                            ? '👑👑 2 CROWN QUALIFIED MINER'
                            : (user?.starRank || 0) === 8
                              ? '👑 CROWN QUALIFIED MINER'
                              : (user?.starRank || 0) === 7
                                ? '★★★★★★★ 7 STAR QUALIFIED MINER'
                                : (user?.starRank || 0) === 6
                                  ? '★★★★★★ 6 STAR QUALIFIED MINER'
                                  : (user?.starRank || 0) === 5
                                    ? '★★★★★ 5 STAR QUALIFIED MINER'
                                    : (user?.starRank || 0) === 4
                                      ? '★★★★ 4 STAR QUALIFIED MINER'
                                      : (user?.starRank || 0) === 3
                                        ? '★★★ 3 STAR QUALIFIED MINER'
                                        : user?.starRank === 2
                                          ? '★★ 2 STAR QUALIFIED MINER'
                                          : user?.starRank === 1
                                            ? '★ 1 STAR QUALIFIED MINER'
                                            : 'UNRANKED MINER (0 STAR)'}
                      </Text>
                      <Text style={styles.starRankProfileSub}>
                        {(user?.starRank || 0) >= 10
                          ? 'Qualified: Min 100,000 USDT personal mining service + ≥ 100,000,000 USDT below placement tree sales.'
                          : (user?.starRank || 0) === 9
                            ? 'Qualified: Min 60,000 USDT personal mining service + ≥ 50,000,000 USDT below placement tree sales.'
                            : (user?.starRank || 0) === 8
                              ? 'Qualified: Min 30,000 USDT personal mining service + ≥ 10,000,000 USDT below placement tree sales.'
                              : (user?.starRank || 0) === 7
                                ? 'Qualified: Min 30,000 USDT personal mining service + ≥ 5,000,000 USDT below placement tree sales.'
                                : (user?.starRank || 0) === 6
                                  ? 'Qualified: Min 10,000 USDT personal mining service + ≥ 1,000,000 USDT below placement tree sales.'
                                  : (user?.starRank || 0) >= 5
                                    ? 'Qualified: Min 5,000 USDT personal mining service + ≥ 100,000 USDT direct placement tree sales.'
                                    : (user?.starRank || 0) === 4
                                      ? 'Qualified: Min 5,000 USDT personal mining service + ≥ 50,000 USDT direct placement tree sales.'
                                      : (user?.starRank || 0) === 3
                                        ? 'Qualified: Min 1,000 USDT personal mining service + ≥ 10,000 USDT direct placement tree sales.'
                                        : user?.starRank === 2
                                          ? 'Qualified: Min 300 USDT personal mining service + ≥ 2,000 USDT direct placement tree sales.'
                                          : user?.starRank === 1
                                            ? 'Qualified: Total sales volume ≥ 1,000 USDT from direct placement tree.'
                                            : 'Requirement: Accumulate 1,000 USDT tree sales for 1★; 300 USDT personal + 2,000 USDT tree sales for 2★; 1,000 USDT personal + 10,000 USDT tree sales for 3★; 5,000 USDT personal + 50,000 USDT tree sales for 4★; 5,000 USDT personal + 100,000 USDT tree sales for 5★; 10,000 USDT personal + 1,000,000 USDT tree sales for 6★; 30,000 USDT personal + 5,000,000 USDT tree sales for 7★; 30,000 USDT personal + 10,000,000 USDT tree sales for 👑 Crown; 60,000 USDT personal + 50,000,000 USDT tree sales for 👑👑 2 Crown; 100,000 USDT personal + 100,000,000 USDT tree sales for 👑👑👑 3 Crown.'}
                      </Text>
                    </View>
                  </View>
                  <StarRankIndicator
                    rank={user?.starRank || 0}
                    isQualified={Boolean(user?.isStarQualified || (user?.starRank && user?.starRank >= 1))}
                    badge={user?.starBadge}
                    size="md"
                  />
                </View>

                <View style={styles.starRankDetailsGrid}>
                  <View style={styles.starRankDetailItem}>
                    <Text style={styles.starRankDetailLabel}>DAILY PAIRING CAP</Text>
                    <Text style={styles.starRankDetailValGold}>
                      {(user?.starRank || 0) >= 10 ? '18 Pairs / Day' : (user?.starRank || 0) === 9 ? '15 Pairs / Day' : (user?.starRank || 0) === 8 ? '13 Pairs / Day' : (user?.starRank || 0) === 7 ? '11 Pairs / Day' : (user?.starRank || 0) === 6 ? '9 Pairs / Day' : (user?.starRank || 0) === 5 ? '7 Pairs / Day' : (user?.starRank || 0) === 4 ? '6 Pairs / Day' : (user?.starRank || 0) === 3 ? '4 Pairs / Day' : user?.starRank === 2 ? '2 Pairs / Day' : user?.starRank === 1 ? '1 Pair / Day' : '0 Pairs / Day'}
                    </Text>
                    <Text style={styles.starRankDetailSub}>
                      {(user?.starRank || 0) >= 10 ? '1,800 USDT Reward Cap' : (user?.starRank || 0) >= 9 ? '1,500 USDT Reward Cap' : (user?.starRank || 0) >= 8 ? '1,300 USDT Reward Cap' : (user?.starRank || 0) >= 7 ? '1,100 USDT Reward Cap' : (user?.starRank || 0) === 6 ? '900 USDT Reward Cap' : (user?.starRank || 0) === 5 ? '700 USDT Reward Cap' : (user?.starRank || 0) === 4 ? '600 USDT Reward Cap' : (user?.starRank || 0) === 3 ? '400 USDT Reward Cap' : user?.starRank === 2 ? '200 USDT Reward Cap' : user?.starRank === 1 ? '100 USDT Reward Cap' : 'Upgrade to Star Rank'}
                    </Text>
                  </View>
                  <View style={styles.starRankDetailItem}>
                    <Text style={styles.starRankDetailLabel}>SETTLEMENT CYCLE</Text>
                    <Text style={styles.starRankDetailValCyan}>Next Day Daily</Text>
                    <Text style={styles.starRankDetailSub}>Automated Daily Run</Text>
                  </View>
                  <View style={styles.starRankDetailItem}>
                    <Text style={styles.starRankDetailLabel}>CONFISCATION RULE</Text>
                    <Text style={styles.starRankDetailValRed}>Excess Vol. Confiscated</Text>
                    <Text style={styles.starRankDetailSub}>
                      {(user?.starRank || 0) >= 10 ? 'e.g. 19th, 20th 1,000 Pairing' : (user?.starRank || 0) === 9 ? 'e.g. 16th, 17th 1,000 Pairing' : (user?.starRank || 0) === 8 ? 'e.g. 14th, 15th 1,000 Pairing' : (user?.starRank || 0) === 7 ? 'e.g. 12th, 13th 1,000 Pairing' : (user?.starRank || 0) === 6 ? 'e.g. 10th, 11th 1,000 Pairing' : (user?.starRank || 0) === 5 ? 'e.g. 8th, 9th 1,000 Pairing' : (user?.starRank || 0) === 4 ? 'e.g. 7th, 8th 1,000 Pairing' : (user?.starRank || 0) === 3 ? 'e.g. 5th, 6th 1,000 Pairing' : user?.starRank === 2 ? 'e.g. 3rd 1,000 Pairing' : 'e.g. 2nd 1,000 Pairing'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Referral Code & Share Link */}
              <View style={styles.affiliateHighlightBox}>
                <View style={styles.affiliateTopRow}>
                  <View>
                    <Text style={styles.affiliateLabel}>YOUR UNIQUE REFERRAL CODE</Text>
                    <Text style={styles.affiliateCode}>{user?.referralCode || 'BTC...'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => copyToClipboard(user?.referralCode || '', 'Referral Code')}
                  >
                    <Text style={styles.copyBtnText}>📋 Copy Code</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.affiliateLinkRow}>
                  <View style={styles.linkTextContainer}>
                    <Text style={styles.affiliateLinkLabel}>Shareable Invite URL:</Text>
                    <Text style={styles.affiliateLinkText} numberOfLines={1}>
                      {getReferralUrl()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyLinkBtn}
                    onPress={() => copyToClipboard(getReferralUrl(), 'Invite Link')}
                  >
                    <Text style={styles.copyLinkBtnText}>🔗 Copy Link</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Shareable Invite QR Code */}
              <View style={styles.qrCodeSectionCard}>
                <View style={styles.qrHeaderRow}>
                  <View style={styles.qrIconBadge}>
                    <Text style={{ fontSize: 18 }}>📱</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.preferenceTitle}>INVITE QR CODE (SCAN TO REGISTER)</Text>
                    <Text style={styles.preferenceSub}>
                      Generated from your Shareable Invite URL. Present or send this QR code for miners to scan and automatically register under your team.
                    </Text>
                  </View>
                </View>

                <View style={[styles.qrDisplayRow, isMobile && styles.qrDisplayRowMobile]}>
                  {/* Left / Top: QR Code Container */}
                  <View style={styles.qrFrameCol}>
                    <View style={styles.qrCodeCard}>
                      <QRCodeView
                        value={getReferralUrl()}
                        size={isMobile ? 150 : 170}
                        bgColor="#FFFFFF"
                        fgColor="#0B0E14"
                      />
                    </View>
                    <View style={styles.qrScanTag}>
                      <Text style={styles.qrScanTagText}>📷 SCAN TO REGISTER</Text>
                    </View>
                  </View>

                  {/* Right / Bottom: Target URL & Action Controls */}
                  <View style={styles.qrDetailsCol}>
                    <View style={styles.qrUrlDetailBox}>
                      <Text style={styles.qrUrlDetailLabel}>SHAREABLE TARGET INVITE URL</Text>
                      <Text style={styles.qrUrlDetailValue} numberOfLines={2}>
                        {getReferralUrl()}
                      </Text>
                    </View>

                    <View style={styles.qrMetadataRow}>
                      <View style={styles.qrMetaPill}>
                        <Text style={styles.qrMetaPillLabel}>SPONSOR</Text>
                        <Text style={styles.qrMetaPillValue}>@{user?.username || 'miner'}</Text>
                      </View>
                      <View style={styles.qrMetaPill}>
                        <Text style={styles.qrMetaPillLabel}>REF CODE</Text>
                        <Text style={[styles.qrMetaPillValue, { color: '#F7931A' }]}>{user?.referralCode || 'N/A'}</Text>
                      </View>
                    </View>

                    <View style={styles.qrActionButtons}>
                      <TouchableOpacity
                        style={styles.qrCopyBtn}
                        onPress={() => copyToClipboard(getReferralUrl(), 'Shareable Invite URL')}
                      >
                        <Text style={styles.qrCopyBtnText}>📋 Copy Invite URL</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.qrDownloadBtn}
                        onPress={handleDownloadQr}
                      >
                        <Text style={styles.qrDownloadBtnText}>📥 Download QR Image</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.qrHintNote}>
                      ⚡ New members who scan this QR code will have your sponsor referral code pre-filled automatically on the registration page.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Lineage & Upline Info */}
              <View style={styles.lineageGrid}>
                <View style={styles.lineageCard}>
                  <Text style={styles.lineageLabel}>SPONSOR (UPLINE)</Text>
                  <Text style={styles.lineageValue}>
                    {user?.sponsor?.username ? `@${user.sponsor.username}` : 'Direct Root Node'}
                  </Text>
                  <Text style={styles.lineageSub}>
                    Code: {user?.sponsor?.referralCode || 'SYSTEM'}
                  </Text>
                </View>

                <View style={styles.lineageCard}>
                  <Text style={styles.lineageLabel}>BINARY PARENT</Text>
                  <Text style={styles.lineageValue}>
                    {user?.binaryParent?.username ? `@${user.binaryParent.username}` : 'Top of Tree'}
                  </Text>
                  <Text style={styles.lineageSub}>
                    Placed in: Leg {user?.binaryPosition || 'N/A'}
                  </Text>
                </View>

                <View style={styles.lineageCard}>
                  <Text style={styles.lineageLabel}>COMPLETED PAIRINGS</Text>
                  <Text style={styles.lineageValueGold}>
                    {user?.binaryLegs?.pairsCount || 0} Pairs
                  </Text>
                  <Text style={styles.lineageSub}>
                    Total Earned: {user?.wallet?.totalBinaryEarned?.toFixed(2) || '0.00'} USDT
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 4: HASHRATE & FINANCIAL STATS */}
          {activeTab === 'stats' && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mining Metrics & Commission Ledger</Text>
                <Text style={styles.sectionSubtitle}>
                  Real-time summary of your cloud mining hashrate capital and multi-tier affiliate rewards.
                </Text>
              </View>

              <View style={styles.statsCardGrid}>
                <View style={styles.statMetricCard}>
                  <Text style={styles.statMetricLabel}>TOTAL CAPITAL INVESTED</Text>
                  <Text style={styles.statMetricValue}>
                    {user?.wallet?.totalInvested?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'} USDT
                  </Text>
                  <Text style={styles.statMetricSub}>Active cloud mining contracts</Text>
                </View>

                <View style={styles.statMetricCard}>
                  <Text style={styles.statMetricLabel}>MINING BITCOIN HARVESTED</Text>
                  <Text style={styles.statMetricValueBtc}>
                    ₿ {user?.wallet?.btcBalance?.toFixed(8) || '0.00000000'}
                  </Text>
                  <Text style={styles.statMetricSub}>
                    ≈ {((user?.wallet?.btcBalance || 0) * 82420).toFixed(2)} USDT value
                  </Text>
                </View>

                <View style={styles.statMetricCard}>
                  <Text style={styles.statMetricLabel}>10% DIRECT SPONSOR BONUS</Text>
                  <Text style={styles.statMetricValueGreen}>
                    +{user?.wallet?.totalDirectEarned?.toFixed(2) || '0.00'} USDT
                  </Text>
                  <Text style={styles.statMetricSub}>From downline package purchases</Text>
                </View>

                <View style={styles.statMetricCard}>
                  <Text style={styles.statMetricLabel}>10% BINARY PAIRING COMMISSIONS</Text>
                  <Text style={styles.statMetricValueCyan}>
                    +{user?.wallet?.totalBinaryEarned?.toFixed(2) || '0.00'} USDT
                  </Text>
                  <Text style={styles.statMetricSub}>
                    {user?.binaryLegs?.pairsCount || 0} cycles (100 USDT / 1000 pairing)
                  </Text>
                </View>
              </View>

              {/* Binary Leg Volume Progress */}
              <View style={styles.pairingVolumeBox}>
                <Text style={styles.pairingVolumeTitle}>CURRENT BINARY PAIRING COUNTER</Text>
                <Text style={styles.pairingVolumeSub}>
                  When Leg A and Leg B both reach 1,000 USDT, 1 pair triggers automatically (+10% / 100 USDT reward).
                </Text>

                <View style={styles.legsProgressRow}>
                  <View style={styles.legProgressItem}>
                    <View style={styles.legHeaderRow}>
                      <Text style={styles.legLabelA}>🌲 LEG A (LEFT WING)</Text>
                      <Text style={styles.legValue}>
                        {user?.binaryLegs?.legACurrent || 0} / 1,000 USDT
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFillA,
                          {
                            width: `${Math.min(
                              100,
                              ((user?.binaryLegs?.legACurrent || 0) % 1000 / 1000) * 100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.legTotalSub}>
                      Total Historical Volume: {user?.binaryLegs?.legATotal || 0} USDT
                    </Text>
                  </View>

                  <View style={styles.legProgressItem}>
                    <View style={styles.legHeaderRow}>
                      <Text style={styles.legLabelB}>⚡ LEG B (RIGHT WING)</Text>
                      <Text style={styles.legValue}>
                        {user?.binaryLegs?.legBCurrent || 0} / 1,000 USDT
                      </Text>
                    </View>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFillB,
                          {
                            width: `${Math.min(
                              100,
                              ((user?.binaryLegs?.legBCurrent || 0) % 1000 / 1000) * 100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.legTotalSub}>
                      Total Historical Volume: {user?.binaryLegs?.legBTotal || 0} USDT
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* TAB 5: PASSWORD & SECURITY */}
          {activeTab === 'security' && (
            <View style={styles.contentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Password & Node Security</Text>
                <Text style={styles.sectionSubtitle}>
                  Keep your mining account and wallet credentials secure with strong credentials.
                </Text>
              </View>

              <View style={styles.securityForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CURRENT PASSWORD *</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#64748B"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>NEW PASSWORD (MIN 6 CHARS) *</Text>
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Text style={styles.showPassToggle}>{showPassword ? 'Hide' : 'Show'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#64748B"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CONFIRM NEW PASSWORD *</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#64748B"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.btnDisabled]}
                  onPress={handleChangePassword}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#0B0E14" />
                  ) : (
                    <Text style={styles.saveBtnText}>🔒 Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.securityStatusBox}>
                <Text style={styles.securityStatusTitle}>NODE SECURITY PROTOCOLS</Text>
                <View style={styles.securityRow}>
                  <Text style={styles.securityCheck}>✅</Text>
                  <Text style={styles.securityText}>PostgreSQL 16 + PostGIS Encrypted Node Storage</Text>
                </View>
                <View style={styles.securityRow}>
                  <Text style={styles.securityCheck}>✅</Text>
                  <Text style={styles.securityText}>Bcrypt Salting on All Cryptographic Passwords</Text>
                </View>
                <View style={styles.securityRow}>
                  <Text style={styles.securityCheck}>✅</Text>
                  <Text style={styles.securityText}>JWT Token Bearer Authentication</Text>
                </View>
              </View>
            </View>
          )}

          {/* Footer Navigation */}
          <View style={styles.footerNav}>
            <TouchableOpacity style={styles.returnDashboardBtn} onPress={() => router.replace('/dashboard' as any)}>
              <Text style={styles.returnDashboardText}>← Return to Mining Dashboard</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  navbar: {
    backgroundColor: '#0F141F',
    borderBottomWidth: 1,
    borderBottomColor: '#1A2233',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  navbarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  backBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btcBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btcBadgeText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0B0E14',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#8A99AD',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navRightMobile: {
    width: '100%',
    justifyContent: 'space-between',
  },
  accountChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  accountChip: {
    backgroundColor: '#182030',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2B374E',
  },
  accountChipActive: {
    borderColor: '#F7931A',
    backgroundColor: '#26282E',
  },
  accountChipText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  adminBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  adminBtnText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  transferBtn: {
    backgroundColor: '#0F1E24',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  transferBtnText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  logoutBtn: {
    backgroundColor: '#2A1820',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
  gotoTransferBtn: {
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  gotoTransferBtnText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '800',
  },
  toastBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  toastError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 14,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 1100,
    alignSelf: 'center',
    width: '100%',
  },
  heroCard: {
    backgroundColor: '#151A23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#263346',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  heroCardMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: 16,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarGlow: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0B0E14',
  },
  heroMeta: {
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroFullName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroUsername: {
    color: '#F7931A',
    fontSize: 13,
    fontWeight: '700',
  },
  heroEmail: {
    color: '#8A99AD',
    fontSize: 11,
  },
  heroRight: {
    flexDirection: 'row',
    gap: 12,
  },
  heroRightMobile: {
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  heroStatBox: {
    backgroundColor: '#0E1420',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1D273B',
    minWidth: 120,
  },
  heroStatLabel: {
    color: '#8A99AD',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroStatValueUsd: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  heroStatValueBtc: {
    color: '#F7931A',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  heroStatValueBonus: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  tabsContainer: {
    marginBottom: 20,
  },
  tabsScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  tabBtn: {
    backgroundColor: '#151A23',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#263346',
  },
  tabBtnActive: {
    backgroundColor: '#F7931A',
    borderColor: '#F7931A',
  },
  tabBtnText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: '#0B0E14',
    fontWeight: '800',
  },
  contentSection: {
    backgroundColor: '#151A23',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#263346',
    padding: 24,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#8A99AD',
    marginTop: 4,
    lineHeight: 18,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  inputGroup: {
    flex: 1,
    minWidth: 240,
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  showPassToggle: {
    fontSize: 11,
    color: '#F7931A',
    fontWeight: '700',
  },
  inputWrapper: {
    backgroundColor: '#0E131C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A384C',
  },
  textareaWrapper: {
    minHeight: 80,
  },
  input: {
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
  },
  textarea: {
    height: 80,
    textAlignVertical: 'top',
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: '#F7931A',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnSmall: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#F7931A',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnSmallText: {
    color: '#F7931A',
    fontSize: 12,
    fontWeight: '800',
  },
  saveBtnText: {
    color: '#0B0E14',
    fontSize: 14,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  payoutCard: {
    backgroundColor: '#0E1420',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#233044',
    padding: 18,
    marginBottom: 18,
  },
  payoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cryptoIconBtc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cryptoIconUsdt: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#26A17B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cryptoIconUsdtErc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#627EEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cryptoIconUsdc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2775CA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkBadgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#26A17B',
    backgroundColor: 'rgba(38, 161, 123, 0.12)',
  },
  networkBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#26A17B',
    letterSpacing: 0.5,
  },
  cryptoIconText: {
    color: '#0B0E14',
    fontSize: 18,
    fontWeight: '900',
  },
  payoutTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  payoutSub: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: 2,
  },
  affiliateHighlightBox: {
    backgroundColor: '#0E1420',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B3B52',
    padding: 18,
    marginBottom: 20,
    gap: 14,
  },
  affiliateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E2A3B',
    paddingBottom: 14,
  },
  affiliateLabel: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  affiliateCode: {
    color: '#F7931A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },
  copyBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyBtnText: {
    color: '#0B0E14',
    fontSize: 12,
    fontWeight: '800',
  },
  affiliateLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  linkTextContainer: {
    flex: 1,
  },
  affiliateLinkLabel: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '700',
  },
  affiliateLinkText: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  copyLinkBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  copyLinkBtnText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '700',
  },
  qrCodeSectionCard: {
    backgroundColor: '#0E1420',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#233044',
    padding: 18,
    marginBottom: 20,
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  qrIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E2A3B',
    borderWidth: 1,
    borderColor: '#00F0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrDisplayRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    backgroundColor: '#080C14',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2A3B',
    padding: 18,
  },
  qrDisplayRowMobile: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  qrFrameCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeCard: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  qrScanTag: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  qrScanTagText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrDetailsCol: {
    flex: 1,
    gap: 10,
    width: '100%',
  },
  qrUrlDetailBox: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#243247',
  },
  qrUrlDetailLabel: {
    color: '#8A99AD',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  qrUrlDetailValue: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  qrMetadataRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qrMetaPill: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  qrMetaPillLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qrMetaPillValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  qrActionButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  qrCopyBtn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F7931A',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCopyBtnText: {
    color: '#0B0E14',
    fontSize: 12,
    fontWeight: '800',
  },
  qrDownloadBtn: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrDownloadBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
  },
  qrHintNote: {
    color: '#64748B',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  preferenceTitle: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  preferenceSub: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 4,
  },
  lineageGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  lineageCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: '#0E1420',
    borderWidth: 1,
    borderColor: '#1E2A3B',
    borderRadius: 10,
    padding: 14,
  },
  lineageLabel: {
    color: '#8A99AD',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  lineageValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  lineageValueGold: {
    color: '#F7931A',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  lineageSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 3,
  },
  statsCardGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  statMetricCard: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#0E1420',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2A3B',
    padding: 16,
  },
  statMetricLabel: {
    color: '#8A99AD',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statMetricValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  statMetricValueBtc: {
    color: '#F7931A',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4,
  },
  statMetricValueGreen: {
    color: '#00E676',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  statMetricValueCyan: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  statMetricSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
  },
  pairingVolumeBox: {
    backgroundColor: '#0E1420',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2A3B',
    padding: 18,
  },
  pairingVolumeTitle: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pairingVolumeSub: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: 3,
    marginBottom: 14,
  },
  legsProgressRow: {
    gap: 14,
  },
  legProgressItem: {
    gap: 6,
  },
  legHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legLabelA: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  legLabelB: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  legValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFillA: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressBarFillB: {
    height: '100%',
    backgroundColor: '#00F0FF',
    borderRadius: 4,
  },
  legTotalSub: {
    color: '#64748B',
    fontSize: 10,
  },
  securityForm: {
    maxWidth: 480,
    marginBottom: 20,
  },
  securityStatusBox: {
    backgroundColor: '#0E1420',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2A3B',
    padding: 16,
    gap: 10,
  },
  securityStatusTitle: {
    color: '#F7931A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  securityCheck: {
    fontSize: 13,
  },
  securityText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  footerNav: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  returnDashboardBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  returnDashboardText: {
    color: '#8A99AD',
    fontSize: 13,
    fontWeight: '700',
  },
  starRankProfileCard: {
    backgroundColor: '#0F1622',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
  },
  starRankProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
    flexWrap: 'wrap',
    gap: 10,
  },
  starRankProfileTitle: {
    color: '#FFD700',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  starRankProfileSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  starRankDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  starRankDetailItem: {
    flex: 1,
    minWidth: 120,
    backgroundColor: 'rgba(11, 15, 23, 0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2A3B',
    padding: 10,
  },
  starRankDetailLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  starRankDetailValGold: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  starRankDetailValCyan: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  starRankDetailValRed: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  starRankDetailSub: {
    color: '#8A99AD',
    fontSize: 10,
    marginTop: 2,
  },
  // KYC Specific Styles
  kycStatusBadgeVerified: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  kycStatusBadgeTextVerified: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kycStatusBadgePending: {
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderWidth: 1,
    borderColor: '#F7931A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  kycStatusBadgeTextPending: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kycStatusBadgeRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  kycStatusBadgeTextRejected: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kycStatusBadgeUnverified: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderWidth: 1,
    borderColor: '#64748B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  kycStatusBadgeTextUnverified: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  kycNoticeCardVerified: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  kycNoticeTitleVerified: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  kycNoticeCardPending: {
    backgroundColor: 'rgba(247, 147, 26, 0.08)',
    borderWidth: 1,
    borderColor: '#F7931A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  kycNoticeTitlePending: {
    color: '#F7931A',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  kycNoticeCardRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  kycNoticeTitleRejected: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  kycNoticeCardInfo: {
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  kycNoticeTitleInfo: {
    color: '#00F0FF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  kycNoticeSub: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
  },
  kycMetaText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 8,
    fontWeight: '600',
  },
  kycFormCard: {
    backgroundColor: '#151A23',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#263346',
    padding: 20,
    marginBottom: 20,
  },
  kycSectionHeading: {
    color: '#F7931A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  kycDocTypeGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  kycDocTypeBtn: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#0B0F17',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  kycDocTypeBtnActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  kycDocTypeIcon: {
    fontSize: 24,
  },
  kycDocTypeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  kycDocTypeTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  kycUploadSubtext: {
    color: '#8A99AD',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 16,
  },
  kycUploadGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  kycUploadBox: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#0B0F17',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
  },
  kycUploadTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  kycUploadHint: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 14,
  },
  kycDropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#334155',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  kycDropzoneIcon: {
    fontSize: 28,
  },
  kycDropzoneLabel: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  kycDropzoneSub: {
    color: '#64748B',
    fontSize: 10,
    textAlign: 'center',
  },
  kycPreviewContainer: {
    alignItems: 'center',
    gap: 10,
  },
  kycNativePreviewBox: {
    width: '100%',
    height: 120,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycPreviewReadyText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 13,
  },
  kycChangePhotoBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  kycChangePhotoText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  kycGuaranteeCard: {
    backgroundColor: 'rgba(11, 15, 23, 0.6)',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 18,
    gap: 8,
  },
  kycGuaranteeTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  kycGuaranteeItem: {
    color: '#8A99AD',
    fontSize: 11,
    lineHeight: 16,
  },
});
