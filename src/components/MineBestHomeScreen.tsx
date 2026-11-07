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

  const [selectedPlanTier, setSelectedPlanTier] = useState<number>(1000);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const selectedPlan = MINING_PLANS.find((p) => p.tier === selectedPlanTier) || MINING_PLANS[2];
  const dailyYieldUsd = selectedPlan.dailyBtc * btcPriceUsd;
  const totalBtc1500 = selectedPlan.dailyBtc * 1500;
  const totalUsd1500 = totalBtc1500 * btcPriceUsd;

  const faqs = [
    {
      q: 'Do I need to buy any physical equipment or know how to code?',
      a: 'No! That is the beauty of cloud mining. MineBest owns, hosts, and maintains all industrial ASIC rigs in certified data centers. You simply choose your computing power, and our automated system deposits Bitcoin directly to your wallet every day.',
    },
    {
      q: 'How long do mining contracts last?',
      a: 'Every cloud mining contract runs for 1,500 consecutive days. After a 48-hour hardware diagnostics and burn-in period, automated daily Bitcoin mining distributions begin without requiring manual harvest.',
    },
    {
      q: 'How does the 10% Direct Bonus and Binary Pairing work?',
      a: 'When someone joins using your referral link and activates a mining package, you instantly earn a 10% cash reward credited in USDT. In addition, our binary pairing engine pairs Leg A and Leg B volume every night at 23:59, awarding 100 USDT per 1,000 pair volume.',
    },
    {
      q: 'Which cryptocurrencies can I deposit and withdraw?',
      a: 'We support USDT (TRC-20 & ERC-20), USDC, and native Bitcoin (BTC). Deposits credit automatically upon blockchain confirmation, and withdrawals can be requested anytime from your dashboard.',
    },
    {
      q: 'Who is MineBest and where are the data centers located?',
      a: 'MineBest was founded in 2017 by Eyal Avramovich and is headquartered in Warsaw, Poland. The company operates over 300+ MW of high-density cryptographic data centers in Kazakhstan (Ekibastuz mega-hub) and Poland, partnering directly with MicroBT and Bitmain.',
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* 1. HERO SECTION */}
      <View style={[styles.heroSection, isMobile && styles.heroSectionMobile]}>
        <View style={styles.heroBadgeRow}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>⚡ MINEBEST POWERED CLOUD MINING</Text>
          </View>
          <View style={styles.heroPillGreen}>
            <View style={styles.statusDotGreen} />
            <Text style={styles.heroPillGreenText}>99.98% INFRASTRUCTURE UPTIME</Text>
          </View>
        </View>

        <Text style={[styles.heroHeadline, isMobile && styles.heroHeadlineMobile]}>
          Bitcoin Mining,{'\n'}
          <Text style={styles.heroHighlight}>Made Simple & Powerful.</Text>
        </Text>

        <Text style={styles.heroSubhead}>
          Harness enterprise-grade ASIC computing power hosted in MineBest's world-class data centers.
          Earn automated daily Bitcoin rewards for 1,500 days with zero hardware setup or electricity headaches.
        </Text>

        {/* Hero Action Buttons */}
        <View style={[styles.heroCtaRow, isMobile && styles.heroCtaRowMobile]}>
          {isLoggedIn ? (
            <TouchableOpacity
              style={styles.ctaPrimaryBtn}
              onPress={() => onNavigateTab('packages')}
            >
              <Text style={styles.ctaPrimaryBtnText}>🚀 Open Mining Dashboard ➔</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.ctaPrimaryBtn}
                onPress={onSignUp}
              >
                <Text style={styles.ctaPrimaryBtnText}>🚀 Create Free Account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaSecondaryBtn}
                onPress={onSignIn}
              >
                <Text style={styles.ctaSecondaryBtnText}>⚡ Member Sign In</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.ctaOutlineBtn}
            onPress={() => onNavigateTab('packages')}
          >
            <Text style={styles.ctaOutlineBtnText}>📦 View 1,500-Day Packages</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Trust Proof Numbers */}
        <View style={[styles.heroTrustGrid, isMobile && styles.heroTrustGridMobile]}>
          <View style={styles.trustItem}>
            <Text style={styles.trustVal}>1,500</Text>
            <Text style={styles.trustLabel}>Days of Automated Yield</Text>
          </View>
          <View style={[styles.trustDivider, isMobile && styles.trustDividerMobile]} />
          <View style={styles.trustItem}>
            <Text style={styles.trustVal}>300+ MW</Text>
            <Text style={styles.trustLabel}>Data Center Capacity</Text>
          </View>
          <View style={[styles.trustDivider, isMobile && styles.trustDividerMobile]} />
          <View style={styles.trustItem}>
            <Text style={styles.trustVal}>1.85 EH/s</Text>
            <Text style={styles.trustLabel}>Global Fleet Hashrate</Text>
          </View>
          <View style={[styles.trustDivider, isMobile && styles.trustDividerMobile]} />
          <View style={styles.trustItem}>
            <Text style={styles.trustVal}>10% + 10%</Text>
            <Text style={styles.trustLabel}>Direct & Binary Rewards</Text>
          </View>
        </View>

        {/* Hero Interactive Facility Visual Banner */}
        <View style={[styles.heroFacilityBanner, isMobile && styles.heroFacilityBannerMobile]}>
          <Image source={DatacenterImg} style={styles.heroBannerImage} resizeMode="cover" />
          <View style={styles.heroBannerOverlay}>
            <View style={[styles.heroBannerTopRow, isMobile && styles.heroBannerTopRowMobile]}>
              <View style={styles.heroBannerPill}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.heroBannerPillText}>LIVE INFRASTRUCTURE • 300+ MW FLEET</Text>
              </View>
              <Text style={styles.heroBannerCoord}>48.0196° N, 66.9237° E • TIER-III STANDARD</Text>
            </View>
            <View style={[styles.heroBannerBottomRow, isMobile && styles.heroBannerBottomRowMobile]}>
              <View style={styles.heroBannerBottomLeft}>
                <Text style={styles.heroBannerTitle}>MineBest Enterprise High-Density Mining Cluster</Text>
                <Text style={styles.heroBannerSubtitle}>84,000+ Online ASIC Units • Cold-Climate Evaporative Airflow • 99.98% Uptime</Text>
              </View>
              <TouchableOpacity style={styles.heroBannerBtn} onPress={() => onNavigateTab('packages')}>
                <Text style={styles.heroBannerBtnText}>Explore Hardware ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 2. HOW IT WORKS (3 SIMPLE STEPS) */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.sectionHeadingBox}>
          <Text style={styles.sectionOverline}>HOW IT WORKS</Text>
          <Text style={styles.sectionTitle}>Start Mining Bitcoin in 3 Simple Steps</Text>
          <Text style={styles.sectionSubtitle}>
            We've removed all the technical friction of crypto mining so anyone can participate effortlessly.
          </Text>
        </View>

        <View style={[styles.stepsGrid, isMobile && styles.stepsGridMobile]}>
          <View style={[styles.stepCard, isMobile && styles.stepCardMobile]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 1</Text>
            </View>
            <View style={styles.stepIconBubble}>
              <Text style={{ fontSize: 28 }}>📦</Text>
            </View>
            <Text style={styles.stepCardTitle}>Pick a Mining Plan</Text>
            <Text style={styles.stepCardText}>
              Select the computing package that fits your goals, from starter $100 contracts up to $30,000 industrial tiers.
            </Text>
          </View>

          <View style={[styles.stepCard, isMobile && styles.stepCardMobile]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 2</Text>
            </View>
            <View style={[styles.stepIconBubble, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Text style={{ fontSize: 28 }}>⚙️</Text>
            </View>
            <Text style={styles.stepCardTitle}>We Power the Hardware</Text>
            <Text style={styles.stepCardText}>
              MineBest engineers deploy and configure top-tier ASIC miners in our climate-optimized, 24/7 guarded data centers.
            </Text>
          </View>

          <View style={[styles.stepCard, isMobile && styles.stepCardMobile]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>STEP 3</Text>
            </View>
            <View style={[styles.stepIconBubble, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
              <Text style={{ fontSize: 28 }}>💰</Text>
            </View>
            <Text style={styles.stepCardTitle}>Receive Daily Bitcoin</Text>
            <Text style={styles.stepCardText}>
              Enjoy automated daily Bitcoin distributions straight to your wallet for up to 1,500 consecutive days.
            </Text>
          </View>
        </View>
      </View>

      {/* 3. KEY PROJECT FEATURES (FRIENDLY 4-GRID) */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.sectionHeadingBox}>
          <Text style={styles.sectionOverline}>WHY CHOOSE BTCM</Text>
          <Text style={styles.sectionTitle}>Engineered for Transparency & Performance</Text>
          <Text style={styles.sectionSubtitle}>
            A modern, user-first cloud mining ecosystem built on audited hardware and predictable reward systems.
          </Text>
        </View>

        <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
          <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
            <View style={styles.featureIconBox}>
              <Text style={{ fontSize: 26 }}>⚡</Text>
            </View>
            <Text style={styles.featureTitle}>100% Automated System</Text>
            <Text style={styles.featureDesc}>
              Forget manual clicking or complex software setups. After contract activation and 48h hardware calibration, daily Bitcoin yield is credited automatically every 24 hours.
            </Text>
          </View>

          <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(247, 147, 26, 0.15)' }]}>
              <Text style={{ fontSize: 26 }}>🛡️</Text>
            </View>
            <Text style={styles.featureTitle}>1,500-Day Contract Life</Text>
            <Text style={styles.featureDesc}>
              One of the longest contract lifecycles in the entire crypto industry. Your ASIC computing capacity continues mining through all seasons, backed by full hardware maintenance.
            </Text>
          </View>

          <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
              <Text style={{ fontSize: 26 }}>🤝</Text>
            </View>
            <Text style={styles.featureTitle}>10% Direct Referral Bonus</Text>
            <Text style={styles.featureDesc}>
              Share your personal link and earn an instant 10% cash reward credited directly to your USDT balance whenever your downline purchases a mining package.
            </Text>
          </View>

          <View style={[styles.featureCard, isMobile && styles.featureCardMobile]}>
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
              <Text style={{ fontSize: 26 }}>🌲</Text>
            </View>
            <Text style={styles.featureTitle}>23:59 Dual Binary Pairing</Text>
            <Text style={styles.featureDesc}>
              Pair volume from your Left (A) and Right (B) legs. Every 1,000 USDT matched volume earns you 100 USDT, automatically settled every single night at 23:59 server time.
            </Text>
          </View>
        </View>
      </View>

      {/* 4. INDUSTRIAL EQUIPMENT & FACILITY SHOWCASE */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.sectionHeadingBox}>
          <Text style={styles.sectionOverline}>INFRASTRUCTURE & DEVICES</Text>
          <Text style={styles.sectionTitle}>Real Mining Equipment. Audited Facilities.</Text>
          <Text style={styles.sectionSubtitle}>
            Our cloud contracts are underpinned by physical, high-performance ASIC rigs operating in Tier-III data centers with institutional-grade power management.
          </Text>
        </View>

        <View style={[styles.imageryGrid, isMobile && styles.imageryGridMobile]}>
          {/* Card 1: Data Center Aisles */}
          <View style={[styles.imageCard, isMobile && styles.imageCardMobile]}>
            <View style={styles.imageFrame}>
              <Image source={DatacenterImg} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.imageOverlayBadge}>
                <Text style={styles.imageBadgeText}>🏢 DATA CENTER HALL</Text>
              </View>
              <View style={styles.imageStatusPill}>
                <View style={styles.statusDotGreen} />
                <Text style={styles.imageStatusText}>ACTIVE 24/7</Text>
              </View>
            </View>
            <View style={styles.imageCardBody}>
              <Text style={styles.imageCardTitle}>Hyperscale Mining Aisles</Text>
              <Text style={styles.imageCardDesc}>
                Thousands of high-density ASIC units in engineered hot/cold aisle containment, monitored by real-time IoT thermal sensors with automated exhaust.
              </Text>
              <View style={styles.specChipsRow}>
                <View style={styles.specChip}><Text style={styles.specChipText}>84,000+ ASICs</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>PUE 1.08</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>Tier III Standard</Text></View>
              </View>
            </View>
          </View>

          {/* Card 2: ASIC Equipment */}
          <View style={[styles.imageCard, isMobile && styles.imageCardMobile]}>
            <View style={styles.imageFrame}>
              <Image source={AsicHardwareImg} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.imageOverlayBadge}>
                <Text style={styles.imageBadgeText}>⚡ ASIC HARDWARE RIGS</Text>
              </View>
              <View style={[styles.imageStatusPill, { backgroundColor: 'rgba(247, 147, 26, 0.85)' }]}>
                <Text style={styles.imageStatusText}>TOP EFFICIENCY</Text>
              </View>
            </View>
            <View style={styles.imageCardBody}>
              <Text style={styles.imageCardTitle}>MicroBT & Bitmain ASIC Nodes</Text>
              <Text style={styles.imageCardDesc}>
                Custom-tuned WhatsMiner M30S+ and Antminer S19 Pro units with dual high-CFM cooling fans and 5nm/7nm silicon for maximum hash consistency.
              </Text>
              <View style={styles.specChipsRow}>
                <View style={styles.specChip}><Text style={styles.specChipText}>MicroBT & Bitmain</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>Dual 6,500 RPM Fans</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>34 J/TH</Text></View>
              </View>
            </View>
          </View>

          {/* Card 3: Power Substation */}
          <View style={[styles.imageCard, isMobile && styles.imageCardMobile]}>
            <View style={styles.imageFrame}>
              <Image source={PowerInfraImg} style={styles.cardImage} resizeMode="cover" />
              <View style={styles.imageOverlayBadge}>
                <Text style={styles.imageBadgeText}>🔌 POWER SUBSTATION</Text>
              </View>
              <View style={[styles.imageStatusPill, { backgroundColor: 'rgba(56, 189, 248, 0.85)' }]}>
                <Text style={styles.imageStatusText}>300+ MW GRID</Text>
              </View>
            </View>
            <View style={styles.imageCardBody}>
              <Text style={styles.imageCardTitle}>High-Voltage Power Distribution</Text>
              <Text style={styles.imageCardDesc}>
                Direct 110kV-to-10kV step-down transformers connected to wholesale power plants, securing ultra-low electricity tariffs and 99.98% operational uptime.
              </Text>
              <View style={styles.specChipsRow}>
                <View style={styles.specChip}><Text style={styles.specChipText}>110kV Substation</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>Eco-Efficient</Text></View>
                <View style={styles.specChip}><Text style={styles.specChipText}>Redundant Transformers</Text></View>
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
              <Text style={styles.companyTag}>COMPANY BACKGROUND</Text>
              <Text style={styles.companyEst}>EST. 2017 • WARSAW, POLAND</Text>
            </View>
            <Text style={styles.companyTitle}>About MineBest</Text>
            <Text style={styles.companyText}>
              Founded in 2017 by tech visionary <Text style={{ color: '#F7931A', fontWeight: '800' }}>Eyal Avramovich</Text>, MineBest has grown into one of the world's most trusted operators of industrial-scale cryptocurrency mining data centers.
            </Text>
            <Text style={styles.companyText}>
              Headquartered in Warsaw, Poland, MineBest engineers proprietary 20ft and 40ft all-weather high-density mobile mining containers. These units operate in strategic low-cost energy zones with cold-climate natural cooling, achieving an industry-leading Power Usage Effectiveness (PUE) of 1.08.
            </Text>
            <Text style={styles.companyText}>
              Through official procurement partnerships with <Text style={{ color: '#38BDF8', fontWeight: '800' }}>MicroBT (WhatsMiner)</Text> and <Text style={{ color: '#00E676', fontWeight: '800' }}>Bitmain (Antminer)</Text>, MineBest delivers reliable, institutional-grade hashpower directly to BTCM members.
            </Text>

            {/* Credibility Pills */}
            <View style={styles.credPillsRow}>
              <View style={styles.credPill}>
                <Text style={styles.credPillIcon}>📜</Text>
                <Text style={styles.credPillText}>ISO 9001:2015 Certified</Text>
              </View>
              <View style={styles.credPill}>
                <Text style={styles.credPillIcon}>🏛️</Text>
                <Text style={styles.credPillText}>Tier III Data Center Standards</Text>
              </View>
              <View style={styles.credPill}>
                <Text style={styles.credPillIcon}>🔒</Text>
                <Text style={styles.credPillText}>24/7 Armed Security & CCTV</Text>
              </View>
              <View style={styles.credPill}>
                <Text style={styles.credPillIcon}>🌱</Text>
                <Text style={styles.credPillText}>Eco Evaporative Cooling</Text>
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
                    <Text style={styles.facTitle}>Kazakhstan Mega Center</Text>
                    <Text style={styles.facLocation}>Ekibastuz, Pavlodar Region</Text>
                  </View>
                  <View style={styles.facPill}>
                    <Text style={styles.facPillText}>200 MW</Text>
                  </View>
                </View>
                <Text style={styles.facDesc}>
                  Direct high-voltage substation grid powering over 84,000 ASIC miners across 80 proprietary containers. Naturally cooled by sub-zero winter temperatures.
                </Text>
              </View>
            </View>

            <View style={styles.facilityHighlightCard}>
              <Image source={PowerInfraImg} style={styles.facCardThumb} resizeMode="cover" />
              <View style={styles.facCardBody}>
                <View style={styles.facHeader}>
                  <Text style={{ fontSize: 26 }}>🇵🇱</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.facTitle}>Poland European Tech Hub</Text>
                    <Text style={styles.facLocation}>Warsaw Innovation Campus</Text>
                  </View>
                  <View style={styles.facPill}>
                    <Text style={styles.facPillText}>60 MW</Text>
                  </View>
                </View>
                <Text style={styles.facDesc}>
                  Engineering headquarters designing custom 40ft Smart Containers, remote telemetry IoT boards, and AI-driven thermal airflow management.
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
            <Text style={styles.sectionOverline}>ESTIMATE YOUR REWARDS</Text>
            <Text style={styles.calcTitle}>Interactive Mining Yield Estimator</Text>
            <Text style={styles.calcSubtitle}>
              Select a package to see projected computing power and automated 1,500-day Bitcoin output calculated at ${btcPriceUsd.toLocaleString()} / BTC.
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
              <Text style={styles.calcStatLabel}>Selected Package</Text>
              <Text style={styles.calcStatValueGold}>{selectedPlan.name} (${selectedPlan.tier})</Text>
              <Text style={styles.calcStatSub}>{selectedPlan.ths} TH/s Hashpower</Text>
            </View>

            <View style={styles.calcStat}>
              <Text style={styles.calcStatLabel}>Estimated Daily Yield</Text>
              <Text style={styles.calcStatValueGreen}>₿ {selectedPlan.dailyBtc.toFixed(8)} BTC</Text>
              <Text style={styles.calcStatSub}>≈ ${dailyYieldUsd.toFixed(2)} USDT / day</Text>
            </View>

            <View style={styles.calcStat}>
              <Text style={styles.calcStatLabel}>1,500-Day Total Output</Text>
              <Text style={styles.calcStatValueWhite}>₿ {totalBtc1500.toFixed(6)} BTC</Text>
              <Text style={styles.calcStatSub}>≈ ${totalUsd1500.toFixed(2)} USDT cumulative</Text>
            </View>

            <View style={styles.calcActionCol}>
              <TouchableOpacity
                style={styles.calcCtaBtn}
                onPress={() => onNavigateTab('packages')}
              >
                <Text style={styles.calcCtaBtnText}>Activate ${selectedPlan.tier} Plan ➔</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <View style={[styles.sectionWrap, isMobile && styles.sectionWrapMobile]}>
        <View style={styles.sectionHeadingBox}>
          <Text style={styles.sectionOverline}>FREQUENTLY ASKED QUESTIONS</Text>
          <Text style={styles.sectionTitle}>Everything You Need to Know</Text>
          <Text style={styles.sectionSubtitle}>
            Clear answers to common questions about cloud mining, rewards, and our infrastructure.
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
        <Text style={styles.bottomCtaTitle}>Ready to Power Your Bitcoin Future?</Text>
        <Text style={styles.bottomCtaSubtitle}>
          Join thousands of miners worldwide utilizing MineBest's institutional computing containers with guaranteed 1,500-day automated payouts.
        </Text>
        <View style={styles.bottomCtaButtons}>
          {isLoggedIn ? (
            <TouchableOpacity
              style={styles.bottomCtaPrimary}
              onPress={() => onNavigateTab('packages')}
            >
              <Text style={styles.bottomCtaPrimaryText}>⚡ Open Mining Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.bottomCtaPrimary}
                onPress={onSignUp}
              >
                <Text style={styles.bottomCtaPrimaryText}>🚀 Get Started Free</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bottomCtaSecondary}
                onPress={onSignIn}
              >
                <Text style={styles.bottomCtaSecondaryText}>⚡ Member Sign In</Text>
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
              Institutional-grade Bitcoin cloud mining powered by MineBest data centers. 1,500-day hardware lifecycles with daily automated payouts.
            </Text>
          </View>

          <View style={styles.footerLinksGroup}>
            <Text style={styles.footerGroupTitle}>Platform Navigation</Text>
            <TouchableOpacity onPress={() => onNavigateTab('packages')}>
              <Text style={styles.footerLink}>⚡ View 1,500-Day Packages</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigateTab('binary')}>
              <Text style={styles.footerLink}>🌲 Binary Placement Tree</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigateTab('referrals')}>
              <Text style={styles.footerLink}>👥 Direct Referrals & 10% Bonus</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerLinksGroup}>
            <Text style={styles.footerGroupTitle}>Account & Access</Text>
            <TouchableOpacity onPress={onSignIn}>
              <Text style={styles.footerLink}>⚡ Member Sign In</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSignUp}>
              <Text style={styles.footerLink}>🚀 Create New Account</Text>
            </TouchableOpacity>
            <View style={styles.footerStatusPill}>
              <View style={styles.statusDotGreen} />
              <Text style={styles.footerStatusText}>All Mining Containers Online</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerBottomBar}>
          <Text style={styles.footerCopyright}>
            © 2017 – 2026 MineBest & BTCM Hashrate Core. All rights reserved.
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
