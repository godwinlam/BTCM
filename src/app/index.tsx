import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { MineBestHomeScreen } from '@/components/MineBestHomeScreen';
import { StarRankIndicator } from '@/components/StarRankIndicator';
import { LanguageSelector } from '@/components/LanguageSelector';
import { useIsMobile } from '@/hooks/useIsMobile';
import { setAppLanguage } from '@/i18n';

export default function MainHomePage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [btcPrice, setBtcPrice] = useState<number>(78300);
  const [btcChange24h, setBtcChange24h] = useState<number>(1.5);

  useEffect(() => {
    checkCurrentUser();
    loadLiveBtcPrice();
    const interval = setInterval(loadLiveBtcPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLiveBtcPrice = async () => {
    try {
      const data = await api.getBtcPrice();
      if (data && data.price) {
        setBtcPrice(data.price);
        setBtcChange24h(data.change24h);
      }
    } catch (e) {
      // ignore
    }
  };

  const checkCurrentUser = async () => {
    if (api.getToken()) {
      try {
        const res = await api.getMe();
        if (res?.user) {
          setUser(res.user);
          if (res.user.preferredLanguage) {
            setAppLanguage(res.user.preferredLanguage).catch(() => {});
          }
        } else {
          api.setToken(null);
          setUser(null);
        }
      } catch (e) {
        api.setToken(null);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoadingUser(false);
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <View style={styles.container}>
      {/* 1. TOP MAIN HEADER */}
      <View style={[styles.topHeader, isMobile && styles.topHeaderMobile]}>
        {isMobile ? (
          /* MOBILE HEADER LAYOUT (Clean Non-Overlapping Multi-Row) */
          <View style={styles.mobileHeaderWrap}>
            {/* Row 1: Brand & Sign Out / Auth */}
            <View style={styles.mobileHeaderRow1}>
              <View style={styles.brandRow}>
                <View style={styles.btcLogoGlow}>
                  <Text style={styles.btcLogoChar}>₿</Text>
                </View>
                <View>
                  <Text style={styles.brandTitleMobile}>{t('common.appName')}</Text>
                  <Text style={styles.brandSubtitleMobile}>{t('common.industrialInfra')}</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LanguageSelector compact />
                {user ? (
                  <TouchableOpacity style={styles.mobileSignOutBtn} onPress={handleLogout}>
                    <Text style={styles.mobileSignOutBtnText}>{t('common.logout')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.mobileSignInBtn}
                      onPress={() => router.push('/login' as any)}
                    >
                      <Text style={styles.mobileSignInBtnText}>{t('common.login')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.mobileSignUpBtn}
                      onPress={() => router.push('/register' as any)}
                    >
                      <Text style={styles.mobileSignUpBtnText}>{t('common.register')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Row 2: Live BTC Price Ticker & User Profile Badge */}
            <View style={styles.mobileHeaderRow2}>
              <View style={styles.mobileMarketPill}>
                <View style={styles.liveDot} />
                <Text style={styles.marketLabel}>BTC/USDT</Text>
                <Text style={styles.marketValue}>{btcPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                <Text style={btcChange24h >= 0 ? styles.marketUp : styles.marketDown}>
                  {btcChange24h >= 0 ? `+${btcChange24h.toFixed(1)}%` : `${btcChange24h.toFixed(1)}%`}
                </Text>
              </View>

              {user && (
                <TouchableOpacity
                  style={styles.mobileProfileBadgeBtn}
                  onPress={() => router.push('/profile' as any)}
                >
                  <Text style={styles.profileBadgeText}>👤 @{user.username}</Text>
                  {Boolean(user.starRank && user.starRank >= 1) && (
                    <StarRankIndicator
                      rank={user.starRank}
                      badge={`${user.starRank}★`}
                      size="xs"
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Row 3: Open Dashboard Button (If logged in) */}
            {user && (
              <TouchableOpacity
                style={styles.mobileOpenDashboardBtn}
                onPress={() => router.push('/dashboard' as any)}
              >
                <Text style={styles.mobileOpenDashboardBtnText}>🚀 {t('common.dashboard')} ➔</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* DESKTOP HEADER LAYOUT */
          <View style={styles.headerPrimaryRow}>
            {/* Brand Logo */}
            <View style={styles.brandRow}>
              <View style={styles.btcLogoGlow}>
                <Text style={styles.btcLogoChar}>₿</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>{t('common.appName')}</Text>
                <Text style={styles.brandSubtitle}>{t('common.industrialInfra')}</Text>
              </View>
            </View>

            {/* Right Header Navigation & Actions */}
            <View style={styles.headerRightActions}>
              <LanguageSelector />

              {/* Live Bitcoin Market Ticker */}
              <View style={styles.marketPill}>
                <View style={styles.liveDot} />
                <Text style={styles.marketLabel}>BTC/USDT</Text>
                <Text style={styles.marketValue}>{btcPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                <Text style={btcChange24h >= 0 ? styles.marketUp : styles.marketDown}>
                  {btcChange24h >= 0 ? `+${btcChange24h.toFixed(1)}%` : `${btcChange24h.toFixed(1)}%`}
                </Text>
              </View>

              {/* Auth Buttons / Dashboard Launch */}
              {user ? (
                <View style={styles.userActionsRow}>
                  <TouchableOpacity
                    style={styles.profileBadgeBtn}
                    onPress={() => router.push('/profile' as any)}
                  >
                    <Text style={styles.profileBadgeText}>👤 @{user.username}</Text>
                    {Boolean(user.starRank && user.starRank >= 1) && (
                      <StarRankIndicator
                        rank={user.starRank}
                        badge={`${user.starRank}★`}
                        size="xs"
                      />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.openDashboardBtn}
                    onPress={() => router.push('/dashboard' as any)}
                  >
                    <Text style={styles.openDashboardBtnText}>🚀 {t('common.dashboard')} ➔</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
                    <Text style={styles.signOutBtnText}>{t('common.logout')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.guestActionsRow}>
                  <TouchableOpacity
                    style={styles.signInBtn}
                    onPress={() => router.push('/login' as any)}
                  >
                    <Text style={styles.signInBtnText}>⚡ {t('common.login')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.signUpBtn}
                    onPress={() => router.push('/register' as any)}
                  >
                    <Text style={styles.signUpBtnText}>🚀 {t('common.register')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* 2. INDEPENDENT MINEBEST HOME PRESENTATION */}
      <View style={styles.mainContent}>
        <MineBestHomeScreen
          onNavigateTab={(tab) => {
            router.push('/dashboard' as any);
          }}
          onSignUp={() => router.push('/register' as any)}
          onSignIn={() => router.push('/login' as any)}
          currentUser={user}
          isLoggedIn={!!user}
          btcPriceUsd={btcPrice}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
  mainContent: {
    flex: 1,
  },
  topHeader: {
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  topHeaderMobile: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Mobile Dedicated Header Styles
  mobileHeaderWrap: {
    width: '100%',
    gap: 10,
  },
  mobileHeaderRow1: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitleMobile: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSubtitleMobile: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '700',
  },
  mobileSignOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mobileSignOutBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  mobileSignInBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mobileSignInBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  mobileSignUpBtn: {
    backgroundColor: '#00E676',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mobileSignUpBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
  },
  mobileHeaderRow2: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mobileMarketPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mobileProfileBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(247, 147, 26, 0.12)',
    borderColor: 'rgba(247, 147, 26, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mobileOpenDashboardBtn: {
    width: '100%',
    backgroundColor: '#00E676',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E676',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mobileOpenDashboardBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  headerPrimaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerPrimaryRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandRowMobile: {
    width: '100%',
  },
  btcLogoGlow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F7931A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F7931A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  btcLogoChar: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000000',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 11,
    color: '#38BDF8',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  headerRightActionsMobile: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  marketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  marketPillMobile: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  marketLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '800',
  },
  marketValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  marketUp: {
    fontSize: 11,
    color: '#00E676',
    fontWeight: '800',
  },
  marketDown: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '800',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  userActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userActionsRowMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  profileBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(247, 147, 26, 0.12)',
    borderColor: 'rgba(247, 147, 26, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileBadgeBtnMobile: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  profileBadgeText: {
    color: '#F7931A',
    fontSize: 12,
    fontWeight: '800',
  },
  openDashboardBtn: {
    backgroundColor: '#00E676',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openDashboardBtnMobile: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  openDashboardBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  signOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signOutBtnMobile: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  signOutBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  guestActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guestActionsRowMobile: {
    flexDirection: 'row',
    gap: 6,
  },
  signInBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signInBtnMobile: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signInBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
  signUpBtn: {
    backgroundColor: '#00E676',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  signUpBtnMobile: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signUpBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },
});
