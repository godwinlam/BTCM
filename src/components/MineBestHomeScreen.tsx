import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/useIsMobile';

const DatacenterImg = require('../../assets/images/facility_datacenter.jpg');
const AsicHardwareImg = require('../../assets/images/asic_hardware.jpg');
const PowerInfraImg = require('../../assets/images/power_infrastructure.jpg');

interface MineBestHomeScreenProps {
  onNavigateTab: (tab: 'home' | 'packages' | 'binary' | 'referrals' | 'contracts') => void;
  onSignUp?: () => void;
  onSignIn?: () => void;
  currentUser?: any;
  isLoggedIn?: boolean;
  btcPriceUsd?: number;
}

interface MiningPlan {
  tier: number;
  name: string;
  badge: string;
  ths: number;
  dailyBtc: number;
  hardware: string;
  popular?: boolean;
}

const MINING_PLANS: MiningPlan[] = [
  { tier: 100, name: 'Starter', badge: 'BEGINNER', ths: 5.5, dailyBtc: 0.00000103, hardware: 'Antminer S19 Node' },
  { tier: 300, name: 'Standard', badge: 'POPULAR', ths: 17.5, dailyBtc: 0.00000305, hardware: 'WhatsMiner M30S Rig' },
  { tier: 1000, name: 'Bronze', badge: 'PRO MINER', ths: 60.0, dailyBtc: 0.00003633, hardware: 'Dedicated ASIC Pod', popular: true },
  { tier: 5000, name: 'Silver', badge: 'ENTERPRISE', ths: 310.0, dailyBtc: 0.0001795, hardware: 'Industrial ASIC Rack' },
  { tier: 10000, name: 'Gold', badge: 'VIP NODE', ths: 640.0, dailyBtc: 0.0003615, hardware: 'Container Sub-Cluster' },
  { tier: 30000, name: 'Platinum', badge: 'MEGA FARM', ths: 2000.0, dailyBtc: 0.0010775, hardware: 'Full 40ft Smart Container' },
];

