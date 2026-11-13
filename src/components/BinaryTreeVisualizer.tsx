import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StarRankIndicator } from './StarRankIndicator';

interface TreeNode {
  id: string;
  username: string;
  fullName: string;
  referralCode?: string;
  binaryPosition?: 'A' | 'B' | null;
  legACurrent: number;
  legBCurrent: number;
  legATotal: number;
  legBTotal: number;
  pairsCount: number;
  totalInvested: number;
  isQualified?: boolean;
  starRank?: number;
  starBadge?: string;
  starIcon?: string;
  isStarQualified?: boolean;
  directSalesVolume?: number;
  left?: TreeNode | null;
  right?: TreeNode | null;
}

interface BinaryTreeVisualizerProps {
  tree: TreeNode | null;
  onSelectNode?: (node: TreeNode) => void;
}

export const BinaryTreeVisualizer: React.FC<BinaryTreeVisualizerProps> = ({
  tree,
  onSelectNode,
}) => {
  const { t } = useTranslation();

  if (!tree) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('binary.loadingTree', 'Loading Binary MLM Placement Tree...')}</Text>
      </View>
    );
  }

  const renderNodeCard = (
    node: TreeNode | null | undefined,
    label: string,
    parentNode?: TreeNode | null,
    leg?: 'A' | 'B',
    isRoot: boolean = false
  ) => {
    if (!node) {
      return (
        <View style={styles.emptySlot}>
          <View style={styles.emptySlotCircle}>
            <Text style={styles.emptySlotCircleText}>{label}</Text>
          </View>
          <Text style={styles.emptySlotText}>{t('binary.slot', 'Slot')} {label}</Text>
          <Text style={styles.emptySlotSub}>{t('binary.emptySlot', 'Empty Slot')}</Text>
        </View>
      );
    }

    const isQualified = node.isQualified ?? (Number(node.totalInvested || 0) > 0);
    const isPairedReady = node.legACurrent >= 1000 && node.legBCurrent >= 1000;

    const isTopActualRoot = isRoot && !node.binaryPosition;
    const isTopLeaf = isRoot && Boolean(node.binaryPosition);
    const nodeRoleTag = isTopActualRoot
      ? t('binary.rootNode', 'ROOT')
      : node.binaryPosition
        ? `${t('binary.leafUser', 'LEAF')} ${node.binaryPosition}`
        : `${t('binary.leafUser', 'LEAF')} ${label}`;

    const nodeRank = Number(node.starRank || 0);
    const isStarQualified = !!(node.isStarQualified || nodeRank >= 1);
    const isCrownRank = nodeRank >= 8;
    const isThreeCrown = nodeRank >= 10;
    const isTwoCrown = nodeRank === 9;
    const isCrown = nodeRank === 8;
    const isSevenStar = nodeRank === 7;
    const isSixStar = nodeRank === 6;
    const isFiveStar = nodeRank === 5;
    const isFourStar = nodeRank === 4;
    const isThreeStar = nodeRank === 3;
    const isTwoStar = nodeRank === 2;

    return (
      <TouchableOpacity
        style={[
          styles.nodeCard,
          isTopActualRoot && styles.rootCard,
          isTopLeaf && styles.leafFocusCard,
          isPairedReady && isQualified && styles.pairedGlowCard,
          isStarQualified && (isThreeCrown ? styles.starCardGlowThreeCrown : isTwoCrown ? styles.starCardGlowTwoCrown : isCrown ? styles.starCardGlowCrown : isSevenStar ? styles.starCardGlowRank7 : isSixStar ? styles.starCardGlowRank6 : isFiveStar ? styles.starCardGlowRank5 : isFourStar ? styles.starCardGlowRank4 : isThreeStar ? styles.starCardGlowRank3 : isTwoStar ? styles.starCardGlowRank2 : styles.starCardGlow),
        ]}
        onPress={() => onSelectNode && onSelectNode(node)}
      >
        <View style={styles.nodeHeader}>
          <View style={[styles.tagBadge, isTopActualRoot && styles.tagBadgeRoot, (isTopLeaf || !isRoot) && styles.tagBadgeLeaf]}>
            <Text style={[styles.tagText, isTopActualRoot && styles.tagTextRoot, (isTopLeaf || !isRoot) && styles.tagTextLeaf]}>
              {nodeRoleTag}
            </Text>
          </View>
          {isStarQualified && (
            <StarRankIndicator
              rank={nodeRank || 1}
              badge={isThreeCrown ? '3-CROWN' : isTwoCrown ? '2-CROWN' : isCrown ? 'CROWN' : `${nodeRank}-STAR`}
              size="xs"
            />
          )}
          {node.pairsCount > 0 && (
            <View style={styles.pairCountBadge}>
              <Text style={styles.pairCountText}>{node.pairsCount} {t('binary.pairs', 'Pairs')}</Text>
            </View>
          )}
        </View>

        <View style={styles.usernameRow}>
          {isStarQualified && (
            <Text style={styles.usernameStarIcon}>
              {isCrownRank ? '👑' : '⭐'}
            </Text>
          )}
          <Text style={[styles.nodeUsername, isStarQualified && styles.nodeUsernameStar, isTwoStar && styles.nodeUsernameStarRank2, isThreeStar && styles.nodeUsernameStarRank3, isFourStar && styles.nodeUsernameStarRank4, isFiveStar && styles.nodeUsernameStarRank5, isSixStar && styles.nodeUsernameStarRank6, isSevenStar && styles.nodeUsernameStarRank7, isCrown && styles.nodeUsernameCrown, isTwoCrown && styles.nodeUsernameTwoCrown, isThreeCrown && styles.nodeUsernameThreeCrown]} numberOfLines={1}>
            @{node.username}
          </Text>
        </View>

        {isStarQualified && (
          <View style={[styles.starStatusBanner, isTwoStar && styles.starStatusBannerRank2, isThreeStar && styles.starStatusBannerRank3, isFourStar && styles.starStatusBannerRank4, isFiveStar && styles.starStatusBannerRank5, isSixStar && styles.starStatusBannerRank6, isSevenStar && styles.starStatusBannerRank7, isCrown && styles.starStatusBannerCrown, isTwoCrown && styles.starStatusBannerTwoCrown, isThreeCrown && styles.starStatusBannerThreeCrown]}>
            <Text style={[styles.starStatusBannerText, isTwoStar && styles.starStatusBannerTextRank2, isThreeStar && styles.starStatusBannerTextRank3, isFourStar && styles.starStatusBannerTextRank4, isFiveStar && styles.starStatusBannerTextRank5, isSixStar && styles.starStatusBannerTextRank6, isSevenStar && styles.starStatusBannerTextRank7, isCrown && styles.starStatusBannerTextCrown, isTwoCrown && styles.starStatusBannerTextTwoCrown, isThreeCrown && styles.starStatusBannerTextThreeCrown]}>
              {isThreeCrown ? `3-CROWN: 18 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : isTwoCrown ? `2-CROWN: 15 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : isCrown ? `CROWN: 13 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : isSevenStar ? `7-STAR: 11 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : isSixStar ? `6-STAR: 9 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : isFiveStar ? `5-STAR: 7 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : isFourStar ? `4-STAR: 6 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : isThreeStar ? `3-STAR: 4 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : isTwoStar ? `2-STAR: 2 ${t('binary.timesPerDay', 'Pairs/Day')} (23:59)` : `1-STAR: 1 ${t('binary.timePerDay', 'Pair/Day')} (23:59)`}
            </Text>
          </View>
        )}

        <View style={styles.investedRow}>
          <Text style={styles.nodeInvested}>
            {node.totalInvested?.toLocaleString() || 0} USDT
          </Text>
          <View style={[styles.qualBadge, isQualified ? styles.qualBadgeActive : styles.qualBadgeInactive]}>
            <Text style={[styles.qualBadgeText, isQualified ? styles.qualBadgeTextActive : styles.qualBadgeTextInactive]}>
              {isQualified ? `✓ ${t('binary.qualified', 'QUALIFIED')}` : t('binary.unqualified', 'UNQUALIFIED')}
            </Text>
          </View>
        </View>

        <View style={styles.volumeSplit}>
          <View style={[styles.legBox, styles.legBoxLeft]}>
            <Text style={styles.legLabel}>{t('binary.legA', 'LEG A')}</Text>
            <Text style={styles.legCurrent}>{node.legACurrent || 0}</Text>
            <Text style={styles.legTotal}>{t('binary.tot', 'Tot')}: {node.legATotal || 0}</Text>
          </View>
          <View style={[styles.legBox, styles.legBoxRight]}>
            <Text style={styles.legLabel}>{t('binary.legB', 'LEG B')}</Text>
            <Text style={styles.legCurrent}>{node.legBCurrent || 0}</Text>
            <Text style={styles.legTotal}>{t('binary.tot', 'Tot')}: {node.legBTotal || 0}</Text>
          </View>
        </View>

        {isPairedReady && (
          <View style={[styles.pairReadyBanner, !isQualified && styles.pairUnqualifiedBanner]}>
            <Text style={[styles.pairReadyText, !isQualified && styles.pairUnqualifiedText]}>
              {isQualified ? t('binary.readyForPairing', '⚡ Ready for 1000 Pairing!') : t('binary.pairedBuyService', '⚠️ 1000 Paired (Buy Service to Claim 100 USDT)')}
            </Text>
          </View>
        )}

        {!isTopActualRoot && (
          <View style={styles.drillDownPill}>
            <Text style={styles.drillDownPillText}>
              {isRoot ? `${t('binary.focusedLeaf', '🔍 Focused Leaf')} ${node.binaryPosition || 'A'} ${t('binary.slots', 'Slots')}` : t('binary.tapToFocus', '🎯 Tap: Focus A/B Slots')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.scrollWrapper}>
      <View style={styles.treeContainer}>
        {/* Level 0: Root Node */}
        <View style={styles.levelRow}>
          {renderNodeCard(tree, 'TOP', undefined, undefined, true)}
        </View>

        <View style={styles.branchLineVertical} />
        <View style={styles.branchLineHorizontalL1} />

        {/* Level 1: Left (A) & Right (B) */}
        <View style={styles.levelRow}>
          <View style={styles.subTreeBranch}>
            {renderNodeCard(tree.left, 'A', tree, 'A')}
          </View>
          <View style={styles.subTreeBranch}>
            {renderNodeCard(tree.right, 'B', tree, 'B')}
          </View>
        </View>

        {/* Level 2 connectors and children */}
        <View style={styles.levelRowSub}>
          {/* Under Left (A) */}
          <View style={styles.subTreeBranchPair}>
            <View style={[styles.branchLineHorizontalL2, !tree.left && styles.branchLineDisabled]} />
            <View style={styles.levelRow}>
              <View style={styles.nodeCol}>
                {renderNodeCard(tree.left?.left, 'A', tree.left, 'A')}
              </View>
              <View style={styles.nodeCol}>
                {renderNodeCard(tree.left?.right, 'B', tree.left, 'B')}
              </View>
            </View>
          </View>

          {/* Under Right (B) */}
          <View style={styles.subTreeBranchPair}>
            <View style={[styles.branchLineHorizontalL2, !tree.right && styles.branchLineDisabled]} />
            <View style={styles.levelRow}>
              <View style={styles.nodeCol}>
                {renderNodeCard(tree.right?.left, 'A', tree.right, 'A')}
              </View>
              <View style={styles.nodeCol}>
                {renderNodeCard(tree.right?.right, 'B', tree.right, 'B')}
              </View>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#8A99AD',
    fontSize: 14,
  },
  scrollWrapper: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  treeContainer: {
    alignItems: 'center',
    minWidth: 780,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 24,
  },
  levelRowSub: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 36,
    marginTop: 16,
  },
  subTreeBranch: {
    alignItems: 'center',
    width: 320,
  },
  subTreeBranchPair: {
    alignItems: 'center',
    width: 320,
  },
  nodeCol: {
    width: 150,
    alignItems: 'center',
  },
  branchLineVertical: {
    width: 2,
    height: 20,
    backgroundColor: '#F7931A',
  },
  branchLineHorizontalL1: {
    width: 340,
    height: 2,
    backgroundColor: '#F7931A',
    marginBottom: 20,
  },
  branchLineHorizontalL2: {
    width: 160,
    height: 2,
    backgroundColor: 'rgba(247, 147, 26, 0.4)',
    marginBottom: 16,
  },
  nodeCard: {
    backgroundColor: '#131823',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242F42',
    paddingVertical: 10,
    paddingHorizontal: 8,
    width: 166,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  rootCard: {
    borderColor: '#F7931A',
    borderWidth: 2,
    backgroundColor: '#161E2E',
    width: 184,
  },
  leafFocusCard: {
    borderColor: '#00F0FF',
    borderWidth: 2,
    backgroundColor: '#0E1A2B',
    width: 184,
  },
  pairedGlowCard: {
    borderColor: '#00E676',
    borderWidth: 2,
  },
  nodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
    alignItems: 'center',
    gap: 4,
  },
  tagBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  tagText: {
    color: '#8A99AD',
    fontSize: 9.5,
    fontWeight: '700',
  },
  tagBadgeRoot: {
    backgroundColor: 'rgba(247, 147, 26, 0.2)',
    borderColor: '#F7931A',
    borderWidth: 1,
  },
  tagTextRoot: {
    color: '#F7931A',
    fontWeight: '800',
  },
  tagBadgeLeaf: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderWidth: 1,
  },
  tagTextLeaf: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  pairCountBadge: {
    backgroundColor: '#053E2B',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  pairCountText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '700',
  },
  nodeUsername: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  nodeInvested: {
    color: '#8A99AD',
    fontSize: 10,
    fontWeight: '600',
  },
  investedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 4,
    flexWrap: 'wrap',
  },
  qualBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  qualBadgeActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderColor: '#00E676',
    borderWidth: 0.5,
  },
  qualBadgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 0.5,
  },
  qualBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  qualBadgeTextActive: {
    color: '#00E676',
  },
  qualBadgeTextInactive: {
    color: '#EF4444',
  },
  volumeSplit: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
    width: '100%',
  },
  legBox: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  legBoxLeft: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1,
  },
  legBoxRight: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
    borderWidth: 1,
  },
  legLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
  },
  legCurrent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  legTotal: {
    fontSize: 8,
    color: '#64748B',
  },
  pairReadyBanner: {
    marginTop: 6,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    width: '100%',
    alignItems: 'center',
  },
  pairReadyText: {
    color: '#00E676',
    fontSize: 9,
    fontWeight: '700',
  },
  pairUnqualifiedBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  pairUnqualifiedText: {
    color: '#EF4444',
    fontSize: 8,
    fontWeight: '700',
  },
  emptySlot: {
    width: 140,
    height: 110,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#242F42',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(15, 20, 30, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  emptySlotClickable: {
    borderColor: 'rgba(0, 229, 255, 0.6)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
  },
  emptySlotCircleActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.25)',
    borderColor: '#00E5FF',
  },
  emptySlotCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(30, 41, 59, 0.3)',
  },
  emptySlotCircleText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  emptySlotText: {
    color: '#8A99AD',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptySlotSub: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  branchLineDisabled: {
    borderColor: '#141A24',
    opacity: 0.3,
  },
  drillDownPill: {
    marginTop: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderColor: 'rgba(0, 240, 255, 0.35)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 4,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillDownPillText: {
    color: '#00F0FF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  starCardGlow: {
    borderColor: '#FFD700',
    borderWidth: 1.5,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  starCardGlowRank2: {
    borderColor: '#FF9100',
    borderWidth: 1.5,
    shadowColor: '#FF9100',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
    elevation: 5,
  },
  starCardGlowRank3: {
    borderColor: '#FF3D00',
    borderWidth: 1.5,
    shadowColor: '#FF3D00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 12,
    elevation: 7,
  },
  starCardGlowRank4: {
    borderColor: '#C084FC',
    borderWidth: 1.8,
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 8,
  },
  starCardGlowRank5: {
    borderColor: '#00F0FF',
    borderWidth: 2,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 16,
    elevation: 10,
  },
  starCardGlowRank6: {
    borderColor: '#FF007F',
    borderWidth: 2.2,
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
  starCardGlowRank7: {
    borderColor: '#FFE600',
    borderWidth: 2.5,
    shadowColor: '#FFE600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 14,
  },
  starCardGlowCrown: {
    borderColor: '#FFD700',
    borderWidth: 2.8,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
  },
  starCardGlowTwoCrown: {
    borderColor: '#FFE000',
    borderWidth: 3,
    shadowColor: '#FFE000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 18,
  },
  starCardGlowThreeCrown: {
    borderColor: '#FFF275',
    borderWidth: 3.2,
    shadowColor: '#FFF275',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 20,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  usernameStarIcon: {
    fontSize: 12,
  },
  nodeUsernameStar: {
    color: '#FFE27A',
    fontWeight: '800',
  },
  nodeUsernameStarRank2: {
    color: '#FFA726',
    fontWeight: '800',
  },
  nodeUsernameStarRank3: {
    color: '#FF7043',
    fontWeight: '900',
  },
  nodeUsernameStarRank4: {
    color: '#E9D5FF',
    fontWeight: '900',
  },
  nodeUsernameStarRank5: {
    color: '#00F0FF',
    fontWeight: '900',
  },
  nodeUsernameStarRank6: {
    color: '#FF007F',
    fontWeight: '900',
  },
  nodeUsernameStarRank7: {
    color: '#FFE600',
    fontWeight: '900',
  },
  nodeUsernameCrown: {
    color: '#FFF8E7',
    fontWeight: '900',
  },
  nodeUsernameTwoCrown: {
    color: '#FFFDF0',
    fontWeight: '900',
  },
  nodeUsernameThreeCrown: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  starStatusBanner: {
    marginTop: 3,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderColor: 'rgba(255, 215, 0, 0.35)',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 4,
    alignSelf: 'center',
  },
  starStatusBannerRank2: {
    backgroundColor: 'rgba(255, 145, 0, 0.16)',
    borderColor: 'rgba(255, 145, 0, 0.45)',
  },
  starStatusBannerRank3: {
    backgroundColor: 'rgba(255, 61, 0, 0.18)',
    borderColor: 'rgba(255, 61, 0, 0.5)',
  },
  starStatusBannerRank4: {
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    borderColor: 'rgba(192, 132, 252, 0.6)',
  },
  starStatusBannerRank5: {
    backgroundColor: 'rgba(0, 240, 255, 0.22)',
    borderColor: 'rgba(0, 240, 255, 0.7)',
  },
  starStatusBannerRank6: {
    backgroundColor: 'rgba(255, 0, 128, 0.22)',
    borderColor: 'rgba(255, 0, 128, 0.8)',
  },
  starStatusBannerRank7: {
    backgroundColor: 'rgba(255, 230, 0, 0.25)',
    borderColor: 'rgba(255, 230, 0, 0.85)',
  },
  starStatusBannerCrown: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderColor: '#FFD700',
  },
  starStatusBannerTwoCrown: {
    backgroundColor: 'rgba(255, 180, 0, 0.35)',
    borderColor: '#FFE000',
  },
  starStatusBannerThreeCrown: {
    backgroundColor: 'rgba(255, 235, 59, 0.4)',
    borderColor: '#FFF275',
  },
  starStatusBannerText: {
    color: '#FFD700',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  starStatusBannerTextRank2: {
    color: '#FF9100',
  },
  starStatusBannerTextRank3: {
    color: '#FF5722',
  },
  starStatusBannerTextRank4: {
    color: '#E9D5FF',
  },
  starStatusBannerTextRank5: {
    color: '#00F0FF',
  },
  starStatusBannerTextRank6: {
    color: '#FF007F',
  },
  starStatusBannerTextRank7: {
    color: '#FFE600',
  },
  starStatusBannerTextCrown: {
    color: '#FFF8E7',
  },
  starStatusBannerTextTwoCrown: {
    color: '#FFFDF0',
  },
  starStatusBannerTextThreeCrown: {
    color: '#FFFFFF',
  },
});
