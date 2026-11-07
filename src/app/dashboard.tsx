import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/services/api';
import { BinaryTreeVisualizer } from '@/components/BinaryTreeVisualizer';
import { StarRankIndicator } from '@/components/StarRankIndicator';
import { useIsMobile } from '@/hooks/useIsMobile';

const DatacenterImg = require('../../assets/images/facility_datacenter.jpg');
const AsicHardwareImg = require('../../assets/images/asic_hardware.jpg');

interface Package {
  _id: string;
  tier: number;
  name: string;
  tagline: string;
  priceUsd: number;
  hashrate: string;
  dailyBtcYield: number;
  minDailyBtcYield?: number;
  maxDailyBtcYield?: number;
  maxDays: number;
  estimatedDailyUsd: number;
  efficiency: string;
  badge: string;
}

interface UserProfile {
  _id: string;
  id?: number | string;
  username: string;
  email: string;
  fullName: string;
  referralCode: string;
  sponsor?: { username: string; referralCode: string };
  starRank?: number;
  starBadge?: string;
  starIcon?: string;
  isStarQualified?: boolean;
  role?: string;
  status?: string;
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
}

interface Contract {
  _id: string;
  id?: number | string;
  tier: number;
  packageName: string;
  hashrate: string;
  priceUsd: number;
  dailyBtcYield: number;
  minDailyBtcYield?: number;
  maxDailyBtcYield?: number;
  maxDays: number;
  daysCompleted: number;
  totalBtcHarvested: number;
  status: string;
  expiresAt: string;
  purchasedAt?: string;
  createdAt?: string;
  lastHarvestAt?: string;
}

interface NetworkSummary {
  directCount: number;
  leftLeg: { currentVolume: number; totalVolume: number; progressToNext1000: number };
  rightLeg: { currentVolume: number; totalVolume: number; progressToNext1000: number };
  pairsCount: number;
  totalBinaryBonus: number;
  totalDirectBonus: number;
  totalBinaryConfiscated?: number;
  nextPairNeeded: { legA: number; legB: number };
  starRanking?: {
    rank: number;
    name: string;
    badge: string;
    personalInvested?: number;
    minPersonalRequired?: number;
    directPlacementVolume: number;
    targetVolume: number;
    isOneStarQualified: boolean;
    isTwoStarQualified?: boolean;
    isThreeStarQualified?: boolean;
    isFourStarQualified?: boolean;
    isFiveStarQualified?: boolean;
    isSixStarQualified?: boolean;
    isSevenStarQualified?: boolean;
    isCrownQualified?: boolean;
    isTwoCrownQualified?: boolean;
    isThreeCrownQualified?: boolean;
    volumeNeededForNextRank: number;
    personalNeededForNextRank?: number;
    maxDailyPairs: number;
    dailyPairCapUsdt: number;
    totalPairsReady: number;
    pendingPaidPairs: number;
    pendingConfiscatedPairs: number;
    pendingConfiscatedVolume: number;
    pendingBonusEarned: number;
    settlementTime: string;
    nextSettlementAt: string;
    countdown: string;
    ruleText: string;
  };
}

function isRandomYieldPackage(p: { minDailyBtcYield?: number; maxDailyBtcYield?: number; tier: number }) {
  return !!((p.minDailyBtcYield && p.maxDailyBtcYield) || p.tier === 100 || p.tier === 300 || p.tier === 1000 || p.tier === 5000 || p.tier === 10000 || p.tier === 30000);
}