export const MineBestHomeScreen: React.FC<MineBestHomeScreenProps> = ({
  onNavigateTab,
  onSignUp,
  onSignIn,
  currentUser,
  isLoggedIn = false,
  btcPriceUsd = 82420,
}) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const [selectedPlanTier, setSelectedPlanTier] = useState<number>(1000);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedPlan = MINING_PLANS.find((p) => p.tier === selectedPlanTier) || MINING_PLANS[2];
  const dailyYieldUsd = selectedPlan.dailyBtc * btcPriceUsd;
  const totalBtc1500 = selectedPlan.dailyBtc * 1500;
  const totalUsd1500 = totalBtc1500 * btcPriceUsd;

  const faqs = [
    {
      q: t('home.faqQ1'),
      a: t('home.faqA1'),
    },
    {
      q: t('home.faqQ2'),
      a: t('home.faqA2'),
    },
    {
      q: t('home.faqQ3'),
      a: t('home.faqA3'),
    },
    {
      q: t('home.faqQ4'),
      a: t('home.faqA4'),
    },
    {
      q: t('home.faqQ5'),
      a: t('home.faqA5'),
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. HERO SECTION */}
      <View style={[styles.heroSection, isMobile && styles.heroSectionMobile]}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>{t('home.badge')}</Text>
          </View>
          <View style={styles.heroPillGreen}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.heroPillGreenText}>{t('home.uptime')}</Text>
          </View>
        </View>

        <Text style={[styles.heroHeadline, isMobile && styles.heroHeadlineMobile]}>
          {t('home.heroHeadline')}{'\n'}
          <Text style={styles.heroHighlight}>{t('home.heroHighlight')}</Text>
        </Text>

        <Text style={styles.heroSubhead}>
          {t('home.heroSubhead')}
        </Text>

        {/* Hero Action Buttons */}
        <View style={[styles.heroCtaRow, isMobile && styles.heroCtaRowMobile]}>
          {isLoggedIn ? (
            <TouchableOpacity
              style={styles.ctaPrimaryBtn}
              onPress={() => onNavigateTab('packages')}
            >
              <Text style={styles.ctaPrimaryBtnText}>{t('home.openDashboard')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.ctaPrimaryBtn}
                onPress={onSignUp}
              >
                <Text style={styles.ctaPrimaryBtnText}>{t('home.createAccount')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaSecondaryBtn}
                onPress={onSignIn}
              >
                <Text style={styles.ctaSecondaryBtnText}>{t('home.memberSignIn')}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.ctaOutlineBtn}
            onPress={() => onNavigateTab('packages')}
          >
            <Text style={styles.ctaOutlineBtnText}>{t('home.viewPackages')}</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Trust Proof Numbers */}
        <View style={[styles.heroTrustGrid, isMobile && styles.heroTrustGridMobile]}>
          <View style={styles.trustItem}>
            <Text style={styles.trustVal}>{t('home.trustDays')}</Text>
            <Text style={styles.trustLabel}>{t('home.trustDaysLabel')}</Text>
          </View>
          <View style={[styles.trustDivider, isMobile && styles.trustDividerMobile]} />
          <View style={styles.trustItem}>
            <Text style={styles.trustVal}>{t('home.trustMw')}</Text>
            <Text style={styles.trustLabel}>{t('home.trustMwLabel')}</Text>
          </View>
          <View style={[styles.trustDivider, isMobile && styles.trustDividerMobile]} />
          <View style={styles.trustItem}>
            <Text style={styles.trustVal}>{t('home.trustHash')}</Text>
            <Text style={styles.trustLabel}>{t('home.trustHashLabel')}</Text>
          </View>
          <View style={[styles.trustDivider, isMobile && styles.trustDividerMobile]} />
          <View style={styles.trustItem}>
            <Text style={styles.trustVal}>{t('home.trustRewards')}</Text>
            <Text style={styles.trustLabel}>{t('home.trustRewardsLabel')}</Text>
          </View>
        </View>

        {/* Hero Interactive Facility Visual Banner */}
        <View style={[styles.heroFacilityBanner, isMobile && styles.heroFacilityBannerMobile]}>
          <Image source={DatacenterImg} style={styles.heroBannerImage} resizeMode="cover" />
          <View style={styles.heroBannerOverlay}>
            <View style={[styles.heroBannerTopRow, isMobile && styles.heroBannerTopRowMobile]}>
              <View style={styles.heroBannerPill}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.heroBannerPillText}>{t('home.liveInfra')}</Text>
              </View>
              <Text style={styles.heroBannerCoord}>{t('home.coord')}</Text>
            </View>
            <View style={[styles.heroBannerBottomRow, isMobile && styles.heroBannerBottomRowMobile]}>
              <View style={styles.heroBannerBottomLeft}>
                <Text style={styles.heroBannerTitle}>{t('home.clusterTitle')}</Text>
                <Text style={styles.heroBannerSubtitle}>{t('home.clusterSubtitle')}</Text>
              </View>
              <TouchableOpacity style={styles.heroBannerBtn} onPress={() => onNavigateTab('packages')}>
                <Text style={styles.heroBannerBtnText}>{t('home.exploreHardware')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 2. HOW IT WORKS (3 SIMPLE STEPS) */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.sectionHeadingBox}>
          <Text style={styles.sectionOverline}>{t('home.howItWorksOverline')}</Text>
          <Text style={styles.sectionTitle}>{t('home.howItWorksTitle')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('home.howItWorksSubtitle')}
          </Text>
        </View>

        <View style={[styles.stepsGrid, isMobile && styles.stepsGridMobile]}>
          <View style={[styles.stepCard, isMobile && styles.stepCardMobile]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{t('home.step1Badge')}</Text>
            </View>
            <View style={styles.stepIconBubble}>
              <Text style={{ fontSize: 28 }}>📦</Text>
            </View>
            <Text style={styles.stepCardTitle}>{t('home.step1Title')}</Text>
            <Text style={styles.stepCardText}>
              {t('home.step1Desc')}
            </Text>
          </View>

          <View style={[styles.stepCard, isMobile && styles.stepCardMobile]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{t('home.step2Badge')}</Text>
            </View>
            <View style={[styles.stepIconBubble, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Text style={{ fontSize: 28 }}>⚙️</Text>
            </View>
            <Text style={styles.stepCardTitle}>{t('home.step2Title')}</Text>
            <Text style={styles.stepCardText}>
              {t('home.step2Desc')}
            </Text>
          </View>

          <View style={[styles.stepCard, isMobile && styles.stepCardMobile]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{t('home.step3Badge')}</Text>
            </View>
            <View style={[styles.stepIconBubble, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
              <Text style={{ fontSize: 28 }}>💰</Text>
            </View>
            <Text style={styles.stepCardTitle}>{t('home.step3Title')}</Text>
            <Text style={styles.stepCardText}>
              {t('home.step3Desc')}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. KEY PROJECT FEATURES (FRIENDLY 4-GRID) */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.sectionHeadingBox}>
          <Text style={styles.sectionOverline}>{t('home.whyChooseOverline')}</Text>
          <Text style={styles.sectionTitle}>{t('home.whyChooseTitle')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('home.whyChooseSubtitle')}
          </Text>
        </View>

        <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
          <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
            <View style={styles.featureIconBox}>
              <Text style={{ fontSize: 26 }}>⚡</Text>
            </View>
            <Text style={styles.featureTitle}>{t('home.feat1Title')}</Text>
            <Text style={styles.featureDesc}>
              {t('home.feat1Desc')}
            </Text>
          </View>

          <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(247, 147, 26, 0.15)' }]}>
              <Text style={{ fontSize: 26 }}>🛡️</Text>
            </View>
            <Text style={styles.featureTitle}>{t('home.feat2Title')}</Text>
            <Text style={styles.featureDesc}>
              {t('home.feat2Desc')}
            </Text>
          </View>

          <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
              <Text style={{ fontSize: 26 }}>🤝</Text>
            </View>
            <Text style={styles.featureTitle}>{t('home.feat3Title')}</Text>
            <Text style={styles.featureDesc}>
              {t('home.feat3Desc')}
            </Text>
          </View>

          <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Text style={{ fontSize: 26 }}>🌲</Text>
            </View>
            <Text style={styles.featureTitle}>{t('home.feat4Title')}</Text>
            <Text style={styles.featureDesc}>
              {t('home.feat4Desc')}
            </Text>
          </View>
        </View>
      </View>

      {/* 4. INDUSTRIAL EQUIPMENT & FACILITY SHOWCASE */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.sectionHeadingBox}>
          <Text style={styles.sectionOverline}>{t('home.infraOverline')}</Text>
          <Text style={styles.sectionTitle}>{t('home.infraTitle')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('home.infraSubtitle')}
          </Text>
        </View>

        <View style={[styles.imageryGrid, isMobile && styles.imageryGridMobile]}>
          {/* Card 1: Data Center Aisles */}
          <View style={[styles.imageCard, isMobile && styles.imageCardMobile]}>
            <View style={styles.imageFrame}>
              <Image source={DatacenterImg} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.imageOverlayBadge}>
                <Text style={styles.imageBadgeText}>{t('home.card1Badge')}</Text>
              </View>
              <View style={styles.imageStatusPill}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.imageStatusText}>{t('home.card1Status')}</Text>
              </View>
            </View>
            <View style={styles.imageCardBody}>
              <Text style={styles.imageCardTitle}>{t('home.card1Title')}</Text>
              <Text style={styles.imageCardDesc}>
                {t('home.card1Desc')}
              </Text>
              <View style={styles.specChipsRow}>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card1Tag1')}</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card1Tag2')}</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card1Tag3')}</Text></View>
              </View>
            </View>
          </View>

          {/* Card 2: ASIC Equipment */}
          <View style={[styles.imageCard, isMobile && styles.imageCardMobile]}>
            <View style={styles.imageFrame}>
              <Image source={AsicHardwareImg} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.imageOverlayBadge}>
                <Text style={styles.imageBadgeText}>{t('home.card2Badge')}</Text>
              </View>
              <View style={[styles.imageStatusPill, { backgroundColor: 'rgba(247, 147, 26, 0.85)' }]}>
                <Text style={styles.imageStatusText}>{t('home.card2Status')}</Text>
              </View>
            </View>
            <View style={styles.imageCardBody}>
              <Text style={styles.imageCardTitle}>{t('home.card2Title')}</Text>
              <Text style={styles.imageCardDesc}>
                {t('home.card2Desc')}
              </Text>
              <View style={styles.specChipsRow}>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card2Tag1')}</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card2Tag2')}</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card2Tag3')}</Text></View>
              </View>
            </View>
          </View>

          {/* Card 3: Power Substation */}
          <View style={[styles.imageCard, isMobile && styles.imageCardMobile]}>
            <View style={styles.imageFrame}>
              <Image source={PowerInfraImg} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.imageOverlayBadge}>
                <Text style={styles.imageBadgeText}>{t('home.card3Badge')}</Text>
              </View>
              <View style={[styles.imageStatusPill, { backgroundColor: 'rgba(56, 189, 248, 0.85)' }]}>
                <Text style={styles.imageStatusText}>{t('home.card3Status')}</Text>
              </View>
            </View>
            <View style={styles.imageCardBody}>
              <Text style={styles.imageCardTitle}>{t('home.card3Title')}</Text>
              <Text style={styles.imageCardDesc}>
                {t('home.card3Desc')}
              </Text>
              <View style={styles.specChipsRow}>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card3Tag1')}</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card3Tag2')}</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>{t('home.card3Tag3')}</Text></View>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 5. COMPANY BACKGROUND: THE MINEBEST STORY */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={[styles.companyCard, isMobile && styles.companyCardMobile]}>
          <View style={styles.companyLeft}>
            <View style={styles.companyTagRow}>
              <Text style={styles.companyTag}>{t('home.aboutTag')}</Text>
              <Text style={styles.companyEst}>{t('home.aboutEst')}</Text>
            </View>
            <Text style={styles.companyTitle}>{t('home.aboutTitle')}</Text>
            <Text style={styles.companyText}>
              {t('home.aboutP1')}
            </Text>
            <Text style={styles.companyText}>
              {t('home.aboutP2')}
            </Text>
            <Text style={styles.companyText}>
              {t('home.aboutP3')}
            </Text>

            {/* Credibility Pills */}
            <View style={styles.credPillsRow}>
              <View style={styles.credPill}>
                <Text style={styles.credPillIcon}>📜</Text>
                <Text style={styles.credPillText}>{t('home.pillIso')}</Text>
              </View>
              <View style={styles.credPill}>
                <Text style={styles.credPillIcon}>🏛️</Text>
                <Text style={styles.credPillText}>{t('home.pillTier')}</Text>
              </View>
              <View style={styles.credPill}>
                <Text style={styles.credPillIcon}>🔒</Text>
                <Text style={styles.credPillText}>{t('home.pillSecurity')}</Text>
              </View>
              <View style={styles.credPill}>
                <Text style={styles.credPillIcon}>🌱</Text>
                <Text style={styles.credPillText}>{t('home.pillEco')}</Text>
              </View>
            </View>
          </View>

          {/* Company Quick Facilities Highlights */}
          <View style={styles.companyRight}>
            <View style={styles.facilityHighlightCard}>
              <Image source={DatacenterImg} style={styles.facCardThumb} resizeMode="cover" />
              <View style={styles.facCardBody}>
                <View style={styles.facHeader}>
                  <Text style={{ fontSize: 26 }}>🇰🇿</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facTitle}>{t('home.kazakhTitle')}</Text>
                    <Text style={styles.facLocation}>{t('home.kazakhLoc')}</Text>
                  </View>
                  <View style={styles.facPill}>
                    <Text style={styles.facPillText}>200 MW</Text>
                  </View>
                </View>
                <Text style={styles.facDesc}>
                  {t('home.kazakhDesc')}
                </Text>
              </View>
            </View>

            <View style={styles.facilityHighlightCard}>
              <Image source={PowerInfraImg} style={styles.facCardThumb} resizeMode="cover" />
              <View style={styles.facCardBody}>
                <View style={styles.facHeader}>
                  <Text style={{ fontSize: 26 }}>🇵🇱</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facTitle}>{t('home.polandTitle')}</Text>
                    <Text style={styles.facLocation}>{t('home.polandLoc')}</Text>
                  </View>
                  <View style={styles.facPill}>
                    <Text style={styles.facPillText}>60 MW</Text>
                  </View>
                </View>
                <Text style={styles.facDesc}>
                  {t('home.polandDesc')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* 5. INTERACTIVE YIELD ESTIMATOR */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.calculatorCard}>
          <View style={styles.calcHeader}>
            <Text style={styles.sectionOverline}>{t('home.calcOverline')}</Text>
            <Text style={styles.calcTitle}>{t('home.calcTitle')}</Text>
            <Text style={styles.calcSubtitle}>
              {t('home.calcSubtitle')}
            </Text>
          </View>

          {/* Plan Selector Buttons */}
          <View style={styles.calcSelectorRow}>
            {MINING_PLANS.map((plan) => (
              <TouchableOpacity
                key={plan.tier}
                style={[
                  styles.calcSelectBtn,
                  selectedPlanTier === plan.tier && styles.calcSelectBtnActive,
                ]}
                onPress={() => setSelectedPlanTier(plan.tier)}
              >
                <Text
                  style={[
                    styles.calcSelectPrice,
                    selectedPlanTier === plan.tier && styles.calcSelectPriceActive,
                  ]}
                >
                  ${plan.tier.toLocaleString()}
                </Text>
                <Text
                  style={[
                    styles.calcSelectName,
                    selectedPlanTier === plan.tier && styles.calcSelectNameActive,
                  ]}
                >
                  {plan.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Results Summary Box */}
          <View style={[styles.calcResultsBox, isMobile && styles.calcResultsBoxMobile]}>
            <View style={styles.calcStat}>
              <Text style={styles.calcStatLabel}>{t('home.calcPackageLabel')}</Text>
              <Text style={styles.calcStatValueGold}>{selectedPlan.name} (${selectedPlan.tier})</Text>
              <Text style={styles.calcStatSub}>{t('home.calcHashpower', { ths: selectedPlan.ths })}</Text>
            </View>

            <View style={styles.calcStat}>
              <Text style={styles.calcStatLabel}>{t('home.calcDailyYieldLabel')}</Text>
              <Text style={styles.calcStatValueGreen}>₿ {selectedPlan.dailyBtc.toFixed(8)} BTC</Text>
              <Text style={styles.calcStatSub}>≈ ${dailyYieldUsd.toFixed(2)} USDT / day</Text>
            </View>

            <View style={styles.calcStat}>
              <Text style={styles.calcStatLabel}>{t('home.calcTotalOutputLabel')}</Text>
              <Text style={styles.calcStatValueWhite}>₿ {totalBtc1500.toFixed(6)} BTC</Text>
              <Text style={styles.calcStatSub}>≈ ${totalUsd1500.toFixed(2)} USDT cumulative</Text>
            </View>

            <View style={styles.calcActionCol}>
              <TouchableOpacity
                style={styles.calcCtaBtn}
                onPress={() => onNavigateTab('packages')}
              >
                <Text style={styles.calcCtaBtnText}>{t('home.calcActivateBtn', { tier: `$${selectedPlan.tier}` })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.sectionHeadingBox}>
          <Text style={styles.sectionOverline}>{t('home.faqOverline')}</Text>
          <Text style={styles.sectionTitle}>{t('home.faqTitle')}</Text>
          <Text style={styles.sectionSubtitle}>
            {t('home.faqSubtitle')}
          </Text>
        </View>

        <View style={styles.faqList}>
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.faqCard, isOpen && styles.faqCardOpen]}
                onPress={() => setOpenFaqIndex(isOpen ? null : index)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQuestion, isOpen && styles.faqQuestionOpen]}>
                    {faq.q}
                  </Text>
                  <Text style={[styles.faqToggleIcon, isOpen && styles.faqToggleIconOpen]}>
                    {isOpen ? '−' : '+'}
                  </Text>
                </View>
                {isOpen && (
                  <Text style={styles.faqAnswer}>
                    {faq.a}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 7. BOTTOM CALL TO ACTION BANNER */}
      <View style={styles.bottomCtaBanner}>
        <Text style={styles.bottomCtaTitle}>{t('home.bottomCtaTitle')}</Text>
        <Text style={styles.bottomCtaSubtitle}>
          {t('home.bottomCtaSubtitle')}
        </Text>
        <View style={styles.bottomCtaButtons}>
          {isLoggedIn ? (
            <TouchableOpacity
              style={styles.bottomCtaPrimary}
              onPress={() => onNavigateTab('packages')}
            >
              <Text style={styles.bottomCtaPrimaryText}>{t('home.bottomCtaDashboard')}</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.bottomCtaPrimary}
                onPress={onSignUp}
              >
                <Text style={styles.bottomCtaPrimaryText}>{t('home.bottomCtaGetStarted')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bottomCtaSecondary}
                onPress={onSignIn}
              >
                <Text style={styles.bottomCtaSecondaryText}>{t('home.bottomCtaSignIn')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* 8. CLEAN MODERN FOOTER */}
      <View style={styles.footerWrap}>
        <View style={[styles.footerMainRow, isMobile && styles.footerMainRowMobile]}>
          <View style={styles.footerBrand}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.footerLogoBadge}>
                <Text style={styles.footerLogoChar}>₿</Text>
              </View>
              <Text style={styles.footerBrandText}>BTCM // CLOUD MINING</Text>
            </View>
            <Text style={styles.footerDesc}>
              {t('home.footerDesc')}
            </Text>
          </View>

          <View style={styles.footerLinksGroup}>
            <Text style={styles.footerGroupTitle}>{t('home.footerNavTitle')}</Text>
            <TouchableOpacity onPress={() => onNavigateTab('packages')}>
              <Text style={styles.footerLink}>{t('home.footerNavPackages')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigateTab('binary')}>
              <Text style={styles.footerLink}>{t('home.footerNavBinary')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigateTab('referrals')}>
              <Text style={styles.footerLink}>{t('home.footerNavReferrals')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerLinksGroup}>
            <Text style={styles.footerGroupTitle}>{t('home.footerAccountTitle')}</Text>
            <TouchableOpacity onPress={onSignIn}>
              <Text style={styles.footerLink}>{t('home.footerAccountSignIn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSignUp}>
              <Text style={styles.footerLink}>{t('home.footerAccountRegister')}</Text>
            </TouchableOpacity>
            <View style={styles.footerStatusPill}>
              <View style={styles.statusDotGreen} />
              <Text style={styles.footerStatusText}>{t('home.footerContainersOnline')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerBottomBar}>
          <Text style={styles.footerCopyright}>
            {t('home.footerCopyright')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
    backgroundColor: '#0B0E14',
  },

  // 1. Hero Section
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: 'center',
    textAlign: 'center',
  },
  heroSectionMobile: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  heroPill: {
    backgroundColor: 'rgba(247, 147, 26, 0.12)',
    borderColor: 'rgba(247, 147, 26, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroPillText: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  heroPillGreenText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroHeadline: {
    fontSize: 44,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 52,
    letterSpacing: -1,
    maxWidth: 860,
  },
  heroHeadlineMobile: {
    fontSize: 28,
    lineHeight: 36,
  },
  heroHighlight: {
    color: '#F7931A',
  },
  heroSubhead: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 720,
    marginTop: 16,
  },
  heroCtaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 28,
  },
  heroCtaRowMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  ctaPrimaryBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#F7931A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  ctaPrimaryBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },
  ctaSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  ctaOutlineBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaOutlineBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },

  // Hero Trust Proof Grid
  heroTrustGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 28,
    marginTop: 40,
    maxWidth: 820,
    width: '100%',
  },
  heroTrustGridMobile: {
    flexDirection: 'column',
    gap: 16,
    paddingHorizontal: 16,
  },
  trustItem: {
    alignItems: 'center',
    flex: 1,
  },
  trustVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  trustLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  trustDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  trustDividerMobile: {
    width: '100%',
    height: 1,
  },

  // Hero Interactive Facility Visual Banner
  heroFacilityBanner: {
    width: '100%',
    maxWidth: 960,
    height: 280,
    borderRadius: 18,
    overflow: 'hidden',
    marginTop: 36,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.35)',
    backgroundColor: '#0F172A',
  },
  heroFacilityBannerMobile: {
    minHeight: 260,
    marginTop: 24,
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
  },
  heroBannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 14, 20, 0.65)',
    justifyContent: 'space-between',
    padding: 20,
  },
  heroBannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroBannerTopRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  heroBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(0, 230, 118, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBannerPillText: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroBannerCoord: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  heroBannerBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
  },
  heroBannerBottomRowMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 10,
  },
  heroBannerBottomLeft: {
    flex: 1,
    minWidth: 260,
  },
  heroBannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  heroBannerSubtitle: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 4,
    fontWeight: '600',
  },
  heroBannerBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  heroBannerBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },

  // 2. Common Section Wrapper
  sectionWrap: {
    paddingHorizontal: 24,
    marginTop: 56,
  },
  sectionWrapMobile: {
    paddingHorizontal: 16,
    marginTop: 36,
  },
  sectionHeadingBox: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 32,
  },
  sectionOverline: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F7931A',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 620,
    lineHeight: 22,
  },

  // Steps Grid
  stepsGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  stepsGridMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    position: 'relative',
  },
  stepCardMobile: {
    width: '100%',
  },
  stepBadge: {
    position: 'absolute',
    top: 18,
    right: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  stepIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stepCardTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  stepCardText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  featuresGridMobile: {
    flexDirection: 'column',
    gap: 14,
  },
  featureCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#111827',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
  },
  featureCardMobile: {
    width: '100%',
    minWidth: '100%',
  },
  featureIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },

  // 4. Equipment & Facility Imagery Grid
  imageryGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  imageryGridMobile: {
    flexDirection: 'column',
  },
  imageCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imageCardMobile: {
    width: '100%',
  },
  imageFrame: {
    width: '100%',
    height: 190,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  imageStatusPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(0, 230, 118, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imageStatusText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '900',
  },
  imageCardBody: {
    padding: 18,
  },
  imageCardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  imageCardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 14,
  },
  specChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specChipText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },

  // 5. Company Card (MineBest Story)
  companyCard: {
    backgroundColor: '#0F172A',
    borderColor: 'rgba(247, 147, 26, 0.35)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 32,
    flexDirection: 'row',
    gap: 32,
  },
  companyCardMobile: {
    flexDirection: 'column',
    padding: 20,
    gap: 24,
  },
  companyLeft: {
    flex: 1.2,
  },
  companyTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  companyTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F7931A',
    letterSpacing: 1,
  },
  companyEst: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  companyTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  companyText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 22,
    marginBottom: 12,
  },
  credPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  credPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  credPillIcon: {
    fontSize: 12,
  },
  credPillText: {
    fontSize: 11,
    color: '#CBD5E1',
    fontWeight: '700',
  },
  companyRight: {
    flex: 1,
    gap: 16,
    justifyContent: 'center',
  },
  facilityHighlightCard: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  facCardThumb: {
    width: '100%',
    height: 110,
  },
  facCardBody: {
    padding: 14,
  },
  facHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  facTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  facLocation: {
    fontSize: 11,
    color: '#64748B',
  },
  facPill: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  facPillText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '900',
  },
  facDesc: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 17,
  },

  // 5. Calculator Card
  calculatorCard: {
    backgroundColor: '#111827',
    borderColor: 'rgba(247, 147, 26, 0.35)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 28,
  },
  calcHeader: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 20,
  },
  calcTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
    textAlign: 'center',
  },
  calcSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 600,
  },
  calcSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
    justifyContent: 'center',
  },
  calcSelectBtn: {
    minWidth: 96,
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  calcSelectBtnActive: {
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderColor: '#F7931A',
  },
  calcSelectPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E2E8F0',
  },
  calcSelectPriceActive: {
    color: '#F7931A',
  },
  calcSelectName: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },
  calcSelectNameActive: {
    color: '#F7931A',
  },
  calcResultsBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  calcResultsBoxMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 14,
  },
  calcStat: {
    flex: 1,
  },
  calcStatLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  calcStatValueGold: {
    fontSize: 16,
    fontWeight: '900',
    color: '#F7931A',
    marginTop: 2,
  },
  calcStatValueGreen: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00E676',
    marginTop: 2,
  },
  calcStatValueWhite: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 2,
  },
  calcStatSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  calcActionCol: {
    justifyContent: 'center',
  },
  calcCtaBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  calcCtaBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },

  // 6. FAQ Accordion
  faqList: {
    gap: 10,
    maxWidth: 780,
    alignSelf: 'center',
    width: '100%',
  },
  faqCard: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  faqCardOpen: {
    borderColor: 'rgba(247, 147, 26, 0.4)',
    backgroundColor: '#131B2E',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
  },
  faqQuestionOpen: {
    color: '#F7931A',
  },
  faqToggleIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#64748B',
  },
  faqToggleIconOpen: {
    color: '#F7931A',
  },
  faqAnswer: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 10,
    lineHeight: 20,
  },

  // 7. Bottom CTA Banner
  bottomCtaBanner: {
    marginTop: 60,
    marginHorizontal: 24,
    backgroundColor: 'rgba(247, 147, 26, 0.08)',
    borderColor: 'rgba(247, 147, 26, 0.3)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    textAlign: 'center',
  },
  bottomCtaTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bottomCtaSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 22,
  },
  bottomCtaButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  bottomCtaPrimary: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bottomCtaPrimaryText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 13,
  },
  bottomCtaSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  bottomCtaSecondaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },

  // 8. Footer
  footerWrap: {
    marginTop: 60,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 36,
    paddingHorizontal: 24,
  },
  footerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 32,
    flexWrap: 'wrap',
  },
  footerMainRowMobile: {
    flexDirection: 'column',
    gap: 24,
  },
  footerBrand: {
    flex: 1.5,
    minWidth: 240,
  },
  footerLogoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7931A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLogoChar: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000',
  },
  footerBrandText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footerDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
    lineHeight: 18,
    maxWidth: 380,
  },
  footerLinksGroup: {
    flex: 1,
    minWidth: 160,
    gap: 8,
  },
  footerGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CBD5E1',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  footerLink: {
    fontSize: 12,
    color: '#94A3B8',
  },
  footerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  footerStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00E676',
  },
  footerBottomBar: {
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 18,
    alignItems: 'center',
  },
  footerCopyright: {
    fontSize: 11,
    color: '#64748B',
  },
});
