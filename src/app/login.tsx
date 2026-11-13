import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { useIsMobile } from '@/hooks/useIsMobile';
import { LanguageSelector } from '@/components/LanguageSelector';
import { setAppLanguage } from '@/i18n';

export default function SignInScreen() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (idToUse?: string, passToUse?: string) => {
    const id = (idToUse ?? loginId).trim();
    const pass = passToUse ?? password;

    if (!id || !pass) {
      setErrorMessage(t('auth.usernameOrEmail') + ' & ' + t('auth.password') + ' ' + t('common.error'));
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await api.login(id, pass);
      if (res.token) {
        if (res.user?.preferredLanguage) {
          setAppLanguage(res.user.preferredLanguage).catch(() => {});
        }
        setSuccessMessage(`Welcome back, ${res.user?.fullName || res.user?.username || 'Miner'}! Redirecting...`);
        setTimeout(() => {
          router.replace('/dashboard' as any);
        }, 800);
      } else {
        throw new Error(res.message || 'Login failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials or server unreachable.');
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

        {/* Sign In Card */}
        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('auth.signInTab')}</Text>
            <Text style={styles.cardSubtitle}>
              {t('auth.welcomeTitle')}
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

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('auth.usernameOrEmail')}</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="e.g. godwin_miner or user@example.com"
                placeholderTextColor="#64748B"
                value={loginId}
                onChangeText={(val) => {
                  setLoginId(val);
                  setErrorMessage(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('auth.password')}</Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showPassToggle}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
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

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={() => handleLogin()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0B0E14" />
            ) : (
              <Text style={styles.submitBtnText}>{t('auth.signInBtn')} ⚡</Text>
            )}
          </TouchableOpacity>

          {/* Links */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerPrompt}>{t('auth.needAccount')}</Text>
            <TouchableOpacity
              style={styles.registerLinkBtn}
              onPress={() => router.push('/register' as any)}
            >
              <Text style={styles.registerLinkText}>{t('auth.createAccountTab')} →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLinkBtn}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.backLinkText}>← {t('common.appName')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustFooter}>
          <Text style={styles.trustText}>
            🔒 End-to-End Encrypted Node Access • MineBest Infrastructure • 1,500 Days Max ROI Lifecycle
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
    maxWidth: 480,
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
    marginBottom: 24,
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
  inputGroup: {
    marginBottom: 18,
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
  submitBtn: {
    backgroundColor: '#F7931A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
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
  demoSection: {
    marginTop: 24,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#222C3D',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F7931A',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  demoChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  demoChipText: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '700',
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
  registerLinkBtn: {
    paddingVertical: 6,
  },
  registerLinkText: {
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
});
