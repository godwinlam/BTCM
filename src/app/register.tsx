import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LanguageSelector } from '@/components/LanguageSelector';

export default function SignUpScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ ref?: string; parent?: string; positionParent?: string }>();
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Binary MLM Referral details
  const [referralCode, setReferralCode] = useState(searchParams.ref ? String(searchParams.ref).toUpperCase() : '');
  const [placementUsername, setPlacementUsername] = useState(searchParams.parent ? String(searchParams.parent) : '');
  const [positionParent, setPositionParent] = useState(searchParams.positionParent ? String(searchParams.positionParent) : '');

  const [activeLoggedInUser, setActiveLoggedInUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let qRef = searchParams.ref ? String(searchParams.ref) : '';
    let qParent = searchParams.parent ? String(searchParams.parent) : '';
    let qPositionParent = searchParams.positionParent ? String(searchParams.positionParent) : '';

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      if (!qRef && urlParams.get('ref')) qRef = urlParams.get('ref') || '';
      if (!qParent && urlParams.get('parent')) qParent = urlParams.get('parent') || '';
      if (!qPositionParent && urlParams.get('positionParent')) qPositionParent = urlParams.get('positionParent') || '';
    }

    if (qRef) setReferralCode(qRef.toUpperCase());
    if (qParent) setPlacementUsername(qParent);
    if (qPositionParent) setPositionParent(qPositionParent);

    const checkActiveSponsor = async () => {
      try {
        if (api.getToken()) {
          const res = await api.getMe();
          if (res?.user) {
            setActiveLoggedInUser(res.user);
            if (!qRef && res.user.referralCode) {
              setReferralCode(res.user.referralCode);
            }
            if (!qParent && res.user.username) {
              setPlacementUsername(res.user.username);
            }
          }
        }
      } catch (e) {
        // guest mode
      }
    };
    checkActiveSponsor();
  }, [searchParams.ref, searchParams.parent, searchParams.positionParent]);

  const handleRegister = async () => {
    // Basic validations
    if (!username.trim() || !email.trim() || !password) {
      setErrorMessage(t('register.errors.requiredFields'));
      return;
    }

    if (username.trim().length < 3) {
      setErrorMessage(t('register.errors.usernameMinLength'));
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage(t('register.errors.invalidEmail'));
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t('register.errors.passwordMinLength'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('register.errors.passwordsDoNotMatch'));
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const currentToken = api.getToken();
      const isAlreadyLoggedIn = Boolean(currentToken);

      const targetPlacement = (positionParent || placementUsername).trim();
      const res = await api.register(
        {
          fullName: fullName.trim() || username.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          preferredLanguage: i18n.language || 'en',
          referralCode: referralCode.trim() || undefined,
          placementUsername: targetPlacement || undefined,
          positionParent: positionParent ? positionParent.trim() : undefined,
        },
        { keepCurrentSession: isAlreadyLoggedIn }
      );

      // Extra safeguard: preserve active login user token
      if (isAlreadyLoggedIn && currentToken) {
        api.setToken(currentToken);
      }

      if (res.token || res.user) {
        if (isAlreadyLoggedIn) {
          setSuccessMessage(
            t('register.success.downlineCreated', { username: username.trim() })
          );
        } else {
          setSuccessMessage(
            t('register.success.accountCreated')
          );
        }
        setTimeout(() => {
          router.replace('/dashboard' as any);
        }, 1200);
      } else {
        throw new Error(res.message || 'Registration failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || t('register.errors.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
            <LanguageSelector compact />
          </View>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.logoBadge}>
            <Text style={styles.logoChar}>₿</Text>
          </TouchableOpacity>
          <Text style={styles.brandTitle}>{t('common.appName')}</Text>
          <Text style={styles.brandSubtitle}>{t('auth.welcomeSub')}</Text>
        </View>

        {/* Sign Up Card */}
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {activeLoggedInUser ? t('register.title') : t('register.createAccount')}
            </Text>
          </View>

          {/* Feedback banners */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {successMessage && (
            <View style={styles.successBox}>
              <Text style={styles.successText}>✅ {successMessage}</Text>
            </View>
          )}

          {/* Section 1: Basic Info */}
          <Text style={styles.sectionDivider}>{t('register.personalCredentials')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('register.fullNameLabel')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder={t('register.fullNamePlaceholder')}
                placeholderTextColor="#64748B"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputFlex]}>
              <Text style={styles.label}>{t('register.usernameLabel')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t('register.usernamePlaceholder')}
                  placeholderTextColor="#64748B"
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val.toLowerCase());
                    setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.inputFlex]}>
              <Text style={styles.label}>{t('register.emailLabel')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t('register.emailPlaceholder')}
                  placeholderTextColor="#64748B"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrorMessage(null);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.inputFlex]}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>{t('register.passwordLabel')}</Text>
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.showPassToggle}>
                    {showPassword ? t('register.hide') : t('register.show')}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t('register.passwordPlaceholder')}
                  placeholderTextColor="#64748B"
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, styles.inputFlex]}>
              <Text style={styles.label}>{t('register.confirmPasswordLabel')}</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={t('register.confirmPasswordPlaceholder')}
                  placeholderTextColor="#64748B"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    setErrorMessage(null);
                  }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          {/* Section 2: Sponsor & Referral Details */}
          <Text style={styles.sectionDivider}>{t('register.sponsorDetails')}</Text>

          {(!!referralCode || !!placementUsername) && (
            <View style={styles.autoFilledNoticeBanner}>
              <Text style={styles.autoFilledNoticeIcon}>🤝</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.autoFilledNoticeTitle}>{t('register.sponsorInvitationDetected')}</Text>
                <Text style={styles.autoFilledNoticeText}>
                  {placementUsername ? (
                    <>{t('register.sponsorBy')} <Text style={styles.autoFilledBold}>@{placementUsername}</Text></>
                  ) : null}
                  {referralCode ? (
                    <>{placementUsername ? ' • ' : ''}{t('register.referralCode')} <Text style={styles.autoFilledBold}>{referralCode}</Text></>
                  ) : null}
                  {t('register.joiningDirectTeam')}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.labelRowWithBadge}>
              <Text style={styles.label}>{t('register.sponsorReferralCodeLabel')}</Text>
              {!!referralCode && (
                <View style={styles.autoFilledBadge}>
                  <Text style={styles.autoFilledBadgeText}>{t('register.currentLoginUser')}</Text>
                </View>
              )}
            </View>
            <View style={[styles.inputWrapper, !!referralCode && styles.inputWrapperFilled]}>
              <TextInput
                style={styles.input}
                placeholder={t('register.referralCodePlaceholder')}
                placeholderTextColor="#64748B"
                value={referralCode}
                onChangeText={(val) => setReferralCode(val.toUpperCase())}
                autoCapitalize="characters"
              />
            </View>
            <Text style={styles.fieldHint}>
              {t('register.directRewardHint')}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRowWithBadge}>
              <Text style={styles.label}>{t('register.specificPlacementParentLabel')}</Text>
              {!!placementUsername && (
                <View style={styles.autoFilledBadge}>
                  <Text style={styles.autoFilledBadgeText}>{t('register.currentLoginUser')}</Text>
                </View>
              )}
            </View>
            <View style={[styles.inputWrapper, !!placementUsername && styles.inputWrapperFilled]}>
              <TextInput
                style={styles.input}
                placeholder={t('register.placementPlaceholder')}
                placeholderTextColor="#64748B"
                value={placementUsername}
                onChangeText={setPlacementUsername}
                autoCapitalize="none"
              />
            </View>
            <Text style={styles.fieldHint}>
              {t('register.placementParentHint', { parent: placementUsername || 'root' })}
            </Text>
          </View>

          {/* Placement Notice Banner */}
          <View style={styles.placementRuleBox}>
            <Text style={styles.placementRuleTitle}>
              {t('register.placementRequirementTitle')}
            </Text>
            <Text style={styles.placementRuleText}>
              {t('register.placementRequirementText')}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0B0E14" />
            ) : (
              <Text style={styles.submitBtnText}>
                {activeLoggedInUser
                  ? t('register.createDownlineBtn')
                  : t('register.createAccountBtn')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Links */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerPrompt}>{t('register.alreadyHaveAccount')}</Text>
            <TouchableOpacity
              style={styles.loginLinkBtn}
              onPress={() => router.push('/login' as any)}
            >
              <Text style={styles.loginLinkText}>{t('register.signInExisting')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLinkBtn}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.backLinkText}>{t('register.returnHome')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustFooter}>
          <Text style={styles.trustText}>
            {t('register.trustFooter')}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#F7931A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  logoChar: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0B0E14',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    letterSpacing: 1,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 580,
    backgroundColor: '#151A23',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#263346',
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  cardMobile: {
    padding: 20,
    borderRadius: 16,
  },
  cardHeader: {
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 6,
    lineHeight: 19,
  },
  sectionDivider: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F7931A',
    letterSpacing: 1.2,
    marginTop: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#263346',
    paddingBottom: 6,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 12,
    marginBottom: 18,
  },
  successText: {
    color: '#6EE7B7',
    fontSize: 13,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  inputFlex: {
    flex: 1,
    minWidth: 220,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  showPassToggle: {
    fontSize: 12,
    color: '#F7931A',
    fontWeight: '700',
  },
  inputWrapper: {
    backgroundColor: '#0E131C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A384C',
  },
  input: {
    color: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
  },
  fieldHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
    lineHeight: 16,
  },
  placementRuleBox: {
    backgroundColor: 'rgba(247, 147, 26, 0.08)',
    borderColor: 'rgba(247, 147, 26, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  placementRuleTitle: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  placementRuleText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  submitBtn: {
    backgroundColor: '#F7931A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#F7931A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#0B0E14',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardFooter: {
    marginTop: 26,
    alignItems: 'center',
    gap: 12,
  },
  footerPrompt: {
    fontSize: 13,
    color: '#94A3B8',
  },
  loginLinkBtn: {
    paddingVertical: 6,
  },
  loginLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00F0FF',
  },
  backLinkBtn: {
    paddingVertical: 6,
    marginTop: 4,
  },
  backLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  trustFooter: {
    marginTop: 24,
    paddingHorizontal: 20,
    maxWidth: 500,
  },
  trustText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 16,
  },
  autoFilledNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.35)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  autoFilledNoticeIcon: {
    fontSize: 20,
  },
  autoFilledNoticeTitle: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  autoFilledNoticeText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  autoFilledBold: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  labelRowWithBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  autoFilledBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  autoFilledBadgeText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  inputWrapperFilled: {
    borderColor: '#F7931A',
    backgroundColor: '#121A28',
  },
});