function getPackageYieldRange(p: { minDailyBtcYield?: number; maxDailyBtcYield?: number; dailyBtcYield?: number; tier: number }) {
  const min = p.minDailyBtcYield ?? (p.tier === 100 ? 0.0000010 : (p.tier === 300 ? 0.0000030 : (p.tier === 1000 ? 0.00003578 : (p.tier === 5000 ? 0.0001790 : (p.tier === 10000 ? 0.000358 : (p.tier === 30000 ? 0.001075 : (p.dailyBtcYield || 0)))))));
  const max = p.maxDailyBtcYield ?? (p.tier === 100 ? 0.00000105 : (p.tier === 300 ? 0.00000310 : (p.tier === 1000 ? 0.00003688 : (p.tier === 5000 ? 0.0001800 : (p.tier === 10000 ? 0.000365 : (p.tier === 30000 ? 0.001080 : (p.dailyBtcYield || 0)))))));
  return { min, max };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00h 00m 00s';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

export const OFFICIAL_MINING_PACKAGES: Package[] = [
  {
    _id: '1',
    tier: 100,
    name: 'Antminer Starter 100',
    tagline: 'Entry-level Cloud ASIC Node',
    priceUsd: 100,
    hashrate: '5.5 TH/s',
    dailyBtcYield: 0.00000103,
    minDailyBtcYield: 0.000001,
    maxDailyBtcYield: 0.00000105,
    maxDays: 1500,
    estimatedDailyUsd: 0.21,
    efficiency: '29.5 J/TH',
    badge: 'STARTER',
  },
  {
    _id: '2',
    tier: 300,
    name: 'WhatsMiner M30S 300',
    tagline: 'High-Efficiency MicroBT Rig',
    priceUsd: 300,
    hashrate: '17.5 TH/s',
    dailyBtcYield: 0.00000305,
    minDailyBtcYield: 0.000003,
    maxDailyBtcYield: 0.0000031,
    maxDays: 1500,
    estimatedDailyUsd: 0.51,
    efficiency: '29.5 J/TH',
    badge: 'POPULAR',
  },
  {
    _id: '3',
    tier: 1000,
    name: 'Avalon Miner 1246 Pro',
    tagline: 'Standard Enterprise Mining Unit',
    priceUsd: 1000,
    hashrate: '62.0 TH/s',
    dailyBtcYield: 0.00003633,
    minDailyBtcYield: 0.00003578,
    maxDailyBtcYield: 0.00003688,
    maxDays: 1500,
    estimatedDailyUsd: 8.4,
    efficiency: '29.5 J/TH',
    badge: 'BEST VALUE',
  },
  {
    _id: '4',
    tier: 5000,
    name: 'Antminer S19 XP Hydro',
    tagline: 'Liquid Cooled Mining Cluster',
    priceUsd: 5000,
    hashrate: '335.0 TH/s',
    dailyBtcYield: 0.0001795,
    minDailyBtcYield: 0.000179,
    maxDailyBtcYield: 0.00018,
    maxDays: 1500,
    estimatedDailyUsd: 45.5,
    efficiency: '29.5 J/TH',
    badge: 'PROFESSIONAL',
  },
  {
    _id: '5',
    tier: 10000,
    name: 'Bitmain Mega Hydro Pod',
    tagline: 'High-Density Datacenter Container',
    priceUsd: 10000,
    hashrate: '710.0 TH/s',
    dailyBtcYield: 0.0003615,
    minDailyBtcYield: 0.000358,
    maxDailyBtcYield: 0.000365,
    maxDays: 1500,
    estimatedDailyUsd: 96.6,
    efficiency: '29.5 J/TH',
    badge: 'INSTITUTIONAL',
  },
  {
    _id: '6',
    tier: 30000,
    name: 'GigaCluster Mega ASIC Array',
    tagline: 'Ultimate Industrial Hashrate Farm',
    priceUsd: 30000,
    hashrate: '2350.0 TH/s',
    dailyBtcYield: 0.0010775,
    minDailyBtcYield: 0.001075,
    maxDailyBtcYield: 0.00108,
    maxDays: 1500,
    estimatedDailyUsd: 315,
    efficiency: '29.5 J/TH',
    badge: 'WHALE ELITE',
  },
];

export default function BitcoinMiningApp() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<'packages' | 'binary' | 'referrals' | 'contracts'>('packages');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [packages, setPackages] = useState<Package[]>(OFFICIAL_MINING_PACKAGES);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [nowMs, setNowMs] = useState(Date.now());
  const [treeData, setTreeData] = useState<any>(null);
  const [treeRootUser, setTreeRootUser] = useState<{ id: any; username: string; referralCode?: string } | null>(null);
  const [treeHistory, setTreeHistory] = useState<Array<{ id: any; username: string; referralCode?: string }>>([]);
  const [loadingTree, setLoadingTree] = useState(false);
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [btcPrice, setBtcPrice] = useState<number>(78300);
  const [btcChange24h, setBtcChange24h] = useState<number>(1.5);

  // Modals
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [depositCurrency, setDepositCurrency] = useState<'USDT' | 'BTC' | 'USDC'>('USDT');
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1000');
  const [depositTxHash, setDepositTxHash] = useState('');
  const [depositInfo, setDepositInfo] = useState<{
    depositAddress: string;
    network: string;
    instructions: string;
    currencies?: {
      [key: string]: {
        currency: string;
        symbol: string;
        name: string;
        network: string;
        depositAddress: string;
        instructions: string;
        minDeposit: number;
        decimals: number;
      };
    };
  } | null>(null);
  const [userDepositsList, setUserDepositsList] = useState<any[]>([]);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [depositAddressCopied, setDepositAddressCopied] = useState(false);
  const [settlingBinary, setSettlingBinary] = useState(false);

  // Notification / Alert banner state
  const [bannerNotice, setBannerNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showNotification = (msg: string, type?: 'success' | 'error' | 'info') => {
    let resolvedType: 'success' | 'error' | 'info' = type || 'info';
    if (!type) {
      const lower = msg.toLowerCase();
      if (lower.includes('fail') || lower.includes('error') || lower.includes('cannot') || lower.includes('invalid')) {
        resolvedType = 'error';
      } else if (lower.includes('success') || lower.includes('harvested') || lower.includes('deposited') || lower.includes('unlocked') || lower.includes('activated')) {
        resolvedType = 'success';
      }
    }
    setBannerNotice({ text: msg, type: resolvedType });
    setTimeout(() => setBannerNotice(null), 6000);
  };

  // Real-time ticking interval for mining activation countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute active, running, and warmup contracts for real-time mining & payout tracking
  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE');
  const warmupContracts = activeContracts.filter((c) => {
    const createdAtTime = new Date(c.createdAt || c.purchasedAt || Date.now()).getTime();
    return (createdAtTime + 48 * 60 * 60 * 1000) > nowMs;
  });
  const runningContracts = activeContracts.filter((c) => {
    const createdAtTime = new Date(c.createdAt || c.purchasedAt || Date.now()).getTime();
    return (createdAtTime + 48 * 60 * 60 * 1000) <= nowMs;
  });

  const earliestActivation = warmupContracts.length > 0
    ? Math.min(...warmupContracts.map((c) => new Date(c.createdAt || c.purchasedAt || Date.now()).getTime() + 48 * 60 * 60 * 1000))
    : 0;
  const headerCountdownMs = Math.max(0, earliestActivation - nowMs);

  // Real-time earliest next BTC payout timestamp among all running rigs
  const earliestNextPayoutMs = runningContracts.length > 0
    ? Math.min(...runningContracts.map((c) => {
      const createdAtTime = new Date(c.createdAt || c.purchasedAt || Date.now()).getTime();
      const activationTime = createdAtTime + 48 * 60 * 60 * 1000;
      const lastHarvestTime = c.lastHarvestAt ? new Date(c.lastHarvestAt).getTime() : activationTime;
      const nextPayoutTime = c.lastHarvestAt ? (lastHarvestTime + 24 * 60 * 60 * 1000) : activationTime;
      return Math.max(0, nextPayoutTime - nowMs);
    }))
    : 0;

  // Real-time auto-refresh & auto-payout execution: when any running contract payout timer reaches 0
  const lastAutoRefreshRef = useRef<number>(0);
  useEffect(() => {
    if (!api.getToken() || runningContracts.length === 0) return;
    const hasDuePayout = runningContracts.some((c) => {
      const createdAtTime = new Date(c.createdAt || c.purchasedAt || Date.now()).getTime();
      const activationTime = createdAtTime + 48 * 60 * 60 * 1000;
      const lastHarvestTime = c.lastHarvestAt ? new Date(c.lastHarvestAt).getTime() : activationTime;
      const nextPayoutTime = c.lastHarvestAt ? (lastHarvestTime + 24 * 60 * 60 * 1000) : activationTime;
      return (nextPayoutTime - nowMs) <= 0;
    });

    if (hasDuePayout && (Date.now() - lastAutoRefreshRef.current) > 10000) {
      lastAutoRefreshRef.current = Date.now();
      api.harvestDailyYield()
        .then((res: any) => {
          refreshAllData().then(() => {
            if (res?.result?.paid && res?.result?.totalBtcDistributed > 0) {
              showNotification(
                `🎉 Automated Daily Yield Credited: +₿ ${Number(res.result.totalBtcDistributed).toFixed(8)} BTC to your wallet!`,
                'success'
              );
            }
          });
        })
        .catch(() => {
          refreshAllData();
        });
    }
  }, [nowMs, runningContracts.length]);

  // When switching to contracts tab, immediately evaluate and auto-credit any due yields
  useEffect(() => {
    if (activeTab === 'contracts' && api.getToken()) {
      api.harvestDailyYield()
        .then((res: any) => {
          if (res?.result?.paid && res?.result?.totalBtcDistributed > 0) {
            refreshAllData();
            showNotification(
              `🎉 Automated Daily Yield Credited: +₿ ${Number(res.result.totalBtcDistributed).toFixed(8)} BTC to your wallet!`,
              'success'
            );
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  // Calculation for Daily 23:59:59 Binary Settlement countdown
  const next2359TargetMs = (() => {
    const d = new Date(nowMs);
    d.setHours(23, 59, 59, 0);
    if (nowMs >= d.getTime()) {
      d.setDate(d.getDate() + 1);
    }
    return d.getTime();
  })();
  const binarySettlementMsLeft = Math.max(0, next2359TargetMs - nowMs);
  const isBinarySettlementDue = binarySettlementMsLeft <= 1500;

  // 100% Automated Daily Settlement Engine:
  // Auto-implement strictly at 23:59:59 daily (NOT instant when pairs exist or qualified for 10% pairing)
  const lastBinaryAutoSettleRef = useRef<number>(0);
  useEffect(() => {
    if (!api.getToken() || settlingBinary) return;
    const now = Date.now();
    // Auto-implement ONLY at 23:59:59 daily cycle
    const canAutoSettleAtMidnight = isBinarySettlementDue && (now - lastBinaryAutoSettleRef.current) > 30000;

    if (canAutoSettleAtMidnight) {
      lastBinaryAutoSettleRef.current = now;
      setSettlingBinary(true);
      api.settleDailyBinary()
        .then((res) => {
          if (res?.result?.settled) {
            refreshAllData();
            const { pairsPaid, rewardUsd, pairsConfiscated, starName } = res.result;
            showNotification(
              `⚡ Daily 23:59:59 Automated Settlement Complete: +${rewardUsd} USDT credited automatically to your wallet! ${pairsConfiscated > 0 ? `• [${pairsConfiscated} capped under ${starName || 'Star'}]` : ''}`,
              'success'
            );
          } else {
            refreshAllData();
          }
        })
        .catch((e) => {
          console.error('23:59:59 automated daily binary settlement error:', e);
        })
        .finally(() => {
          setSettlingBinary(false);
        });
    }
  }, [isBinarySettlementDue]);

  // Initial load
  useEffect(() => {
    initializeAppData();
    loadLiveBtcPrice();
    const priceTimer = setInterval(loadLiveBtcPrice, 30000);
    return () => clearInterval(priceTimer);
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

  const initializeAppData = async () => {
    setLoading(true);
    try {
      if (api.getToken()) {
        try {
          const check = await api.getMe();
          if (check?.user) {
            setUser(check.user);
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
      await refreshAllData();
    } catch (err: any) {
      console.error('Initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = async () => {
    try {
      const promises: Promise<any>[] = [api.getPackages()];

      if (api.getToken()) {
        promises.push(
          api.getMe(),
          api.getMyContracts(),
          api.getNetworkSummary(),
          api.getBinaryTree(),
          api.getDirectReferrals(),
          api.getTransactions(25)
        );
      }

      const results = await Promise.allSettled(promises);
      const pkgRes = results[0];

      if (pkgRes.status === 'fulfilled' && pkgRes.value?.packages) {
        setPackages(pkgRes.value.packages);
      }

      if (api.getToken() && results.length > 1) {
        const meRes = results[1];
        const contractRes = results[2];
        const summaryRes = results[3];
        const treeRes = results[4];
        const refRes = results[5];
        const txRes = results[6];

        if (meRes.status === 'rejected' && String(meRes.reason).includes('401')) {
          api.setToken(null);
          setUser(null);
        } else if (meRes.status === 'fulfilled' && meRes.value?.user) {
          setUser(meRes.value.user);
        }

        if (contractRes && contractRes.status === 'fulfilled' && contractRes.value?.contracts) setContracts(contractRes.value.contracts);
        if (summaryRes && summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
        if (treeRes && treeRes.status === 'fulfilled' && treeRes.value?.tree) {
          if (!treeRootUser) {
            setTreeData(treeRes.value.tree);
          }
        }
        if (refRes && refRes.status === 'fulfilled' && refRes.value?.referrals) setReferrals(refRes.value.referrals);
        if (txRes && txRes.status === 'fulfilled' && txRes.value?.transactions) setTransactions(txRes.value.transactions);
      }
    } catch (e) {
      console.error('Error refreshing data:', e);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    showNotification('Logged out from node.');
    router.push('/login' as any);
  };

  const handleOpenPurchase = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPurchaseModalVisible(true);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedPackage) return;
    setIsPurchasing(true);
    try {
      const res = await api.purchasePackage(selectedPackage.tier);
      setPurchaseModalVisible(false);
      await refreshAllData();

      const pairsFound = res.mlmResult?.pairedEvents?.length || 0;
      let msg = res.message || `Successfully purchased ${selectedPackage.name}! 1500-day contract activated. You are now qualified for 10% & 10% MLM bonuses!`;

      const buyerPairs = Number(res.mlmResult?.buyerPairing?.pairsMatched ?? res.mlmResult?.buyerPairing?.pairsPaid ?? 0);
      const buyerReward = Number(res.mlmResult?.buyerPairing?.rewardUsd || 0);
      if (buyerPairs > 0 && buyerReward > 0) {
        msg += ` ⚡ Qualification unlocked ${buyerPairs} Binary Pair(s) (+${buyerReward.toFixed(2)} USDT)!`;
      }
      if (res.mlmResult?.directBonusPaid) {
        const bonusAmt = Number(selectedPackage.tier || 0) * 0.1;
        msg += ` 10% Direct Bonus (${bonusAmt.toFixed(2)} USDT) awarded to qualified sponsor!`;
      }
      if (pairsFound > 0) {
        msg += ` ⚡ ${pairsFound} Binary Pairing(s) matched for qualified downline parents (10% on 1000 = 100 USDT)!`;
      }
      showNotification(msg, 'success');
    } catch (err: any) {
      showNotification(`Purchase failed: ${err?.message || 'Transaction could not be completed.'}`, 'error');
    } finally {
      setIsPurchasing(false);
    }
  };


  const handleSettleDailyBinary = async () => {
    try {
      setSettlingBinary(true);
      const res = await api.settleDailyBinary();
      await refreshAllData();
      if (res.result?.settled) {
        const { pairsPaid, rewardUsd, pairsConfiscated, confiscatedVolume } = res.result;
        showNotification(
          `⭐ Daily 23:59 Settlement Complete: ${pairsPaid} pair paid (+${rewardUsd} USDT). ${pairsConfiscated > 0 ? `⚠️ ${pairsConfiscated} pair (${confiscatedVolume} USDT volume) confiscated under 1-Star Rule (limit: 1 pair/day).` : 'No excess pairings confiscated.'}`
        );
      } else {
        showNotification(`⭐ Settlement Notice: ${res.message || 'No ready pairing to settle.'}`);
      }
    } catch (err: any) {
      showNotification(`Settlement error: ${err.message}`);
    } finally {
      setSettlingBinary(false);
    }
  };

  const loadDepositDetails = async () => {
    try {
      const res = await api.getDepositInfo();
      if (res?.success) {
        setDepositInfo({
          depositAddress: res.depositAddress,
          network: res.network,
          instructions: res.instructions,
          currencies: res.currencies,
        });
      }
      const myDepRes = await api.getMyDeposits();
      if (myDepRes?.success) {
        setUserDepositsList(myDepRes.deposits || []);
      }
    } catch (err: any) {
      console.warn('Failed to load deposit info:', err);
    }
  };

  const activeCurrencyConfig = depositInfo?.currencies?.[depositCurrency] || {
    currency: depositCurrency,
    symbol: depositCurrency,
    name: depositCurrency === 'BTC' ? 'Bitcoin' : depositCurrency === 'USDC' ? 'USD Coin' : 'Tether USD',
    network:
      depositCurrency === 'BTC'
        ? 'BTC (Native SegWit Network)'
        : depositCurrency === 'USDC'
          ? 'ERC20 (Ethereum Network)'
          : 'TRC20 (Tron Network)',
    depositAddress:
      depositCurrency === 'BTC'
        ? 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
        : depositCurrency === 'USDC'
          ? '0x71C836642F4A4E3302293515456275153A649319'
          : 'TXv2nE8gQ6R4mN9kY7bL1jF5cW3pA8sD6Z',
    instructions:
      depositCurrency === 'BTC'
        ? 'Transfer BTC directly to this Native SegWit address. Minimum deposit is 0.0001 BTC. Once sent, submit your transaction hash (TxHash) below.'
        : depositCurrency === 'USDC'
          ? 'Transfer USDC only via ERC20 network. Once sent, submit your transaction hash (TxHash) below for prompt verification and balance credit.'
          : 'Transfer USDT only via TRC20 network. Once sent, submit your transaction hash (TxHash) below for prompt verification and balance credit.',
    minDeposit: depositCurrency === 'BTC' ? 0.0001 : 10,
    decimals: depositCurrency === 'BTC' ? 8 : 2,
  };

  const handleSelectDepositCurrency = (cur: 'USDT' | 'BTC' | 'USDC') => {
    setDepositCurrency(cur);
    if (cur === 'BTC') {
      setDepositAmount('0.01');
    } else {
      setDepositAmount('1000');
    }
  };

  const handleCopyDepositAddress = () => {
    const addr = activeCurrencyConfig.depositAddress;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(addr);
      }
    } catch (_) { }
    setDepositAddressCopied(true);
    showNotification(`${depositCurrency} deposit wallet address copied to clipboard!`, 'success');
    setTimeout(() => setDepositAddressCopied(false), 3000);
  };

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    const minAmt = activeCurrencyConfig.minDeposit;
    if (!amt || amt <= 0 || amt < minAmt) {
      showNotification(`Please enter a valid deposit amount (min ${minAmt} ${depositCurrency}).`, 'error');
      return;
    }
    setIsSubmittingDeposit(true);
    try {
      const res = await api.depositFunds(
        amt,
        depositTxHash.trim() || undefined,
        activeCurrencyConfig.network,
        depositCurrency
      );
      showNotification(
        res.message || `Deposit request for ${amt} ${depositCurrency} submitted! Awaiting Admin review.`,
        'success'
      );
      setDepositTxHash('');
      await loadDepositDetails();
      await refreshAllData();
    } catch (err: any) {
      showNotification(`Deposit error: ${err.message}`, 'error');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleJoinMember = (targetParent?: string, targetLeg?: 'A' | 'B', targetRef?: string, selectedPositionParent?: string) => {
    // Current login user as parent data filled and displayed
    const currentLoginUser = user?.username || '';
    const currentLoginRef = user?.referralCode || '';

    const parentToUse = targetParent || currentLoginUser;
    const refToUse = targetRef || currentLoginRef;

    const params: Record<string, string> = {};
    if (refToUse) params.ref = refToUse;
    if (parentToUse) params.parent = parentToUse;
    if (targetLeg) params.leg = targetLeg;
    if (selectedPositionParent) params.positionParent = selectedPositionParent;

    router.push({
      pathname: '/register',
      params,
    } as any);
  };

  const handleSelectTreeNode = async (node: any) => {
    if (!node || !node.username) return;

    if (treeData && treeData.username === node.username) {
      showNotification(`Already focused on @${node.username}'s placement tree.`);
      return;
    }

    try {
      setLoadingTree(true);
      if (treeData && treeData.username) {
        setTreeHistory((prev) => [
          ...prev,
          { id: treeData.id, username: treeData.username, referralCode: treeData.referralCode },
        ]);
      }

      // Fetch binary tree rooted at selected user with depth 3 (fixed 3-level tree, not extended)
      const targetQuery = node.id != null ? String(node.id) : node.username;
      const res = await api.getBinaryTree(targetQuery, 3);
      if (res?.tree) {
        setTreeData(res.tree);
        setTreeRootUser({
          id: res.tree.id,
          username: res.tree.username,
          referralCode: res.tree.referralCode,
        });
        showNotification(`Displaying from @${res.tree.username} with Placement A/B slots.`);
      } else {
        showNotification(`Could not load tree data for @${node.username}`);
      }
    } catch (err: any) {
      showNotification(`Error loading tree: ${err.message || err}`);
    } finally {
      setLoadingTree(false);
    }
  };

  const handleStepUpTree = async () => {
    if (treeHistory.length === 0) {
      await handleResetToMyTree();
      return;
    }

    const previousHistory = [...treeHistory];
    const prevNode = previousHistory.pop();
    setTreeHistory(previousHistory);

    try {
      setLoadingTree(true);
      const targetQuery = prevNode?.id != null ? String(prevNode.id) : (prevNode?.username || (user?.id != null ? String(user.id) : user?.username));
      const res = await api.getBinaryTree(targetQuery, 3);
      if (res?.tree) {
        setTreeData(res.tree);
        if (prevNode && prevNode.username !== user?.username) {
          setTreeRootUser({
            id: res.tree.id,
            username: res.tree.username,
            referralCode: res.tree.referralCode,
          });
        } else {
          setTreeRootUser(null);
        }
        showNotification(`Stepped back up to @${res.tree.username}`);
      }
    } catch (err: any) {
      showNotification(`Error stepping up tree: ${err.message || err}`);
    } finally {
      setLoadingTree(false);
    }
  };

  const handleResetToMyTree = async () => {
    try {
      setLoadingTree(true);
      setTreeHistory([]);
      setTreeRootUser(null);
      const targetQuery = user?.id != null ? String(user.id) : user?.username;
      const res = await api.getBinaryTree(targetQuery, 3);
      if (res?.tree) {
        setTreeData(res.tree);
        showNotification('Reset Binary Tree view back to your root node.');
      }
    } catch (err: any) {
      showNotification(`Error resetting tree: ${err.message || err}`);
    } finally {
      setLoadingTree(false);
    }
  };

  const getReferralUrl = () => {
    let origin = 'http://localhost:8081';
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      origin = window.location.origin;
    }
    const refCode = user?.referralCode || 'BTCMASTER1';
    const parent = user?.username || '';
    return `${origin}/register?ref=${refCode}${parent ? `&parent=${parent}` : ''}`;
  };

  const copyReferralLink = () => {
    const fullUrl = getReferralUrl();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
    }
    showNotification(`Full invite link copied to clipboard: ${fullUrl}`);
  };

  const copyReferralCode = () => {
    if (user?.referralCode) {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(user.referralCode);
      }
      showNotification(`Referral code ${user.referralCode} copied to clipboard!`);
    }
  };

  // Binary Placement States & Handlers
  const [placingMember, setPlacingMember] = useState<string | null>(null);
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [placementTargetMember, setPlacementTargetMember] = useState<string>('');
  const [placementTargetParent, setPlacementTargetParent] = useState<string>('');
  const [placementTargetLeg, setPlacementTargetLeg] = useState<'A' | 'B'>('A');

  const handlePlaceMember = async (
    memberUsername: string,
    parentUsername?: string,
    leg?: 'A' | 'B'
  ) => {
    const targetParent = parentUsername || user?.username;
    const targetLeg = leg || 'A';

    if (!memberUsername || !targetParent) {
      showNotification('Missing member or parent username for placement.', 'error');
      return;
    }

    try {
      setPlacingMember(memberUsername);
      const res = await api.placeMember(memberUsername, targetParent, targetLeg);
      showNotification(
        `🎉 Successfully placed @${memberUsername} into Leg ${targetLeg} under @${res.result?.placedUnder || targetParent}!`,
        'success'
      );
      setShowPlacementModal(false);
      await refreshAllData();
    } catch (err: any) {
      showNotification(`Placement failed: ${err.message || err}`, 'error');
    } finally {
      setPlacingMember(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header - Mobile Responsive */}
      <View style={[styles.topHeader, isMobile && styles.topHeaderMobile]}>
        {isMobile ? (
          /* MOBILE HEADER LAYOUT (Clean, Non-overlapping, Multi-row) */
          <View style={styles.mobileHeaderWrap}>
            {/* Row 1: Brand & Sign Out / Auth */}
            <View style={styles.mobileHeaderRow1}>
              <TouchableOpacity
                style={styles.brandRow}
                onPress={() => router.push('/' as any)}
                activeOpacity={0.8}
              >
                <View style={styles.btcLogoGlow}>
                  <Text style={styles.btcLogoChar}>₿</Text>
                </View>
                <View>
                  <Text style={styles.brandTitleMobile}>BTCM // CLOUD MINING</Text>
                  <Text style={styles.brandSubtitleMobile}>MineBest Industrial Infrastructure</Text>
                </View>
              </TouchableOpacity>

              {user ? (
                <TouchableOpacity style={styles.mobileSignOutBtn} onPress={handleLogout}>
                  <Text style={styles.mobileSignOutBtnText}>Sign Out</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.mobileSignInBtn}
                    onPress={() => router.push('/login' as any)}
                  >
                    <Text style={styles.mobileSignInBtnText}>Sign In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.mobileSignUpBtn}
                    onPress={() => router.push('/register' as any)}
                  >
                    <Text style={styles.mobileSignUpBtnText}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Row 2: Live BTC Price Pill & User Profile Badge */}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={styles.mobileProfileBadgeText}>👤 @{user.username}</Text>
                    {Boolean(summary?.starRanking?.isOneStarQualified || user.isStarQualified || (user.starRank && user.starRank >= 1)) && (
                      <StarRankIndicator
                        rank={summary?.starRanking?.rank || user.starRank || 1}
                        badge={
                          (summary?.starRanking?.rank || user.starRank || 0) >= 10
                            ? '👑👑👑'
                            : (summary?.starRanking?.rank || user.starRank || 0) === 9
                              ? '👑👑'
                              : (summary?.starRanking?.rank || user.starRank || 0) === 8
                                ? '👑'
                                : (summary?.starRanking?.rank || user.starRank || 0) === 7
                                  ? '7★'
                                  : (summary?.starRanking?.rank || user.starRank || 0) === 6
                                    ? '6★'
                                    : (summary?.starRanking?.rank || user.starRank || 0) === 5
                                      ? '5★'
                                      : (summary?.starRanking?.rank || user.starRank || 0) === 4
                                        ? '4★'
                                        : (summary?.starRanking?.rank || user.starRank || 0) === 3
                                          ? '3★'
                                          : (summary?.starRanking?.rank || user.starRank || 0) === 2
                                            ? '2★'
                                            : '1★'
                        }
                        size="xs"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Row 3 (if Admin): Admin Panel Button */}
            {user?.role === 'admin' && (
              <TouchableOpacity
                style={styles.mobileAdminBtn}
                onPress={() => router.push('/admin' as any)}
              >
                <Text style={styles.adminConsoleBtnText}>🛡️ Admin Panel & Controls ➔</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* DESKTOP HEADER LAYOUT */
          <View style={styles.headerPrimaryRow}>
            <TouchableOpacity
              style={styles.brandRow}
              onPress={() => router.push('/' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.btcLogoGlow}>
                <Text style={styles.btcLogoChar}>₿</Text>
              </View>
              <View>
                <Text style={styles.brandTitle}>BTCM // CLOUD MINING</Text>
                <Text style={styles.brandSubtitle}>MineBest Infrastructure & Binary Core</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerRightActions}>
              <View style={styles.marketPill}>
                <View style={styles.liveDot} />
                <Text style={styles.marketLabel}>BTC/USDT</Text>
                <Text style={styles.marketValue}>{btcPrice.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</Text>
                <Text style={btcChange24h >= 0 ? styles.marketUp : styles.marketDown}>
                  {btcChange24h >= 0 ? `+${btcChange24h.toFixed(1)}%` : `${btcChange24h.toFixed(1)}%`}
                </Text>
              </View>

              <View style={styles.authButtonsCluster}>
                {user ? (
                  <View style={styles.userBadgeWrapper}>
                    <TouchableOpacity
                      style={styles.authBtnProfile}
                      onPress={() => router.push('/profile' as any)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.authBtnProfileText}>👤 @{user.username}</Text>
                        {Boolean(summary?.starRanking?.isOneStarQualified || user.isStarQualified || (user.starRank && user.starRank >= 1)) && (
                          <StarRankIndicator
                            rank={summary?.starRanking?.rank || user.starRank || 1}
                            badge={
                              (summary?.starRanking?.rank || user.starRank || 0) >= 10
                                ? '👑👑👑'
                                : (summary?.starRanking?.rank || user.starRank || 0) === 9
                                  ? '👑👑'
                                  : (summary?.starRanking?.rank || user.starRank || 0) === 8
                                    ? '👑'
                                    : (summary?.starRanking?.rank || user.starRank || 0) === 7
                                      ? '7★'
                                      : (summary?.starRanking?.rank || user.starRank || 0) === 6
                                        ? '6★'
                                        : (summary?.starRanking?.rank || user.starRank || 0) === 5
                                          ? '5★'
                                          : (summary?.starRanking?.rank || user.starRank || 0) === 4
                                            ? '4★'
                                            : (summary?.starRanking?.rank || user.starRank || 0) === 3
                                              ? '3★'
                                              : (summary?.starRanking?.rank || user.starRank || 0) === 2
                                                ? '2★'
                                                : '1★'
                            }
                            size="xs"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                    {user.role === 'admin' && (
                      <TouchableOpacity
                        style={styles.adminConsoleBtn}
                        onPress={() => router.push('/admin' as any)}
                      >
                        <Text style={styles.adminConsoleBtnText}>🛡️ Admin Panel</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.authBtnDanger}
                      onPress={handleLogout}
                    >
                      <Text style={styles.authBtnDangerText}>Sign Out</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.userBadgeWrapper}>
                    <TouchableOpacity
                      style={styles.authBtnPrimary}
                      onPress={() => router.push('/login' as any)}
                    >
                      <Text style={styles.authBtnPrimaryText}>⚡ Sign In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.authBtnSecondary}
                      onPress={() => router.push('/register' as any)}
                    >
                      <Text style={styles.authBtnSecondaryText}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Wallet Bar (Logged In Member) or Guest Visitor Banner */}
      {user ? (
        <View style={[styles.walletBar, isMobile && styles.walletBarMobile]}>
          <View style={[styles.walletStats, isMobile && styles.walletStatsMobile]}>
            <View style={[styles.statBox, isMobile && styles.statBoxMobile]}>
              <Text style={styles.statLabel}>USDT/USDC BALANCE</Text>
              <Text style={styles.statUsd}>{user?.wallet?.usdBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</Text>
            </View>
            <View style={[styles.statBox, isMobile && styles.statBoxMobile]}>
              <Text style={styles.statLabel}>BITCOIN</Text>
              <Text style={styles.statBtc}>₿ {user?.wallet?.btcBalance?.toFixed(8) || '0.00000000'} BTC</Text>
              <Text style={styles.statBtcUsd}>≈ {((user?.wallet?.btcBalance || 0) * btcPrice).toFixed(2)} USDT</Text>
            </View>
            <View style={[styles.statBox, isMobile && styles.statBoxMobile]}>
              <Text style={styles.statLabel}>10% DIRECT BONUS</Text>
              <Text style={styles.statDirect}>+{user?.wallet?.totalDirectEarned?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={[styles.statBox, isMobile && styles.statBoxMobile]}>
              <Text style={styles.statLabel}>10% BINARY PAIRING</Text>
              <Text style={styles.statBinary}>+{user?.wallet?.totalBinaryEarned?.toFixed(2) || '0.00'}</Text>
              <Text style={styles.statSub}>{summary?.pairsCount || 0} Pairs (100 USDT/ea)</Text>
            </View>
          </View>

          <View style={[styles.walletActions, isMobile && styles.walletActionsMobile]}>
            <TouchableOpacity style={[styles.actionBtnTransfer, isMobile && styles.actionBtnFlex]} onPress={() => router.push('/transfer' as any)}>
              <Text style={styles.actionBtnTransferText}>⇄ Transfer & Withdraw</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtnDeposit, isMobile && styles.actionBtnFlex]}
              onPress={() => {
                loadDepositDetails();
                setDepositModalVisible(true);
              }}
            >
              <Text style={styles.actionBtnText}>+ Deposit (USDT/BTC/USDC)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtnRegister, isMobile && styles.actionBtnFlex]} onPress={() => handleJoinMember()}>
              <Text style={styles.actionBtnText}>+ Sign Up Member</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[styles.guestBar, isMobile && styles.guestBarMobile]}>
          <View style={styles.guestBarLeft}>
            <View style={styles.guestStatusPill}>
              <View style={styles.guestStatusDot} />
              <Text style={styles.guestStatusText}>GUEST VISITOR MODE</Text>
            </View>
            <Text style={styles.guestBarTitle}>Explore MineBest Institutional Cloud Mining</Text>
            <Text style={styles.guestBarSub}>
              Live facility telemetry, 1,500-day ASIC mining packages, and the 10% Dual MLM engine. Sign in or register to activate your mining power!
            </Text>
          </View>
        </View>
      )}

      {/* Floating System Notice Banner */}
      {bannerNotice && (
        <View
          style={[
            styles.bannerNoticeBox,
            bannerNotice.type === 'error'
              ? styles.bannerNoticeBoxError
              : bannerNotice.type === 'info'
                ? styles.bannerNoticeBoxInfo
                : styles.bannerNoticeBoxSuccess,
          ]}
        >
          <Text
            style={[
              styles.bannerNoticeText,
              bannerNotice.type === 'error'
                ? styles.bannerNoticeTextError
                : bannerNotice.type === 'info'
                  ? styles.bannerNoticeTextInfo
                  : styles.bannerNoticeTextSuccess,
            ]}
          >
            {bannerNotice.text}
          </Text>
        </View>
      )}

      {/* Navigation Tabs - Horizontally Scrollable on Mobile */}
      <View style={styles.navTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navTabsScroll}>
          <TouchableOpacity
            style={[styles.navTab, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: 'rgba(56, 189, 248, 0.3)' }]}
            onPress={() => router.push('/' as any)}
          >
            <Text style={[styles.navTabText, { color: '#38BDF8', fontWeight: '800' }]}>
              ← 🏛️ Main Home Page
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'packages' && styles.navTabActive]}
            onPress={() => setActiveTab('packages')}
          >
            <Text style={[styles.navTabText, activeTab === 'packages' && styles.navTabTextActive]}>
              ⚡ Mining Packages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'binary' && styles.navTabActive]}
            onPress={() => setActiveTab('binary')}
          >
            <Text style={[styles.navTabText, activeTab === 'binary' && styles.navTabTextActive]}>
              🌲 Binary Placement Tree
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'referrals' && styles.navTabActive]}
            onPress={() => setActiveTab('referrals')}
          >
            <Text style={[styles.navTabText, activeTab === 'referrals' && styles.navTabTextActive]}>
              👥 Direct Referrals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'contracts' && styles.navTabActive]}
            onPress={() => setActiveTab('contracts')}
          >
            <Text style={[styles.navTabText, activeTab === 'contracts' && styles.navTabTextActive]}>
              ⛏️ My Contracts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, { backgroundColor: 'rgba(247, 147, 26, 0.12)', borderColor: 'rgba(247, 147, 26, 0.4)' }]}
            onPress={() => router.push('/trade' as any)}
          >
            <Text style={[styles.navTabText, { color: '#F7931A', fontWeight: '800' }]}>
              🪙 Buy / Sell BTC
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={[styles.contentScroll, isMobile && styles.contentScrollMobile]}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#F7931A" />
            <Text style={styles.loadingText}>Syncing Bitcoin Mining & Network...</Text>
          </View>
        ) : (
          <>
            {/* TAB 1: MINING PACKAGES */}
            {activeTab === 'packages' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Bitcoin Cloud Mining Contracts</Text>
                    <Text style={styles.sectionSubtitle}>
                      Official tiers: min 100, 300, 1,000, 5,000, 10,000, 30,000 USDT • Daily Bitcoin ROI for up to 1,500 Days
                    </Text>
                  </View>
                  <View style={[styles.referralHighlightPill, isMobile && styles.fullWidthPill]}>
                    <Text style={styles.referralHighlightText}>
                      ⭐ 10% Direct Bonus & 10% Pairing (Mining Service Purchase Required to Qualify)
                    </Text>
                  </View>
                </View>

                {/* Hardware & Infrastructure Visual Card */}
                <View style={[styles.storeHeroBanner, isMobile && styles.storeHeroBannerMobile]}>
                  <Image source={AsicHardwareImg} style={styles.storeHeroImage} resizeMode="cover" />
                  <View style={styles.storeHeroOverlay}>
                    <View style={[styles.storeHeroTop, isMobile && styles.storeHeroTopMobile]}>
                      <View style={styles.storeHeroPill}>
                        <View style={styles.storeHeroDotGreen} />
                        <Text style={styles.storeHeroPillText}>300+ MW MINEBEST DATA CENTER FLEET</Text>
                      </View>
                      <Text style={styles.storeHeroSpecs}>Tier-III • 1,500-Day Hardware Lifecycle</Text>
                    </View>
                    <View style={styles.storeHeroBottom}>
                      <Text style={styles.storeHeroTitle}>High-Density Physical ASIC Hashrate</Text>
                      <Text style={styles.storeHeroSubtitle}>
                        Direct allocation from MicroBT WhatsMiner & Bitmain Antminer clusters in Poland & Kazakhstan. 100% automated daily yield credited every 24 hours.
                      </Text>
                    </View>
                  </View>
                </View>

                {packages.length === 0 ? (
                  <View style={styles.emptyContractBox}>
                    <ActivityIndicator size="small" color="#F7931A" />
                    <Text style={styles.emptySubtitle}>Loading available mining packages...</Text>
                    <TouchableOpacity
                      style={{ marginTop: 10, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F7931A', borderRadius: 8 }}
                      onPress={() => setPackages(OFFICIAL_MINING_PACKAGES)}
                    >
                      <Text style={{ color: '#000', fontWeight: 'bold' }}>⚡ Load Mining Packages</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.packageGrid}>
                    {packages.map((pkg) => {
                      const isAffordable = (user?.wallet?.usdBalance || 0) >= pkg.tier;
                      return (
                        <View key={pkg._id || pkg.tier} style={[styles.packageCard, isMobile && styles.packageCardMobile]}>
                          <View style={styles.cardHeader}>
                            <View style={styles.badgePill}>
                              <Text style={styles.badgeText}>{pkg.badge || 'ASIC RIG'}</Text>
                            </View>
                            <Text style={styles.tierDuration}>MAX {pkg.maxDays || 1000} DAYS</Text>
                          </View>

                          <Text style={styles.pkgTitle}>{pkg.name}</Text>
                          <Text style={styles.pkgTagline}>{pkg.tagline}</Text>

                          <View style={styles.priceRow}>
                            <Text style={styles.priceAmount}>{pkg.tier.toLocaleString()}</Text>
                            <Text style={styles.priceCurrency}>USDT</Text>
                          </View>

                          <View style={styles.pkgSpecs}>
                            <View style={styles.specRow}>
                              <Text style={styles.specLabel}>Hashrate Capacity:</Text>
                              <Text style={styles.specValueGold}>{pkg.hashrate}</Text>
                            </View>
                            <View style={styles.specRow}>
                              <Text style={styles.specLabel}>Daily Bitcoin Yield:</Text>
                              <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.specValueGreen}>
                                  {isRandomYieldPackage(pkg)
                                    ? `₿ ${getPackageYieldRange(pkg).min.toFixed(8)} ~ ${getPackageYieldRange(pkg).max.toFixed(8)} BTC/day`
                                    : `₿ ${pkg.dailyBtcYield.toFixed(6)} BTC/day`}
                                </Text>
                                {isRandomYieldPackage(pkg) && (
                                  <Text style={{ fontSize: 9, color: '#00F0FF', fontWeight: '700' }}>⚡ Daily Output</Text>
                                )}
                              </View>
                            </View>
                            {/* <View style={styles.specRow}>
                              <Text style={styles.specLabel}>Est. Daily Value:</Text>
                              <Text style={styles.specValue}>
                                {isRandomYieldPackage(pkg)
                                  ? `≈ ${(getPackageYieldRange(pkg).min * 98420).toFixed(2)} ~ ${(getPackageYieldRange(pkg).max * 98420).toFixed(2)} USDT/day`
                                  : `≈ ${pkg.estimatedDailyUsd?.toFixed(2)} USDT/day`}
                              </Text>
                            </View> */}
                            <View style={styles.specRow}>
                              <Text style={styles.specLabel}>Total 1500-Day Yield:</Text>
                              <Text style={styles.specValueBtc}>
                                {isRandomYieldPackage(pkg)
                                  ? `₿ ${(getPackageYieldRange(pkg).min * 1500).toFixed(4)} ~ ${(getPackageYieldRange(pkg).max * 1500).toFixed(4)} BTC`
                                  : `₿ ${(pkg.dailyBtcYield * 1500).toFixed(4)} BTC`}
                              </Text>
                            </View>
                            <View style={styles.specRow}>
                              <Text style={styles.specLabel}>Sponsor 10% Bonus:</Text>
                              <Text style={styles.specValueReward}>+{(pkg.tier * 0.1).toFixed(2)} USDT</Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[styles.buyBtn, !isAffordable && styles.buyBtnDisabled]}
                            onPress={() => handleOpenPurchase(pkg)}
                          >
                            <Text style={styles.buyBtnText}>
                              {isAffordable ? `Purchase ${pkg.tier.toLocaleString()} USDT Service` : `Need ${(pkg.tier - (user?.wallet?.usdBalance || 0)).toFixed(0)} USDT more`}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: BINARY MLM PLACEMENT TREE */}
            {activeTab === 'binary' && (
              <View style={styles.tabContent}>
                {/* Pairing Rules Card */}
                <View style={styles.pairingBannerCard}>
                  <View style={styles.pairingBannerHeader}>
                    <Text style={styles.pairingBannerTitle}>⚡ Binary Pairing Engine (Leg A & Leg B)</Text>
                    <View style={styles.rateBadge}>
                      <Text style={styles.rateBadgeText}>10% REWARD ON 1,000</Text>
                    </View>
                  </View>
                  <Text style={styles.pairingBannerDesc}>
                    When Binary <Text style={styles.boldWhite}>Leg A</Text> hits <Text style={styles.boldGold}>1,000</Text> AND Binary <Text style={styles.boldWhite}>Leg B</Text> hits <Text style={styles.boldGold}>1,000</Text>, parent gets an instant <Text style={styles.boldGreen}>10% reward (100 USDT)</Text> one-time. After pairing 1,000, volume restarts from 0, ready for the next 1,000 pairing! Only users who have already purchased a mining service qualify to receive the 10% Binary Pairing reward.
                  </Text>

                  <View style={styles.qualNoticeRow}>
                    <View style={[styles.qualNoticeBadge, (user?.wallet?.totalInvested || 0) > 0 ? styles.qualNoticeBadgeActive : styles.qualNoticeBadgeInactive]}>
                      <Text style={[styles.qualNoticeBadgeText, (user?.wallet?.totalInvested || 0) > 0 ? styles.qualNoticeBadgeTextActive : styles.qualNoticeBadgeTextInactive]}>
                        {(user?.wallet?.totalInvested || 0) > 0 ? '✓ QUALIFIED FOR 10% PAIRING' : '⚠️ UNQUALIFIED (PURCHASE SERVICE TO QUALIFY)'}
                      </Text>
                    </View>
                    <Text style={styles.qualNoticeSub}>
                      {(user?.wallet?.totalInvested || 0) > 0
                        ? `Active Mining Contract (${user?.wallet?.totalInvested?.toLocaleString()} USDT invested). You qualify to receive 10% Binary Pairing.`
                        : 'Rule: You must already purchase a mining service to qualify to receive 10% Binary Pairing.'}
                    </Text>
                  </View>

                  {/* Volume Tracker Gauges */}
                  <View style={[styles.gaugeContainer, isMobile && styles.gaugeContainerMobile]}>
                    <View style={[styles.gaugeBox, isMobile && styles.gaugeBoxMobile]}>
                      <View style={styles.gaugeHeader}>
                        <Text style={styles.gaugeTitle}>LEG A (LEFT PLACEMENT)</Text>
                        <Text style={styles.gaugeTotal}>All-time: {summary?.leftLeg?.totalVolume?.toLocaleString() || 0} USDT</Text>
                      </View>
                      <View style={styles.progressBarWrapper}>
                        <View
                          style={[
                            styles.progressBarFillA,
                            { width: `${Math.min(100, ((summary?.leftLeg?.currentVolume || 0) / 1000) * 100)}%` },
                          ]}
                        />
                      </View>
                      <View style={styles.gaugeFooter}>
                        <Text style={styles.gaugeCurrent}>
                          Current: <Text style={styles.boldGold}>{summary?.leftLeg?.currentVolume || 0}</Text> / 1,000
                        </Text>
                        <Text style={styles.gaugeNeeded}>
                          {(summary?.nextPairNeeded?.legA || 0) === 0 ? '✓ Ready' : `+${summary?.nextPairNeeded?.legA} to Pair`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pairIconBox}>
                      <Text style={styles.pairIconText}>⚖️</Text>
                      <Text style={styles.pairMatchesText}>{summary?.pairsCount || 0} PAIRS</Text>
                      <Text style={styles.pairTotalEarned}>{summary?.totalBinaryBonus?.toFixed(2) || '0.00'}</Text>
                    </View>

                    <View style={[styles.gaugeBox, isMobile && styles.gaugeBoxMobile]}>
                      <View style={styles.gaugeHeader}>
                        <Text style={styles.gaugeTitle}>LEG B (RIGHT PLACEMENT)</Text>
                        <Text style={styles.gaugeTotal}>All-time: {summary?.rightLeg?.totalVolume?.toLocaleString() || 0} USDT</Text>
                      </View>
                      <View style={styles.progressBarWrapper}>
                        <View
                          style={[
                            styles.progressBarFillB,
                            { width: `${Math.min(100, ((summary?.rightLeg?.currentVolume || 0) / 1000) * 100)}%` },
                          ]}
                        />
                      </View>
                      <View style={styles.gaugeFooter}>
                        <Text style={styles.gaugeCurrent}>
                          Current: <Text style={styles.boldGold}>{summary?.rightLeg?.currentVolume || 0}</Text> / 1,000
                        </Text>
                        <Text style={styles.gaugeNeeded}>
                          {(summary?.nextPairNeeded?.legB || 0) === 0 ? '✓ Ready' : `+${summary?.nextPairNeeded?.legB} to Pair`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* STAR RANKING & 23:59 DAILY BINARY SETTLEMENT CARD */}
                <View style={[styles.starRankCard, isMobile && styles.starRankCardMobile]}>
                  <View style={[styles.starRankHeader, isMobile && styles.starRankHeaderMobile]}>
                    <View style={isMobile ? { width: '100%' } : { flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={styles.starRankTitle}>STAR RANKING & 23:59 SETTLEMENT</Text>
                        <StarRankIndicator
                          rank={summary?.starRanking?.rank || 0}
                          isQualified={summary?.starRanking?.isOneStarQualified}
                          badge={summary?.starRanking?.badge}
                          size="sm"
                        />
                      </View>
                      <Text style={styles.starRankSub}>
                        {summary?.starRanking?.name || 'Star Ranking System'}: 1★ (1,000 Sales) = 1 Pair • 2★ (Min 300 Service + 2,000 Sales) = 2 Pairs • 3★ (Min 1,000 Service + 10,000 Sales) = 4 Pairs • 4★ (Min 5,000 Service + 50,000 Sales) = 6 Pairs • 5★ (Min 5,000 Service + 100,000 Sales) = 7 Pairs • 6★ (Min 10,000 Service + 1,000,000 Sales) = 9 Pairs • 7★ (Min 30,000 Service + 5,000,000 Sales) = 11 Pairs • 👑 Crown (Min 30,000 Service + 10,000,000 Sales) = 13 Pairs • 👑👑 2 Crown (Min 60,000 Service + 50,000,000 Sales) = 15 Pairs • 👑👑👑 3 Crown (Min 100,000 Service + 100,000,000 Sales) = 18 Pairs/Day at 23:59.
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.autoSettlementBadgeHeader,
                        isMobile && styles.autoSettlementBadgeHeaderMobile,
                        settlingBinary && { opacity: 0.8 },
                      ]}
                    >
                      <View style={styles.autoSettlementTopRow}>
                        <View style={styles.indicatorPulseGreen} />
                        <Text style={styles.autoSettlementHeaderText}>
                          {settlingBinary
                            ? '⚡ EXECUTING 23:59:59 AUTO-SETTLEMENT...'
                            : '🟢 100% AUTOMATED DAILY SETTLEMENT'}
                        </Text>
                      </View>
                      <Text style={styles.autoSettlementCountdownTimer}>
                        {settlingBinary
                          ? 'AUTO-CREDITING USDT...'
                          : `23:59:59 IN ${formatCountdown(binarySettlementMsLeft)}`}
                      </Text>
                      <Text style={styles.autoSettlementSubText}>
                        {settlingBinary
                          ? 'Depositing 10% Pairing Bonus to USDT Balance...'
                          : (summary?.starRanking?.pendingPaidPairs && summary.starRanking.pendingPaidPairs > 0)
                            ? `⚡ ${summary.starRanking.pendingPaidPairs} Pair(s) Queued (+${summary.starRanking.pendingPaidPairs * 100} USDT) • Auto-settled on 23:59:59 daily`
                            : '✓ 100% Automated System • Auto-Credited on 23:59:59 Daily (No manual click required)'}
                      </Text>
                    </View>
                  </View>

                  {/* Dual Requirement Progress: Direct Placement Sales & Personal Mining Service */}
                  <View style={styles.starProgressContainer}>
                    {/* 1. Direct Placement Tree Volume */}
                    <View style={styles.starProgressHeaderRow}>
                      <Text style={styles.starProgressLabel}>
                        Direct Placement Tree Volume: <Text style={{ color: '#00F0FF', fontWeight: '800' }}>{(summary?.starRanking?.directPlacementVolume || 0).toLocaleString()} USDT</Text> / {(summary?.starRanking?.targetVolume || 1000).toLocaleString()} USDT
                      </Text>
                      <Text style={[styles.starProgressStatus, summary?.starRanking?.isThreeCrownQualified ? { color: '#FFF275' } : summary?.starRanking?.isTwoCrownQualified ? { color: '#FFE000' } : summary?.starRanking?.isCrownQualified ? { color: '#FFD700' } : summary?.starRanking?.isSevenStarQualified ? { color: '#FFE600' } : summary?.starRanking?.isSixStarQualified ? { color: '#FF007F' } : summary?.starRanking?.isFiveStarQualified ? styles.textCyan : summary?.starRanking?.isFourStarQualified ? styles.textPurple : summary?.starRanking?.isThreeStarQualified ? styles.textGreen : summary?.starRanking?.isTwoStarQualified ? styles.textCyan : summary?.starRanking?.isOneStarQualified ? styles.textCyan : styles.textOrange]}>
                        {summary?.starRanking?.isThreeCrownQualified
                          ? '✓ 3 CROWN QUALIFIED (100,000,000+ USDT)'
                          : summary?.starRanking?.isTwoCrownQualified
                            ? `✓ 2 CROWN (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to 3 Crown)`
                            : summary?.starRanking?.isCrownQualified
                              ? `✓ CROWN (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to 2 Crown)`
                              : summary?.starRanking?.isSevenStarQualified
                                ? `✓ 7 STAR (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to Crown)`
                                : summary?.starRanking?.isSixStarQualified
                                  ? `✓ 6 STAR (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to 7★)`
                                  : summary?.starRanking?.isFiveStarQualified
                                    ? `✓ 5 STAR (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to 6★)`
                                    : summary?.starRanking?.isFourStarQualified
                                      ? `✓ 4 STAR (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to 5★)`
                                      : summary?.starRanking?.isThreeStarQualified
                                        ? `✓ 3 STAR (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to 4★)`
                                        : summary?.starRanking?.isTwoStarQualified
                                          ? `✓ 2 STAR (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to 3★)`
                                          : summary?.starRanking?.isOneStarQualified
                                            ? `✓ 1 STAR (Need +${(summary?.starRanking?.volumeNeededForNextRank || 0).toLocaleString()} to 2★)`
                                            : `+${(summary?.starRanking?.volumeNeededForNextRank || 1000).toLocaleString()} USDT to 1★`}
                      </Text>
                    </View>
                    <View style={styles.starProgressBarTrack}>
                      <View
                        style={[
                          styles.starProgressBarFill,
                          {
                            width: `${Math.min(
                              100,
                              ((summary?.starRanking?.directPlacementVolume || 0) /
                                (summary?.starRanking?.targetVolume || 1000)) *
                              100
                            )}%`,
                          },
                        ]}
                      />
                    </View>

                    {/* 2. Personal Mining Service Purchase (Min 100,000 for 3 Crown, 60,000 for 2 Crown, 30,000 for Crown & 7-Star, 10,000 for 6-Star, 5,000 for 5-Star & 4-Star, 1,000 for 3-Star, 300 for 2-Star) */}
                    <View style={[styles.starProgressHeaderRow, { marginTop: 10 }]}>
                      <Text style={styles.starProgressLabel}>
                        Personal Mining Service: <Text style={{ color: '#F7931A', fontWeight: '800' }}>{(summary?.starRanking?.personalInvested || user?.wallet?.totalInvested || 0).toLocaleString()} USDT</Text> / {(summary?.starRanking?.minPersonalRequired || 300).toLocaleString()} USDT ({(summary?.starRanking?.rank || 0) >= 9 ? '👑👑👑 3 Crown' : (summary?.starRanking?.rank || 0) === 8 ? '👑👑 2 Crown' : (summary?.starRanking?.rank || 0) === 7 ? '👑 Crown' : (summary?.starRanking?.rank || 0) === 6 ? '7★' : (summary?.starRanking?.rank || 0) === 5 ? '6★' : (summary?.starRanking?.rank || 0) === 4 ? '5★' : (summary?.starRanking?.rank || 0) === 3 ? '4★' : (summary?.starRanking?.rank || 0) === 2 ? '3★' : '2★'} Requirement)
                      </Text>
                      <Text
                        style={[
                          styles.starProgressStatus,
                          (summary?.starRanking?.personalInvested || user?.wallet?.totalInvested || 0) >= (summary?.starRanking?.minPersonalRequired || 300)
                            ? styles.textGreen
                            : styles.textOrange,
                        ]}
                      >
                        {(summary?.starRanking?.personalInvested || user?.wallet?.totalInvested || 0) >= (summary?.starRanking?.minPersonalRequired || 300)
                          ? `✓ ${(summary?.starRanking?.minPersonalRequired || 300).toLocaleString()} USDT MIN SERVICE MET`
                          : `Need +${Math.max(0, (summary?.starRanking?.minPersonalRequired || 300) - (summary?.starRanking?.personalInvested || user?.wallet?.totalInvested || 0)).toLocaleString()} USDT for ${(summary?.starRanking?.rank || 0) >= 9 ? '👑👑👑 3 Crown' : (summary?.starRanking?.rank || 0) === 8 ? '👑👑 2 Crown' : (summary?.starRanking?.rank || 0) === 7 ? '👑 Crown' : (summary?.starRanking?.rank || 0) === 6 ? '7★' : (summary?.starRanking?.rank || 0) === 5 ? '6★' : (summary?.starRanking?.rank || 0) === 4 ? '5★' : (summary?.starRanking?.rank || 0) === 3 ? '4★' : (summary?.starRanking?.rank || 0) === 2 ? '3★' : '2★'}`}
                      </Text>
                    </View>
                    <View style={styles.starProgressBarTrack}>
                      <View
                        style={[
                          styles.starProgressBarFill,
                          {
                            backgroundColor: '#F7931A',
                            width: `${Math.min(
                              100,
                              (((summary?.starRanking?.personalInvested || user?.wallet?.totalInvested || 0) / (summary?.starRanking?.minPersonalRequired || 300)) *
                                100)
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Today's Pairing Breakdown & Confiscation Info */}
                  <View style={[styles.starMetricsGrid, isMobile && styles.starMetricsGridMobile]}>
                    <View style={styles.starMetricItem}>
                      <Text style={styles.starMetricLabel}>DAILY PAIRING LIMIT</Text>
                      <Text style={[styles.starMetricValue, (summary?.starRanking?.rank || 0) >= 10 ? { color: '#FFF275' } : (summary?.starRanking?.rank || 0) === 9 ? { color: '#FFE000' } : (summary?.starRanking?.rank || 0) === 8 ? { color: '#FFD700' } : (summary?.starRanking?.rank || 0) === 7 ? { color: '#FFE600' } : (summary?.starRanking?.rank || 0) === 6 ? { color: '#FF007F' } : (summary?.starRanking?.rank || 0) === 5 ? { color: '#00F0FF' } : (summary?.starRanking?.rank || 0) === 4 ? { color: '#C084FC' } : (summary?.starRanking?.rank || 0) === 3 ? { color: '#FF5722' } : (summary?.starRanking?.rank || 0) === 2 ? { color: '#FFA726' } : {}]}>
                        {summary?.starRanking?.maxDailyPairs || 0} TIME{(summary?.starRanking?.maxDailyPairs || 0) === 1 ? '' : 'S'} / DAY
                      </Text>
                      <Text style={styles.starMetricSub}>
                        Max {((summary?.starRanking?.maxDailyPairs || 0) * 100).toLocaleString()} USDT at 23:59
                      </Text>
                    </View>

                    <View style={styles.starMetricItem}>
                      <Text style={styles.starMetricLabel}>PENDING AT 23:59</Text>
                      <Text style={styles.starMetricValue}>
                        {summary?.starRanking?.totalPairsReady || 0} PAIRS READY
                      </Text>
                      <Text style={styles.starMetricSub}>
                        {summary?.starRanking?.pendingPaidPairs || 0} will pay • {summary?.starRanking?.pendingConfiscatedPairs || 0} will confiscate
                      </Text>
                    </View>

                    <View style={styles.starMetricItem}>
                      <Text style={styles.starMetricLabel}>CONFISCATED BY SYSTEM</Text>
                      <Text style={[styles.starMetricValue, (summary?.starRanking?.pendingConfiscatedVolume || 0) > 0 ? { color: '#EF4444' } : { color: '#94A3B8' }]}>
                        {summary?.starRanking?.pendingConfiscatedVolume ? `${summary.starRanking.pendingConfiscatedVolume} USDT` : '0 USDT'}
                      </Text>
                      <Text style={styles.starMetricSub}>Excess pairs beyond daily limit</Text>
                    </View>

                    <View style={styles.starMetricItem}>
                      <Text style={styles.starMetricLabel}>NEXT SETTLEMENT</Text>
                      <Text style={[styles.starMetricValue, { color: '#00FF66' }]}>
                        {formatCountdown(binarySettlementMsLeft)}
                      </Text>
                      <Text style={styles.starMetricSub}>Auto-executes at 23:59:00</Text>
                    </View>
                  </View>

                  {/* Rule Banner */}
                  <View style={styles.starRuleBanner}>
                    <Text style={styles.starRuleIcon}>📜</Text>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.starRuleText}>
                        <Text style={styles.boldGold}>★ 1 Star User Rule:</Text> Direct placement tree volume ≥ 1,000 USDT gives BINARY PAIRING 1 time only per day (100 USDT). Second 1,000 pairing is confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#FFA726', fontWeight: '800' }}>★★ 2 Star User Rule:</Text> Min purchased 300 USDT mining service + direct placement tree volume ≥ 2,000 USDT gives BINARY PAIRING 2 times only per day (200 USDT). Excess pairings beyond 2 are confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#FF5722', fontWeight: '800' }}>★★★ 3 Star User Rule:</Text> Min purchased 1,000 USDT mining service + direct placement tree volume ≥ 10,000 USDT gives BINARY PAIRING 4 times only per day (400 USDT). Excess pairings beyond 4 are confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#C084FC', fontWeight: '800' }}>★★★★ 4 Star User Rule:</Text> Min purchased 5,000 USDT mining service + direct placement tree volume ≥ 50,000 USDT gives BINARY PAIRING 6 times only per day (600 USDT). Excess pairings beyond 6 are confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#00F0FF', fontWeight: '800' }}>★★★★★ 5 Star User Rule:</Text> Min purchased 5,000 USDT mining service + direct placement tree volume ≥ 100,000 USDT gives BINARY PAIRING 7 times only per day (700 USDT). Excess pairings beyond 7 are confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#FF007F', fontWeight: '800' }}>★★★★★★ 6 Star User Rule:</Text> Min purchased 10,000 USDT mining service + below placement tree volume ≥ 1,000,000 USDT gives BINARY PAIRING 9 times only per day (900 USDT). Excess pairings beyond 9 are confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#FFE600', fontWeight: '800' }}>★★★★★★★ 7 Star User Rule:</Text> Min purchased 30,000 USDT mining service + below placement tree volume ≥ 5,000,000 USDT gives BINARY PAIRING 11 times only per day (1,100 USDT). Excess pairings beyond 11 are confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#FFD700', fontWeight: '800' }}>👑 Crown User Rule:</Text> Min purchased 30,000 USDT mining service + below placement tree volume ≥ 10,000,000 USDT gives BINARY PAIRING 13 times only per day (1,300 USDT). Excess pairings beyond 13 are confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#FFE000', fontWeight: '800' }}>👑👑 2 Crown User Rule:</Text> Min purchased 60,000 USDT mining service + below placement tree volume ≥ 50,000,000 USDT gives BINARY PAIRING 15 times only per day (1,500 USDT). Excess pairings beyond 15 are confiscated by system.
                      </Text>
                      <Text style={styles.starRuleText}>
                        <Text style={{ color: '#FFF275', fontWeight: '800' }}>👑👑👑 3 Crown User Rule:</Text> Min purchased 100,000 USDT mining service + below placement tree volume ≥ 100,000,000 USDT gives BINARY PAIRING 18 times only per day (1,800 USDT). Excess pairings beyond 18 are confiscated by system.
                      </Text>
                      <Text style={[styles.starRuleText, { color: '#94A3B8', fontSize: 11 }]}>
                        ⚡ All binary pairing bonuses and confiscations implement automatically on 23:59 every day.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Binary Tree Visualizer Section */}
                <View style={styles.treeSection}>
                  <View style={styles.treeSectionHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>Interactive Binary Network Tree</Text>
                      <Text style={styles.sectionSubtitle}>
                        {isMobile ? '↔ Swipe horizontally to inspect downlines' : 'Visual hierarchy showing downlines, leg placement (A / B), and active volume'}
                      </Text>
                    </View>
                  </View>

                  {/* Drill-down Sub-Tree Focus Bar */}
                  {treeRootUser ? (
                    <View style={[styles.treeDrillDownBar, isMobile && styles.treeDrillDownBarMobile]}>
                      <View style={[styles.treeDrillDownInfo, isMobile && styles.treeDrillDownInfoMobile]}>
                        <View style={styles.treeDrillDownIcon}>
                          <Text style={{ fontSize: 16 }}>🌿</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.treeDrillDownTitle}>FOCUS VIEW:</Text>
                            <Text style={styles.treeDrillDownUsername}>@{treeRootUser.username}</Text>
                            <View style={styles.activeRootBadge}>
                              <Text style={styles.activeRootBadgeText}>
                                {treeData?.binaryPosition ? `LEAF ${treeData.binaryPosition} USER` : 'LEAF USER'}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.treeDrillDownSub}>
                            Viewing downlines and slots from Leaf {treeData?.binaryPosition || 'A'} user @{treeRootUser.username} (not become a root user).
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.treeDrillDownButtonsRow, isMobile && styles.treeDrillDownButtonsRowMobile]}>
                        {treeHistory.length > 0 && (
                          <TouchableOpacity style={[styles.treeBackBtn, isMobile && { flex: 1, alignItems: 'center' }]} onPress={handleStepUpTree}>
                            <Text style={styles.treeBackBtnText}>⬅ Back 1 Level</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.treeResetBtn, isMobile && { flex: 1, alignItems: 'center' }]} onPress={handleResetToMyTree}>
                          <Text style={styles.treeResetBtnText}>🔄 Reset to My Tree</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.treeTipBar}>
                      <Text style={styles.treeTipText}>
                        💡 Tip: Click on any member card (including leaf A / leaf B downlines) to display their placement A/B slots.
                      </Text>
                    </View>
                  )}

                  <View style={styles.treeCanvas}>
                    {loadingTree && (
                      <View style={styles.treeLoadingOverlay}>
                        <ActivityIndicator color="#00F0FF" size="small" />
                        <Text style={styles.treeLoadingText}>Loading Placement Tree...</Text>
                      </View>
                    )}
                    <BinaryTreeVisualizer
                      tree={treeData}
                      onSelectNode={(node) => {
                        handleSelectTreeNode(node);
                      }}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* TAB 3: DIRECT REFERRALS (10% BONUS) */}
            {activeTab === 'referrals' && (
              <View style={styles.tabContent}>
                <View style={styles.refLinkCard}>
                  <View style={[styles.refCardHeaderRow, isMobile && styles.refCardHeaderRowMobile]}>
                    <View style={isMobile ? { width: '100%' } : { flex: 1 }}>
                      <Text style={styles.refTitle}>Sponsor Referral Link & Binary Placement</Text>
                      <Text style={styles.refDesc}>
                        When newcomers register with your code and buy any mining service tier, you receive an instant <Text style={styles.boldGreen}>10% one-time reward</Text> credited to your USDT balance! Only users who have already purchased a mining service qualify to receive the 10% Direct Bonus.
                      </Text>
                    </View>
                    <View style={[styles.autoFilledPillContainer, isMobile && { alignSelf: 'flex-start' }]}>
                      <Text style={styles.autoFilledPillText}>⚡ ACTIVE SPONSOR NODE</Text>
                    </View>
                  </View>

                  <View style={styles.qualNoticeRow}>
                    <View style={[styles.qualNoticeBadge, (user?.wallet?.totalInvested || 0) > 0 ? styles.qualNoticeBadgeActive : styles.qualNoticeBadgeInactive]}>
                      <Text style={[styles.qualNoticeBadgeText, (user?.wallet?.totalInvested || 0) > 0 ? styles.qualNoticeBadgeTextActive : styles.qualNoticeBadgeTextInactive]}>
                        {(user?.wallet?.totalInvested || 0) > 0 ? '✓ QUALIFIED FOR 10% DIRECT BONUS' : '⚠️ UNQUALIFIED (PURCHASE SERVICE TO QUALIFY)'}
                      </Text>
                    </View>
                    <Text style={styles.qualNoticeSub}>
                      {(user?.wallet?.totalInvested || 0) > 0
                        ? `Active Mining Contract (${user?.wallet?.totalInvested?.toLocaleString()} USDT invested). You qualify to receive 10% Direct Bonus on referral purchases.`
                        : 'Rule: You must already purchase a mining service to qualify to receive the 10% Direct Bonus.'}
                    </Text>
                  </View>

                  {/* Display Current Sponsor & Placement Parent Info */}
                  <View style={styles.sponsorDataGrid}>
                    <View style={styles.sponsorDataItem}>
                      <Text style={styles.sponsorDataLabel}>SPONSOR REFERRAL CODE (OPTIONAL)</Text>
                      <View style={styles.sponsorDataValueRow}>
                        <Text style={styles.sponsorDataValueGold}>{user?.referralCode || 'BTCMASTER1'}</Text>
                        <TouchableOpacity style={styles.copyCodeMiniBtn} onPress={copyReferralCode}>
                          <Text style={styles.copyCodeMiniBtnText}>📋 Copy Code</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.sponsorDataSub}>10% direct reward on downline contracts</Text>
                    </View>

                    <View style={styles.sponsorDataItem}>
                      <Text style={styles.sponsorDataLabel}>SPECIFIC PLACEMENT PARENT (OPTIONAL)</Text>
                      <View style={styles.sponsorDataValueRow}>
                        <Text style={styles.sponsorDataValueCyan}>@{user?.username || 'user'}</Text>
                        <View style={styles.autoFilledBadgeSmall}>
                          <Text style={styles.autoFilledBadgeTextSmall}>✓ AUTO-FILLED</Text>
                        </View>
                      </View>
                      <Text style={styles.sponsorDataSub}>Root parent for binary leg pairing</Text>
                    </View>
                  </View>

                  <View style={styles.linkCopyRow}>
                    <View style={styles.linkInputBox}>
                      <Text style={styles.linkInputText} numberOfLines={1}>
                        {getReferralUrl()}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.copyBtn} onPress={copyReferralLink}>
                      <Text style={styles.copyBtnText}>🔗 Copy Link</Text>
                    </TouchableOpacity>
                  </View>

                </View>

                {/* Direct Referrals List */}
                <View style={styles.tableCard}>
                  <Text style={styles.tableTitle}>Direct Sponsored Downlines ({referrals.length})</Text>
                  {referrals.length === 0 ? (
                    <Text style={styles.emptyTableText}>No direct referrals registered yet. Share your code to earn 10%!</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={styles.tableWrapper}>
                        <View style={styles.tableHeaderRow}>
                          <Text style={[styles.th, { width: 120 }]}>MEMBER</Text>
                          <Text style={[styles.th, { width: 160 }]}>EMAIL</Text>
                          <Text style={[styles.th, { width: 110 }]}>INVESTED</Text>
                          <Text style={[styles.th, { width: 120 }]}>10% BONUS</Text>
                          <Text style={[styles.th, { width: 230 }]}>BINARY LEG / PLACEMENT</Text>
                        </View>
                        {referrals.map((ref) => {
                          const directBonus = ref.directBonusEarned != null ? Number(ref.directBonusEarned) : 0;
                          const downlineInvested = Number(ref.totalInvested || ref.wallet?.totalInvested || 0);
                          const isPlaced = Boolean(ref.isPlaced || ref.legUnderSponsor || ref.binaryParentId || ref.binaryParent);
                          const leg = ref.legUnderSponsor || (ref.binaryParentId || ref.binaryParent ? ref.binaryPosition : null);
                          const isBusyPlacing = placingMember === ref.username;

                          return (
                            <View key={ref.id || ref._id} style={styles.tableRow}>
                              <View style={{ width: 140, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Text style={[styles.td, { fontWeight: '700', color: '#FFF' }]}>
                                  @{ref.username}
                                </Text>
                                {Boolean(ref.isStarQualified || (ref.starRank && ref.starRank >= 1)) && (
                                  <StarRankIndicator rank={ref.starRank || 1} badge={ref.starBadge || ((ref.starRank || 0) >= 10 ? '3 CROWN' : (ref.starRank || 0) === 9 ? '2 CROWN' : (ref.starRank || 0) === 8 ? 'CROWN' : `${ref.starRank || 1}★`)} size="xs" />
                                )}
                              </View>
                              <Text style={[styles.td, { width: 160, color: '#8A99AD' }]}>{ref.email}</Text>
                              <Text style={[styles.td, { width: 110, color: '#F7931A', fontWeight: '700' }]}>
                                {downlineInvested.toLocaleString()}
                              </Text>
                              <View style={{ width: 120, justifyContent: 'center' }}>
                                {directBonus > 0 ? (
                                  <Text style={[styles.td, { color: '#00E676', fontWeight: '700' }]}>
                                    +{directBonus.toFixed(2)}
                                  </Text>
                                ) : downlineInvested > 0 ? (
                                  <View>
                                    <Text style={[styles.td, { color: '#8A99AD', fontWeight: '700' }]}>
                                      0.00
                                    </Text>
                                    <Text style={{ fontSize: 9, color: '#FFA726', fontWeight: '800' }}>
                                      ▲ Unqualified
                                    </Text>
                                  </View>
                                ) : (
                                  <Text style={[styles.td, { color: '#8A99AD' }]}>
                                    0.00
                                  </Text>
                                )}
                              </View>
                              <View style={{ width: 230, justifyContent: 'center' }}>
                                {isPlaced && leg ? (
                                  <View style={{ alignItems: 'flex-start' }}>
                                    <View style={[styles.legChip, leg === 'A' ? { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', borderWidth: 1 } : { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', borderWidth: 1 }]}>
                                      <Text style={[styles.legChipText, { color: leg === 'A' ? '#38BDF8' : '#F59E0B', fontWeight: '700' }]}>
                                        Leg {leg} ({leg === 'A' ? 'Left' : 'Right'})
                                      </Text>
                                    </View>
                                    {Boolean(ref.binaryParent?.username && ref.binaryParent.username !== user?.username) ? (
                                      <Text style={{ fontSize: 9, color: '#64748B', marginTop: 1 }}>
                                        under @{ref.binaryParent.username}
                                      </Text>
                                    ) : null}
                                  </View>
                                ) : downlineInvested > 0 ? (
                                  <View style={{ alignItems: 'flex-start', gap: 4 }}>
                                    <View style={[styles.legChip, { backgroundColor: 'rgba(0, 230, 118, 0.12)', borderColor: 'rgba(0, 230, 118, 0.5)', borderWidth: 1 }]}>
                                      <Text style={[styles.legChipText, { color: '#00E676', fontWeight: '800' }]}>
                                        ⭐ Ready to Place
                                      </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <TouchableOpacity
                                        style={[styles.quickPlaceBtn, { borderColor: '#38BDF8', backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}
                                        disabled={isBusyPlacing}
                                        onPress={() => handlePlaceMember(ref.username, user?.username, 'A')}
                                      >
                                        {isBusyPlacing ? (
                                          <ActivityIndicator size="small" color="#38BDF8" />
                                        ) : (
                                          <Text style={[styles.quickPlaceBtnText, { color: '#38BDF8' }]}>+ Leg A</Text>
                                        )}
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        style={[styles.quickPlaceBtn, { borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}
                                        disabled={isBusyPlacing}
                                        onPress={() => handlePlaceMember(ref.username, user?.username, 'B')}
                                      >
                                        {isBusyPlacing ? (
                                          <ActivityIndicator size="small" color="#F59E0B" />
                                        ) : (
                                          <Text style={[styles.quickPlaceBtnText, { color: '#F59E0B' }]}>+ Leg B</Text>
                                        )}
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        style={styles.customPlaceBtn}
                                        disabled={isBusyPlacing}
                                        onPress={() => {
                                          setPlacementTargetMember(ref.username);
                                          setPlacementTargetParent(user?.username || '');
                                          setPlacementTargetLeg('A');
                                          setShowPlacementModal(true);
                                        }}
                                      >
                                        <Text style={styles.customPlaceBtnText}>Custom ▾</Text>
                                      </TouchableOpacity>
                                    </View>
                                    <Text style={{ fontSize: 9, color: '#38BDF8' }}>
                                      Purchased ${downlineInvested} package. Ready for placement.
                                    </Text>
                                  </View>
                                ) : (
                                  <View style={{ alignItems: 'flex-start' }}>
                                    <View style={[styles.legChip, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1 }]}>
                                      <Text style={[styles.legChipText, { color: '#EF4444', fontWeight: '700' }]}>
                                        Awaiting Package
                                      </Text>
                                    </View>
                                    <Text style={{ fontSize: 9, color: '#94A3B8', marginTop: 2 }}>
                                      Must buy package to qualify
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                </View>
              </View>
            )}

            {/* TAB 4: MY CONTRACTS (MAX 1500 DAYS) */}
            {activeTab === 'contracts' && (
              <View style={styles.tabContent}>
                <View style={[styles.sectionHeader, isMobile && styles.sectionHeaderMobile]}>
                  <View style={isMobile ? { width: '100%' } : { flex: 1 }}>
                    <Text style={styles.sectionTitle}>Active Mining Rigs & 1500-Day Yield</Text>
                    <Text style={styles.sectionSubtitle}>
                      Live contracts earning automated daily Bitcoin mining for up to 1,500 Days
                    </Text>
                  </View>
                  {runningContracts.length > 0 ? (
                    <View style={[styles.autoSystemBadgeHeaderActive, isMobile && styles.autoSystemBadgeHeaderActiveMobile]}>
                      <View style={styles.countdownHeaderRow}>
                        <View style={styles.indicatorPulseGreen} />
                        <Text style={styles.autoSystemBadgeHeaderTextActive}>
                          {earliestNextPayoutMs === 0 ? '⚡ PAYOUT PROCESSING' : '🟢 REAL-TIME MINING ACTIVE'}
                        </Text>
                      </View>
                      <Text style={styles.autoSystemBadgeCountdownTimerGreen}>
                        {earliestNextPayoutMs === 0 ? 'CREDITING BTC...' : `NEXT PAYOUT IN ${formatCountdown(earliestNextPayoutMs)}`}
                      </Text>
                      <Text style={styles.autoSystemBadgeHeaderSubActive}>
                        {runningContracts.length === 1
                          ? '1 Rig actively streaming daily BTC'
                          : `${runningContracts.length} Rigs actively streaming daily BTC`}
                        {warmupContracts.length > 0 ? ` • ${warmupContracts.length} warming up` : ''}
                      </Text>
                    </View>
                  ) : warmupContracts.length > 0 ? (
                    <View style={[styles.autoSystemBadgeHeaderCountdown, isMobile && styles.autoSystemBadgeHeaderActiveMobile]}>
                      <View style={styles.countdownHeaderRow}>
                        <View style={styles.indicatorPulseAmber} />
                        <Text style={styles.autoSystemBadgeHeaderTextCountdown}>⏳ MINING ACTIVATES IN</Text>
                      </View>
                      <Text style={styles.autoSystemBadgeCountdownTimer}>
                        {formatCountdown(headerCountdownMs)}
                      </Text>
                      <Text style={styles.autoSystemBadgeHeaderSubCountdown}>
                        {warmupContracts.length === 1
                          ? 'Starts 48h after purchase'
                          : `${warmupContracts.length} Rigs warming up (48h)`}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.autoSystemBadgeHeader, isMobile && styles.autoSystemBadgeHeaderActiveMobile]}>
                      <Text style={styles.autoSystemBadgeHeaderText}>⚡ SYSTEM MINING ACTIVATION</Text>
                      <Text style={styles.autoSystemBadgeHeaderSub}>Starts 48h after purchase</Text>
                    </View>
                  )}
                </View>

                {contracts.length === 0 ? (
                  <View style={styles.emptyContractBox}>
                    <Text style={styles.emptyTitle}>No Mining Contracts Active</Text>
                    <Text style={styles.emptySubtitle}>
                      Purchase an entry package (100, 300, 1000, 5000, 10000, 30000 USDT) to start mining Bitcoin!
                    </Text>
                    <TouchableOpacity style={styles.browseStoreBtn} onPress={() => setActiveTab('packages')}>
                      <Text style={styles.browseStoreBtnText}>View 1,500-Day Packages</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.contractsList}>
                    {contracts.map((c) => {
                      const maxDays = c.maxDays || 1500;
                      const progressPct = Math.min(100, (c.daysCompleted / maxDays) * 100);
                      const daysLeft = maxDays - c.daysCompleted;

                      // 48-hour warm-up rule: new purchased mining service starts running daily yield after 48 hours from created_at
                      const createdAtTime = new Date(c.createdAt || c.purchasedAt || Date.now()).getTime();
                      const activationTime = createdAtTime + 48 * 60 * 60 * 1000;
                      const contractMsLeft = Math.max(0, activationTime - nowMs);
                      const isWarmupPhase = contractMsLeft > 0;

                      // Real-time payout cycle metrics for active running contracts
                      const lastHarvestTime = c.lastHarvestAt ? new Date(c.lastHarvestAt).getTime() : activationTime;
                      const nextPayoutTime = c.lastHarvestAt ? (lastHarvestTime + 24 * 60 * 60 * 1000) : activationTime;
                      const payoutMsLeft = Math.max(0, nextPayoutTime - nowMs);
                      const isPayoutDue = payoutMsLeft === 0;

                      const cycleDurationMs = 24 * 60 * 60 * 1000;
                      const elapsedCycleMs = Math.min(cycleDurationMs, Math.max(0, cycleDurationMs - payoutMsLeft));
                      const cycleProgressPct = Math.min(100, Math.max(0, (elapsedCycleMs / cycleDurationMs) * 100));

                      const dailyBtcRate = isRandomYieldPackage(c)
                        ? (getPackageYieldRange(c).min + getPackageYieldRange(c).max) / 2
                        : (c.dailyBtcYield || 0);

                      // Real-time live accrued BTC streaming during this 24-hour cycle
                      const liveAccruingBtc = dailyBtcRate * (elapsedCycleMs / cycleDurationMs);

                      return (
                        <View key={c.id || c._id} style={styles.contractCard}>
                          {isMobile ? (
                            /* MOBILE CLEAN CONTRACT HEADER */
                            <View style={styles.contractTopMobileWrap}>
                              {/* Row 1: Badges */}
                              <View style={styles.contractBadgeRowMobile}>
                                <Text style={styles.contractBadge}>{c.tier} USDT TIER</Text>
                                <Text style={styles.contractStatus}>{c.status}</Text>
                                {isWarmupPhase ? (
                                  <View style={styles.warmupBadge}>
                                    <Text style={styles.warmupBadgeText}>⏳ Starts in {formatCountdown(contractMsLeft)}</Text>
                                  </View>
                                ) : (
                                  <View style={styles.liveMiningBadge}>
                                    <View style={styles.indicatorPulseGreenSmall} />
                                    <Text style={styles.liveMiningBadgeText}>⚡ Real-Time Mining Active</Text>
                                  </View>
                                )}
                              </View>

                              {/* Row 2: Package Name & Hashrate */}
                              <View style={styles.contractNameHashrateRowMobile}>
                                <Text style={styles.contractNameMobile}>{c.packageName}</Text>
                                <Text style={styles.contractHashrateMobile}>{c.hashrate}</Text>
                              </View>

                              {/* Row 3: Daily Yield Estimate */}
                              <View style={styles.contractYieldRowMobile}>
                                <Text style={styles.contractYieldLabelMobile}>EST. DAILY YIELD RATE</Text>
                                <Text style={styles.contractDailyYieldMobile}>
                                  {isRandomYieldPackage(c)
                                    ? `₿ ${getPackageYieldRange(c).min.toFixed(8)} ~ ${getPackageYieldRange(c).max.toFixed(8)} BTC/day`
                                    : `₿ ${c.dailyBtcYield?.toFixed(6)} BTC/day`}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            /* DESKTOP CONTRACT HEADER */
                            <View style={styles.contractTop}>
                              <View style={{ flex: 1 }}>
                                <View style={styles.contractBadgeRow}>
                                  <Text style={styles.contractBadge}>{c.tier} USDT TIER</Text>
                                  <Text style={styles.contractStatus}>{c.status}</Text>
                                  {isWarmupPhase ? (
                                    <View style={styles.warmupBadge}>
                                      <Text style={styles.warmupBadgeText}>⏳ Starts in {formatCountdown(contractMsLeft)}</Text>
                                    </View>
                                  ) : (
                                    <View style={styles.liveMiningBadge}>
                                      <View style={styles.indicatorPulseGreenSmall} />
                                      <Text style={styles.liveMiningBadgeText}>⚡ Real-Time Mining Active</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.contractName}>{c.packageName}</Text>
                              </View>
                              <View style={styles.contractHashrateBox}>
                                <Text style={styles.contractHashrate}>{c.hashrate}</Text>
                                <Text style={styles.contractDailyYield}>
                                  {isRandomYieldPackage(c)
                                    ? `₿ ${getPackageYieldRange(c).min.toFixed(8)} ~ ${getPackageYieldRange(c).max.toFixed(8)} BTC/day`
                                    : `₿ ${c.dailyBtcYield?.toFixed(6)} BTC/day`}
                                </Text>
                              </View>
                            </View>
                          )}

                          {isWarmupPhase ? (
                            <View style={styles.warmupNoticeBox}>
                              <Text style={styles.warmupNoticeText}>
                                ⏳ Node Setup: Automated {`{ Mine Daily Yield }`} begins in {formatCountdown(contractMsLeft)} (48 hours from purchase).
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.realtimeMiningCardBox}>
                              {/* Top row: Live Status & Next Payout Countdown */}
                              <View style={[styles.realtimeMiningTopRow, isMobile && styles.realtimeMiningTopRowMobile]}>
                                <View style={styles.realtimeStatusBadge}>
                                  <View style={styles.indicatorPulseGreen} />
                                  <Text style={styles.realtimeStatusText}>REAL-TIME MINING RUNNING</Text>
                                </View>
                                <View style={[styles.realtimePayoutTimerBox, isMobile && styles.realtimePayoutTimerBoxMobile]}>
                                  <Text style={styles.realtimePayoutTimerLabel}>⏱️ NEXT BTC PAYOUT IN</Text>
                                  <Text style={styles.realtimePayoutTimerVal}>
                                    {isPayoutDue ? 'CREDITING NOW...' : formatCountdown(payoutMsLeft)}
                                  </Text>
                                </View>
                              </View>

                              {/* 24-Hour Payout Cycle Progress Bar */}
                              <View style={styles.cycleProgressBox}>
                                <View style={styles.cycleProgressLabelRow}>
                                  <Text style={styles.cycleProgressLabel}>24h Payout Cycle</Text>
                                  <Text style={styles.cycleProgressPercent}>
                                    {cycleProgressPct.toFixed(1)}% ({((24 * cycleProgressPct) / 100).toFixed(1)}h / 24h)
                                  </Text>
                                </View>
                                <View style={styles.cycleProgressBarTrack}>
                                  <View style={[styles.cycleProgressBarFill, { width: `${cycleProgressPct}%` }]} />
                                </View>
                              </View>

                              {/* Real-time Streaming Metrics Grid */}
                              <View style={[styles.realtimeMetricsGrid, isMobile && styles.realtimeMetricsGridMobile]}>
                                <View style={styles.realtimeMetricCol}>
                                  <Text style={styles.realtimeMetricLabel}>⛏️ Real-Time Accrued (Today)</Text>
                                  <Text style={styles.realtimeMetricValGreen}>₿ {liveAccruingBtc.toFixed(8)} BTC</Text>
                                  <Text style={styles.realtimeMetricSub}>Streams live every second</Text>
                                </View>
                                <View style={styles.realtimeMetricCol}>
                                  <Text style={styles.realtimeMetricLabel}>💰 Est. 24h Daily Payout</Text>
                                  <Text style={styles.realtimeMetricValGold}>
                                    {isRandomYieldPackage(c)
                                      ? `₿ ${getPackageYieldRange(c).min.toFixed(8)} ~ ${getPackageYieldRange(c).max.toFixed(8)}`
                                      : `₿ ${dailyBtcRate.toFixed(6)} BTC`}
                                  </Text>
                                  <Text style={styles.realtimeMetricSub}>Auto-credited to BTC wallet</Text>
                                </View>
                              </View>

                              {/* Live Info Notice & Due Payout Trigger */}
                              <View style={[styles.realtimeNoticeRow, isPayoutDue && styles.realtimeNoticeRowDue]}>
                                <Text style={[styles.realtimeNoticeText, { flex: 1 }]}>
                                  {isPayoutDue
                                    ? `⚡ 24h Cycle Complete! System is auto-depositing ₿ ${dailyBtcRate.toFixed(6)} BTC to your BTC wallet.`
                                    : `🟢 Real-Time Mining: System continuously computes hash power and deposits ₿ ${dailyBtcRate.toFixed(6)} BTC directly to your internal BTC wallet upon cycle completion.`}
                                </Text>
                                {isPayoutDue && (
                                  <TouchableOpacity
                                    style={styles.instantPayoutBtn}
                                    onPress={async () => {
                                      try {
                                        const res: any = await api.harvestDailyYield();
                                        await refreshAllData();
                                        if (res?.result?.paid) {
                                          showNotification(
                                            `🎉 Payout Credited: +₿ ${Number(res.result.totalBtcDistributed).toFixed(8)} BTC to your wallet!`,
                                            'success'
                                          );
                                        } else {
                                          showNotification('BTC payout processed & synced.', 'info');
                                        }
                                      } catch (err: any) {
                                        refreshAllData();
                                      }
                                    }}
                                  >
                                    <Text style={styles.instantPayoutBtnText}>⚡ Credit Payout Now</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          )}

                          <View style={styles.progressSection}>
                            <View style={styles.progressLabels}>
                              <Text style={styles.progressDayText}>
                                Day <Text style={styles.boldWhite}>{c.daysCompleted}</Text> of {c.maxDays || 1500} Days
                              </Text>
                              <Text style={styles.progressDaysLeft}>{daysLeft} Days Left</Text>
                            </View>
                            <View style={styles.contractProgressBar}>
                              <View style={[styles.contractProgressFill, { width: `${progressPct}%` }]} />
                            </View>
                          </View>

                          <View style={[styles.contractFooter, isMobile && styles.contractFooterMobile]}>
                            <Text style={styles.harvestedText}>
                              Total Harvested:{' '}
                              <Text style={styles.boldGreen}>₿ {c.totalBtcHarvested?.toFixed(6)} BTC</Text>
                            </Text>
                            <Text style={styles.contractExpiry}>Max: {c.maxDays ? c.maxDays.toLocaleString() : '1,500'} Days</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* MODAL 1: PURCHASE PACKAGE */}
      <Modal visible={purchaseModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, isMobile && styles.modalBoxMobile]}>
            <Text style={styles.modalTitle}>Confirm Mining Service Purchase</Text>
            {selectedPackage && (
              <View style={styles.modalBody}>
                <Text style={styles.modalPkgName}>{selectedPackage.name}</Text>
                <Text style={styles.modalPrice}>{selectedPackage.tier.toLocaleString()} USDT</Text>

                <View style={styles.modalInfoGrid}>
                  <Text style={styles.modalInfoLabel}>Hashrate Speed:</Text>
                  <Text style={styles.modalInfoVal}>{selectedPackage.hashrate}</Text>
                  <Text style={styles.modalInfoLabel}>Daily BTC Yield:</Text>
                  <Text style={styles.modalInfoValGreen}>
                    {isRandomYieldPackage(selectedPackage)
                      ? `₿ ${getPackageYieldRange(selectedPackage).min.toFixed(8)} ~ ${getPackageYieldRange(selectedPackage).max.toFixed(8)} BTC/day (Random)`
                      : `₿ ${selectedPackage.dailyBtcYield.toFixed(6)} BTC/day`}
                  </Text>
                  <Text style={styles.modalInfoLabel}>Contract Duration:</Text>
                  <Text style={styles.modalInfoVal}>Max 1,500 Days</Text>
                  <Text style={styles.modalInfoLabel}>Direct Sponsor (10%):</Text>
                  <Text style={styles.modalInfoValGold}>+{(selectedPackage.tier * 0.1).toFixed(2)} USDT</Text>
                  <Text style={styles.modalInfoLabel}>Binary Placement Vol:</Text>
                  <Text style={styles.modalInfoVal}>+{selectedPackage.tier} USDT to Leg A or B</Text>
                  <Text style={styles.modalInfoLabel}>Pairing Reward (10%):</Text>
                  <Text style={styles.modalInfoVal}>Pairs at each 1,000 match (100 USDT)</Text>
                </View>

                <View style={styles.modalButtonRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setPurchaseModalVisible(false)}
                    disabled={isPurchasing}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirmBtn}
                    onPress={handleConfirmPurchase}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.modalConfirmBtnText}>Activate Contract</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: MULTI-CURRENCY DEPOSIT (USDT, BTC, USDC) */}
      <Modal visible={depositModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 540, maxHeight: '90%' }, isMobile && styles.modalBoxMobile]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.modalTitle}>Deposit Crypto Mining Funds</Text>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
                <Text style={{ color: '#8A99AD', fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Currency Selector Tabs */}
            <View style={styles.currencyTabRow}>
              {(['USDT', 'BTC', 'USDC'] as const).map((cur) => {
                const isActive = depositCurrency === cur;
                const icon = cur === 'BTC' ? '₿' : cur === 'USDC' ? '🔵' : '💵';
                return (
                  <TouchableOpacity
                    key={cur}
                    style={[styles.currencyTabBtn, isActive && styles.currencyTabBtnActive]}
                    onPress={() => handleSelectDepositCurrency(cur)}
                  >
                    <Text style={[styles.currencyTabBtnText, isActive && styles.currencyTabBtnTextActive]}>
                      {icon} {cur}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              {/* Official Deposit Address Card */}
              <View style={styles.depositAddressCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.depositAddressCardTitle}>⚡ OFFICIAL {depositCurrency} WALLET</Text>
                  <View style={styles.networkBadge}>
                    <Text style={styles.networkBadgeText}>{activeCurrencyConfig.network}</Text>
                  </View>
                </View>

                <View style={styles.depositAddressBox}>
                  <Text style={styles.depositAddressText} numberOfLines={1}>
                    {activeCurrencyConfig.depositAddress}
                  </Text>
                  <TouchableOpacity
                    style={[styles.copyDepositBtn, depositAddressCopied && styles.copyDepositBtnSuccess]}
                    onPress={handleCopyDepositAddress}
                  >
                    <Text style={[styles.copyDepositBtnText, depositAddressCopied && { color: '#00FF66' }]}>
                      {depositAddressCopied ? '✓ Copied' : '📋 Copy'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.depositInstructionsText}>
                  {activeCurrencyConfig.instructions}
                </Text>
              </View>

              {/* Amount input */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>
                  DEPOSIT AMOUNT ({depositCurrency}) * (MIN {activeCurrencyConfig.minDeposit} {depositCurrency})
                </Text>
                <TextInput
                  style={[styles.modalInput, { marginTop: 6 }]}
                  keyboardType="numeric"
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                  placeholder={depositCurrency === 'BTC' ? 'e.g. 0.01' : 'e.g. 1000'}
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={[styles.quickDepositRow, { marginTop: 8 }]}>
                {(depositCurrency === 'BTC'
                  ? [0.001, 0.005, 0.01, 0.05, 0.1, 0.5]
                  : [100, 300, 1000, 5000, 10000, 30000]
                ).map((amt) => (
                  <TouchableOpacity
                    key={amt}
                    style={styles.quickDepositBtn}
                    onPress={() => setDepositAmount(String(amt))}
                  >
                    <Text style={styles.quickDepositBtnText}>
                      {depositCurrency === 'BTC' ? `${amt} ₿` : amt.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* TxHash input */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.inputLabel}>BLOCKCHAIN TRANSACTION HASH (TXID / HASH)</Text>
                <TextInput
                  style={[styles.modalInput, { marginTop: 6 }]}
                  value={depositTxHash}
                  onChangeText={setDepositTxHash}
                  placeholder={
                    depositCurrency === 'BTC'
                      ? 'e.g. 7f8a9b2c3d4e5f6a1b2c3d4e5f... (Bitcoin TxID)'
                      : 'e.g. 0x... or TRON TxID'
                  }
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                />
                <Text style={{ color: '#64748B', fontSize: 10, marginTop: 4 }}>
                  Providing your on-chain transaction hash allows administrators to verify and approve your {depositCurrency} funds rapidly.
                </Text>
              </View>

              <View style={[styles.modalButtonRow, { marginTop: 16 }]}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDepositModalVisible(false)}>
                  <Text style={styles.modalCancelBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, isSubmittingDeposit && { opacity: 0.6 }]}
                  disabled={isSubmittingDeposit}
                  onPress={handleDeposit}
                >
                  {isSubmittingDeposit ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Submit {depositCurrency} Request</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* User Recent Deposits Tracker */}
              {userDepositsList.length > 0 ? (
                <View style={styles.recentDepositsSection}>
                  <Text style={styles.recentDepositsTitle}>📜 RECENT DEPOSIT REQUESTS</Text>
                  {userDepositsList.slice(0, 5).map((dep) => (
                    <View key={dep.id} style={styles.recentDepositItem}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                            #{dep.id} • {dep.currency === 'BTC' ? parseFloat(dep.amount).toFixed(8) : parseFloat(dep.amount).toFixed(2)} {dep.currency || 'USDT'}
                          </Text>
                          <View
                            style={[
                              styles.depositStatusBadge,
                              dep.status === 'APPROVED'
                                ? styles.depositStatusApproved
                                : dep.status === 'REJECTED'
                                  ? styles.depositStatusRejected
                                  : styles.depositStatusPending,
                            ]}
                          >
                            <Text
                              style={[
                                styles.depositStatusText,
                                dep.status === 'APPROVED'
                                  ? { color: '#00FF66' }
                                  : dep.status === 'REJECTED'
                                    ? { color: '#FF4757' }
                                    : { color: '#FFA726' },
                              ]}
                            >
                              {dep.status === 'APPROVED'
                                ? '🟢 Credited'
                                : dep.status === 'REJECTED'
                                  ? '⛔ Rejected'
                                  : '⏳ Pending Review'}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ color: '#64748B', fontSize: 11, marginTop: 2 }}>
                          {new Date(dep.createdAt).toLocaleString()}
                        </Text>
                        {Boolean(dep.rejectionReason) ? (
                          <View style={styles.rejectionReasonBox}>
                            <Text style={styles.rejectionReasonText}>
                              Rejection Reason: <Text style={{ color: '#E2E8F0' }}>{dep.rejectionReason}</Text>
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: BINARY PLACEMENT MODAL */}
      <Modal visible={showPlacementModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxWidth: 500 }, isMobile && styles.modalBoxMobile]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>🌿 Binary Tree Placement</Text>
              <TouchableOpacity onPress={() => setShowPlacementModal(false)}>
                <Text style={{ fontSize: 18, color: '#94A3B8' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ gap: 14 }}>
              {/* Downline Member Selection */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 6 }}>
                  DIRECT DOWNLINE MEMBER (QUALIFIED)
                </Text>
                <View style={{ backgroundColor: '#0B111E', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#242F42' }}>
                  <Text style={{ color: '#00E5FF', fontWeight: '800', fontSize: 14 }}>
                    @{placementTargetMember || 'Select Member'}
                  </Text>
                  {Boolean(referrals.find((r) => r.username === placementTargetMember)?.wallet?.totalInvested) && (
                    <Text style={{ color: '#00E676', fontSize: 11, marginTop: 2 }}>
                      ✅ Active package: ${referrals.find((r) => r.username === placementTargetMember)?.wallet?.totalInvested} USDT (Qualified)
                    </Text>
                  )}
                </View>
              </View>

              {/* Target Parent Node */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 6 }}>
                  PLACEMENT PARENT NODE (IN YOUR DOWNLINE TREE)
                </Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: '#0B111E', color: '#FFF' }]}
                  placeholder="e.g. godwin"
                  placeholderTextColor="#64748B"
                  value={placementTargetParent}
                  onChangeText={setPlacementTargetParent}
                  autoCapitalize="none"
                />
                <Text style={{ fontSize: 10, color: '#64748B', marginTop: 4 }}>
                  Defaults to your root account @{user?.username}, or specify any downline member username to place under.
                </Text>
              </View>

              {/* Leg Selection */}
              <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 6 }}>
                  SELECT BINARY LEG
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.placementLegCard,
                      placementTargetLeg === 'A' && styles.placementLegCardActiveA,
                    ]}
                    onPress={() => setPlacementTargetLeg('A')}
                  >
                    <Text style={[styles.placementLegTitle, placementTargetLeg === 'A' && { color: '#38BDF8' }]}>
                      Leg A (Left)
                    </Text>
                    <Text style={styles.placementLegSub}>Left Binary Branch</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.placementLegCard,
                      placementTargetLeg === 'B' && styles.placementLegCardActiveB,
                    ]}
                    onPress={() => setPlacementTargetLeg('B')}
                  >
                    <Text style={[styles.placementLegTitle, placementTargetLeg === 'B' && { color: '#F59E0B' }]}>
                      Leg B (Right)
                    </Text>
                    <Text style={styles.placementLegSub}>Right Binary Branch</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Rule Note */}
              <View style={{ backgroundColor: 'rgba(0, 229, 255, 0.06)', padding: 10, borderRadius: 8, borderColor: 'rgba(0, 229, 255, 0.2)', borderWidth: 1 }}>
                <Text style={{ fontSize: 11, color: '#94A3B8', lineHeight: 16 }}>
                  💡 <Text style={{ color: '#00E5FF', fontWeight: '700' }}>Binary Rule:</Text> Volume from placed downlines propagates up the tree to build Leg A / Leg B volumes for your 10% Binary Pairing bonus settled daily at 23:59.
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowPlacementModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: '#00E5FF' }]}
                  disabled={placingMember != null}
                  onPress={() => handlePlaceMember(placementTargetMember, placementTargetParent, placementTargetLeg)}
                >
                  {placingMember != null ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={[styles.modalConfirmBtnText, { color: '#000', fontWeight: '800' }]}>
                      Confirm Placement
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#0B0F17',
    borderWidth: 1,
    borderColor: '#242F42',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13,
  },
  quickPlaceBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPlaceBtnText: {
    fontSize: 10,
    fontWeight: '800',
  },
  customPlaceBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: 'rgba(71, 85, 105, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPlaceBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  placementLegCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#242F42',
    backgroundColor: '#0B111E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placementLegCardActiveA: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  placementLegCardActiveB: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  placementLegTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#94A3B8',
  },
  placementLegSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  topHeader: {
    backgroundColor: '#0F141F',
    borderBottomWidth: 1,
    borderBottomColor: '#1A2233',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  topHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  mobileHeaderWrap: {
    width: '100%',
    gap: 8,
  },
  mobileHeaderRow1: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTitleMobile: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  brandSubtitleMobile: {
    color: '#8A99AD',
    fontSize: 9.5,
  },
  mobileSignOutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  mobileSignOutBtnText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
  mobileSignInBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  mobileSignInBtnText: {
    color: '#0B0E14',
    fontSize: 11,
    fontWeight: '800',
  },
  mobileSignUpBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  mobileSignUpBtnText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  mobileHeaderRow2: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileMarketPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#161D2B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#242F42',
  },
  mobileProfileBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#F7931A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  mobileProfileBadgeText: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
  },
  mobileAdminBtn: {
    width: '100%',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerPrimaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btcLogoGlow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F7931A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btcLogoChar: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 18,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: '#8A99AD',
    fontSize: 10,
  },
  marketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#161D2B',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#242F42',
  },
  marketLabel: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '600',
  },
  marketValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  marketUp: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  marketDown: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  authButtonsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authBtnProfile: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#F7931A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  authBtnProfileText: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
  },
  adminConsoleBtn: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  adminConsoleBtnText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  authBtnPrimary: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  authBtnPrimaryText: {
    color: '#0B0E14',
    fontSize: 11,
    fontWeight: '800',
  },
  authBtnSecondary: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  authBtnSecondaryText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  authBtnDanger: {
    backgroundColor: '#2A1820',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  authBtnDangerText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
  accountSwitcherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountSwitcherMobile: {
    width: '100%',
  },
  accountChipsScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  accountLabel: {
    color: '#8A99AD',
    fontSize: 11,
    fontWeight: '600',
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
  walletBar: {
    backgroundColor: '#131926',
    borderBottomWidth: 1,
    borderBottomColor: '#1E273A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  walletBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  guestBar: {
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(247, 147, 26, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  guestBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  guestBarLeft: {
    flex: 1,
  },
  guestStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  guestStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38BDF8',
  },
  guestStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 0.5,
  },
  guestBarTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  guestBarSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 18,
  },
  guestBarRight: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  guestSignInBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  guestSignInBtnText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
  },
  guestSignUpBtnTop: {
    backgroundColor: '#00E676',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  guestSignUpBtnTopText: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 12,
  },
  guestBrowseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  guestBrowseBtnText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 12,
  },
  walletStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  walletStatsMobile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statBox: {
    gap: 2,
  },
  statBoxMobile: {
    width: '48%',
    backgroundColor: '#0E1420',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1D273B',
  },
  statLabel: {
    color: '#8A99AD',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statUsd: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  statBtc: {
    color: '#F7931A',
    fontSize: 14,
    fontWeight: '800',
  },
  statBtcUsd: {
    color: '#8A99AD',
    fontSize: 10,
  },
  statDirect: {
    color: '#00E676',
    fontSize: 15,
    fontWeight: '800',
  },
  statBinary: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '800',
  },
  statSub: {
    color: '#8A99AD',
    fontSize: 9,
  },
  walletActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletActionsMobile: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtnFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  actionBtnTransfer: {
    backgroundColor: '#0F1E24',
    borderWidth: 1,
    borderColor: '#00F0FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnTransferText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnDeposit: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnHarvest: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnHarvestText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 11,
  },
  actionBtnRegister: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  bannerNoticeBox: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  bannerNoticeBoxSuccess: {
    backgroundColor: '#163327',
    borderBottomColor: '#00E676',
  },
  bannerNoticeBoxError: {
    backgroundColor: '#3B1414',
    borderBottomColor: '#EF4444',
  },
  bannerNoticeBoxInfo: {
    backgroundColor: '#162638',
    borderBottomColor: '#00F0FF',
  },
  bannerNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bannerNoticeTextSuccess: {
    color: '#00E676',
  },
  bannerNoticeTextError: {
    color: '#EF4444',
  },
  bannerNoticeTextInfo: {
    color: '#00F0FF',
  },
  navTabsContainer: {
    backgroundColor: '#0F141F',
    borderBottomWidth: 1,
    borderBottomColor: '#1E273A',
  },
  navTabsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  navTab: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  navTabActive: {
    borderBottomColor: '#F7931A',
  },
  navTabText: {
    color: '#8A99AD',
    fontSize: 12,
    fontWeight: '600',
  },
  navTabTextActive: {
    color: '#F7931A',
    fontWeight: '700',
  },
  navTabProfile: {
    borderLeftWidth: 1,
    borderLeftColor: '#1E273A',
    marginLeft: 6,
  },
  navTabTextProfile: {
    color: '#00F0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  contentScroll: {
    padding: 20,
    paddingBottom: 60,
  },
  contentScrollMobile: {
    padding: 14,
    paddingBottom: 80,
  },
  tabContent: {
    gap: 16,
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
    gap: 14,
  },
  loadingText: {
    color: '#8A99AD',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectionHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: 2,
  },
  referralHighlightPill: {
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  fullWidthPill: {
    width: '100%',
    marginTop: 4,
  },
  referralHighlightText: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '600',
  },
  storeHeroBanner: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.3)',
    backgroundColor: '#0F172A',
  },
  storeHeroBannerMobile: {
    height: 200,
  },
  storeHeroImage: {
    width: '100%',
    height: '100%',
  },
  storeHeroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 14, 20, 0.72)',
    justifyContent: 'space-between',
    padding: 16,
  },
  storeHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  storeHeroTopMobile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  storeHeroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(0, 230, 118, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  storeHeroDotGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  storeHeroPillText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  storeHeroSpecs: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  storeHeroBottom: {
    gap: 2,
  },
  storeHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  storeHeroSubtitle: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  packageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'flex-start',
  },
  packageCard: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1F2A3D',
    borderRadius: 12,
    padding: 16,
    width: 320,
    gap: 10,
  },
  packageCardMobile: {
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#F7931A',
    fontSize: 10,
    fontWeight: '800',
  },
  tierDuration: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  pkgTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pkgTagline: {
    color: '#8A99AD',
    fontSize: 11,
    marginTop: -6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceSymbol: {
    color: '#F7931A',
    fontSize: 16,
    fontWeight: '700',
  },
  priceAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  priceCurrency: {
    color: '#8A99AD',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  pkgSpecs: {
    backgroundColor: '#0B0F17',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    color: '#8A99AD',
    fontSize: 10,
  },
  specValue: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
  },
  specValueGold: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '800',
  },
  specValueGreen: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  specValueBtc: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  specValueReward: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
  },
  buyBtn: {
    backgroundColor: '#F7931A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buyBtnDisabled: {
    backgroundColor: '#2D3748',
  },
  buyBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  pairingBannerCard: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#243044',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  pairingBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  pairingBannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  rateBadge: {
    backgroundColor: '#0F3C2C',
    borderWidth: 1,
    borderColor: '#00E676',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rateBadgeText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
  },
  pairingBannerDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  boldWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  boldGold: {
    color: '#F7931A',
    fontWeight: '800',
  },
  boldGreen: {
    color: '#00E676',
    fontWeight: '800',
  },
  qualNoticeRow: {
    backgroundColor: '#0B0F17',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  qualNoticeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  qualNoticeBadgeActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: '#00E676',
    borderWidth: 1,
  },
  qualNoticeBadgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  qualNoticeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  qualNoticeBadgeTextActive: {
    color: '#00E676',
  },
  qualNoticeBadgeTextInactive: {
    color: '#EF4444',
  },
  qualNoticeSub: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
  },
  gaugeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0B0F17',
    padding: 12,
    borderRadius: 10,
  },
  gaugeContainerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  gaugeBox: {
    flex: 1,
    gap: 6,
  },
  gaugeBoxMobile: {
    width: '100%',
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeTitle: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '700',
  },
  gaugeTotal: {
    color: '#64748B',
    fontSize: 9,
  },
  progressBarWrapper: {
    height: 10,
    backgroundColor: '#1E293B',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFillA: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  progressBarFillB: {
    height: '100%',
    backgroundColor: '#F59E0B',
  },
  gaugeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeCurrent: {
    color: '#94A3B8',
    fontSize: 10,
  },
  gaugeNeeded: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  pairIconBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 2,
  },
  pairIconText: {
    fontSize: 22,
  },
  pairMatchesText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
  },
  pairTotalEarned: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  treeSection: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1F2A3D',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  treeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  treeCanvas: {
    backgroundColor: '#090C12',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1A2233',
    minHeight: 360,
    justifyContent: 'center',
  },
  refLinkCard: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1F2A3D',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  refTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  refDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  linkCopyRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  linkInputBox: {
    flex: 1,
    backgroundColor: '#0B0F17',
    borderWidth: 1,
    borderColor: '#242F42',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  linkInputText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  copyBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
  },
  copyBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '700',
  },
  copyCodeMiniBtn: {
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderColor: 'rgba(247, 147, 26, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  copyCodeMiniBtnText: {
    color: '#F7931A',
    fontSize: 10,
    fontWeight: '800',
  },
  tableCard: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1F2A3D',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  tableTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyTableText: {
    color: '#64748B',
    fontSize: 12,
    paddingVertical: 16,
    textAlign: 'center',
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
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  th: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1420',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#1A2233',
  },
  td: {
    fontSize: 11,
  },
  legChip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  legChipText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  txBadge: {
    backgroundColor: '#1B2433',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  txBadgeText: {
    color: '#E2E8F0',
    fontSize: 9,
    fontWeight: '700',
  },
  emptyContractBox: {
    backgroundColor: '#121824',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emptySubtitle: {
    color: '#8A99AD',
    fontSize: 12,
    textAlign: 'center',
  },
  browseStoreBtn: {
    backgroundColor: '#F7931A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  browseStoreBtnText: {
    color: '#000000',
    fontWeight: '800',
    fontSize: 12,
  },
  contractsList: {
    gap: 12,
  },
  contractCard: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1F2A3D',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  contractTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 10,
  },
  contractBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  contractTopMobileWrap: {
    width: '100%',
    gap: 8,
  },
  contractBadgeRowMobile: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  contractNameHashrateRowMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  contractNameMobile: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  contractHashrateMobile: {
    color: '#F7931A',
    fontSize: 13,
    fontWeight: '800',
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(247, 147, 26, 0.3)',
  },
  contractYieldRowMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  contractYieldLabelMobile: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  contractDailyYieldMobile: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
  },
  contractBadge: {
    color: '#F7931A',
    fontSize: 10,
    fontWeight: '800',
  },
  contractStatus: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '700',
  },
  autoSystemBadgeHeader: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: 'rgba(0, 240, 255, 0.35)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  autoSystemBadgeHeaderText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  autoSystemBadgeHeaderSub: {
    color: '#8A99AD',
    fontSize: 8.5,
    marginTop: 1,
  },
  autoSystemBadgeHeaderCountdown: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.55)',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 175,
  },
  countdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorPulseAmber: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  autoSystemBadgeHeaderTextCountdown: {
    color: '#FBBF24',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  autoSystemBadgeCountdownTimer: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  autoSystemBadgeHeaderSubCountdown: {
    color: '#FCD34D',
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 1,
  },
  autoSystemBadgeHeaderActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.45)',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 175,
  },
  autoSystemBadgeHeaderActiveMobile: {
    width: '100%',
    minWidth: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  indicatorPulseGreen: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  autoSystemBadgeHeaderTextActive: {
    color: '#00E676',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  autoSystemBadgeCountdownTimerGreen: {
    color: '#00E676',
    fontSize: 12.5,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  autoSystemBadgeHeaderSubActive: {
    color: '#8A99AD',
    fontSize: 8.5,
    marginTop: 1,
  },
  warmupBadge: {
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
    borderColor: 'rgba(255, 145, 0, 0.45)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  warmupBadgeText: {
    color: '#FFA726',
    fontSize: 9,
    fontWeight: '700',
  },
  liveMiningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: 'rgba(0, 230, 118, 0.45)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  liveMiningBadgeText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '700',
  },
  indicatorPulseGreenSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00E676',
  },
  realtimeMiningCardBox: {
    backgroundColor: 'rgba(11, 15, 23, 0.85)',
    borderColor: 'rgba(0, 230, 118, 0.35)',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  realtimeMiningTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  realtimeMiningTopRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  realtimeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  realtimeStatusText: {
    color: '#00E676',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  realtimePayoutTimerBox: {
    alignItems: 'flex-end',
  },
  realtimePayoutTimerBoxMobile: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.2)',
  },
  realtimePayoutTimerLabel: {
    color: '#8A99AD',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  realtimePayoutTimerVal: {
    color: '#00FF66',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  cycleProgressBox: {
    gap: 4,
  },
  cycleProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cycleProgressLabel: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '600',
  },
  cycleProgressPercent: {
    color: '#00E676',
    fontSize: 10.5,
    fontWeight: '700',
  },
  cycleProgressBarTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  cycleProgressBarFill: {
    height: '100%',
    backgroundColor: '#00E676',
    borderRadius: 3,
  },
  realtimeMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#06090F',
    borderRadius: 8,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  realtimeMetricsGridMobile: {
    flexDirection: 'column',
    gap: 10,
  },
  realtimeMetricCol: {
    flex: 1,
    gap: 2,
  },
  realtimeMetricLabel: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '600',
  },
  realtimeMetricValGreen: {
    color: '#00FF66',
    fontSize: 13,
    fontWeight: '800',
  },
  realtimeMetricValGold: {
    color: '#F7931A',
    fontSize: 12,
    fontWeight: '800',
  },
  realtimeMetricSub: {
    color: '#64748B',
    fontSize: 8.5,
  },
  realtimeNoticeRow: {
    backgroundColor: 'rgba(0, 230, 118, 0.05)',
    borderRadius: 6,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.15)',
  },
  realtimeNoticeRowDue: {
    backgroundColor: 'rgba(247, 147, 26, 0.1)',
    borderColor: 'rgba(247, 147, 26, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    padding: 8,
  },
  instantPayoutBtn: {
    backgroundColor: '#00E676',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  instantPayoutBtnText: {
    color: '#000000',
    fontSize: 10.5,
    fontWeight: '900',
  },
  realtimeNoticeText: {
    color: '#86EFAC',
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: '500',
  },
  autoMiningBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: 'rgba(0, 230, 118, 0.45)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  autoMiningBadgeText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '700',
  },
  warmupNoticeBox: {
    backgroundColor: 'rgba(255, 145, 0, 0.08)',
    borderColor: 'rgba(255, 145, 0, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  warmupNoticeText: {
    color: '#FFB74D',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  autoYieldActiveBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: 'rgba(0, 230, 118, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  autoYieldActiveBoxText: {
    color: '#69F0AE',
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 14,
  },
  contractName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  contractHashrateBox: {
    alignItems: 'flex-end',
  },
  contractHashrate: {
    color: '#F7931A',
    fontSize: 13,
    fontWeight: '800',
  },
  contractDailyYield: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
  },
  progressSection: {
    gap: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDayText: {
    color: '#8A99AD',
    fontSize: 11,
  },
  progressDaysLeft: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
  },
  contractProgressBar: {
    height: 7,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  contractProgressFill: {
    height: '100%',
    backgroundColor: '#00E676',
  },
  contractFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1A2233',
    paddingTop: 8,
  },
  contractFooterMobile: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-start',
  },
  harvestedText: {
    color: '#8A99AD',
    fontSize: 11,
  },
  contractExpiry: {
    color: '#64748B',
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#243044',
    borderRadius: 14,
    padding: 20,
    width: '100%',
    maxWidth: 460,
    gap: 14,
  },
  modalBoxMobile: {
    padding: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalDesc: {
    color: '#8A99AD',
    fontSize: 11,
    lineHeight: 16,
  },
  modalBody: {
    gap: 10,
  },
  modalPkgName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalPrice: {
    color: '#F7931A',
    fontSize: 22,
    fontWeight: '900',
  },
  modalInfoGrid: {
    backgroundColor: '#0B0F17',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  modalInfoLabel: {
    color: '#8A99AD',
    fontSize: 10,
  },
  modalInfoVal: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalInfoValGreen: {
    color: '#00E676',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalInfoValGold: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalInput: {
    backgroundColor: '#0B0F17',
    borderWidth: 1,
    borderColor: '#242F42',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: '#FFFFFF',
    fontSize: 13,
  },
  inputLabel: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '700',
  },
  quickDepositRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  quickDepositBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  quickDepositBtnText: {
    color: '#F7931A',
    fontSize: 10,
    fontWeight: '700',
  },
  legSelectRow: {
    flexDirection: 'row',
    gap: 8,
  },
  legSelectBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#242F42',
  },
  legSelectBtnActive: {
    borderColor: '#F7931A',
    backgroundColor: '#26282E',
  },
  legSelectText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },

  // Deposit USDT Modal Card Styles
  depositAddressCard: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 10,
    padding: 12,
  },
  depositAddressCardTitle: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  networkBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  networkBadgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '700',
  },
  depositAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070A13',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
    marginTop: 6,
  },
  depositAddressText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  copyDepositBtn: {
    backgroundColor: '#00F0FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  copyDepositBtnSuccess: {
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    borderWidth: 1,
    borderColor: '#00FF66',
  },
  copyDepositBtnText: {
    color: '#070A13',
    fontSize: 11,
    fontWeight: '800',
  },
  depositInstructionsText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  recentDepositsSection: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 14,
    gap: 8,
  },
  recentDepositsTitle: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  recentDepositItem: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    padding: 10,
  },
  depositStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  depositStatusPending: {
    backgroundColor: 'rgba(255, 167, 38, 0.1)',
    borderColor: '#FFA726',
  },
  depositStatusApproved: {
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    borderColor: '#00FF66',
  },
  depositStatusRejected: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderColor: '#FF4757',
  },
  depositStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rejectionReasonBox: {
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4757',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginTop: 6,
  },
  rejectionReasonText: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: '600',
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  modalCancelBtnText: {
    color: '#8A99AD',
    fontSize: 12,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F7931A',
  },
  modalConfirmBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
  },
  refCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  refCardHeaderRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  autoFilledPillContainer: {
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderWidth: 1,
    borderColor: '#F7931A',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  autoFilledPillText: {
    color: '#F7931A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sponsorDataGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  sponsorDataItem: {
    flex: 1,
    minWidth: 220,
    backgroundColor: '#0B0F17',
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 8,
    padding: 12,
  },
  sponsorDataLabel: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sponsorDataValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sponsorDataValueGold: {
    color: '#F7931A',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sponsorDataValueCyan: {
    color: '#00F0FF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sponsorDataSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  autoFilledBadgeSmall: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: '#00E676',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  autoFilledBadgeTextSmall: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  treeDrillDownBar: {
    backgroundColor: '#0F1626',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  treeDrillDownBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  treeDrillDownInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 260,
  },
  treeDrillDownInfoMobile: {
    minWidth: '100%',
    width: '100%',
  },
  treeDrillDownIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeDrillDownTitle: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  treeDrillDownUsername: {
    color: '#00F0FF',
    fontSize: 13,
    fontWeight: '800',
  },
  activeRootBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.18)',
    borderColor: '#00F0FF',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  activeRootBadgeText: {
    color: '#00F0FF',
    fontSize: 9,
    fontWeight: '800',
  },
  treeDrillDownSub: {
    color: '#8A99AD',
    fontSize: 10,
    marginTop: 2,
  },
  treeDrillDownButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  treeDrillDownButtonsRowMobile: {
    width: '100%',
    justifyContent: 'space-between',
  },
  treeBackBtn: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  treeBackBtnText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  treeResetBtn: {
    backgroundColor: 'rgba(247, 147, 26, 0.15)',
    borderColor: '#F7931A',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  treeResetBtnText: {
    color: '#F7931A',
    fontSize: 11,
    fontWeight: '700',
  },
  treeTipBar: {
    backgroundColor: 'rgba(15, 22, 38, 0.6)',
    borderColor: 'rgba(36, 47, 66, 0.6)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
  },
  treeTipText: {
    color: '#64748B',
    fontSize: 10,
  },
  treeLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 12, 18, 0.8)',
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 8,
  },
  treeLoadingText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '600',
  },
  starRankCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderColor: 'rgba(247, 147, 26, 0.3)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  starRankCardMobile: {
    padding: 12,
  },
  starRankHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  starRankHeaderMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
  },
  starRankTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  starRankSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  starBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  starBadgePillActive: {
    backgroundColor: 'rgba(247, 147, 26, 0.18)',
    borderColor: '#F7931A',
  },
  starBadgePillInactive: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  starBadgePillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  starBadgePillTextActive: {
    color: '#F7931A',
  },
  starBadgePillTextInactive: {
    color: '#94A3B8',
  },
  autoSettlementBadgeHeader: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    borderColor: 'rgba(0, 230, 118, 0.45)',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    minWidth: 185,
  },
  autoSettlementBadgeHeaderMobile: {
    width: '100%',
    minWidth: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  autoSettlementTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  autoSettlementHeaderText: {
    color: '#00E676',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  autoSettlementCountdownTimer: {
    color: '#00FF66',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  autoSettlementSubText: {
    color: '#8A99AD',
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 1,
  },
  starProgressContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  starProgressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  starProgressLabel: {
    color: '#E2E8F0',
    fontSize: 11,
  },
  starProgressStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  textGreen: {
    color: '#10B981',
  },
  textOrange: {
    color: '#F7931A',
  },
  textCyan: {
    color: '#00F0FF',
  },
  textPurple: {
    color: '#C084FC',
  },
  starProgressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  starProgressBarFill: {
    height: '100%',
    backgroundColor: '#00F0FF',
    borderRadius: 4,
  },
  starMetricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  starMetricsGridMobile: {
    flexDirection: 'column',
  },
  starMetricItem: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  starMetricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  starMetricValue: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  starMetricSub: {
    color: '#94A3B8',
    fontSize: 10,
  },
  starRuleBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(247, 147, 26, 0.08)',
    borderColor: 'rgba(247, 147, 26, 0.25)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  starRuleIcon: {
    fontSize: 14,
  },
  starRuleText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 10.5,
    lineHeight: 15,
  },
  currencyTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  currencyTabBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyTabBtnActive: {
    backgroundColor: 'rgba(247, 147, 26, 0.12)',
    borderColor: '#F7931A',
  },
  currencyTabBtnText: {
    color: '#8A99AD',
    fontSize: 12,
    fontWeight: '700',
  },
  currencyTabBtnTextActive: {
    color: '#F7931A',
    fontWeight: '900',
  },
});
