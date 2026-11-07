import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

export interface StarRankIndicatorProps {
  rank?: number;
  isQualified?: boolean;
  badge?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  glow?: boolean;
  style?: ViewStyle;
}

export const StarRankIndicator: React.FC<StarRankIndicatorProps> = ({
  rank = 0,
  isQualified,
  badge,
  size = 'sm',
  showLabel = true,
  glow = true,
  style,
}) => {
  const isStar = isQualified !== undefined ? isQualified : rank >= 1;

  if (!isStar) {
    return null;
  }

  const isCrownRank = rank >= 8;
  const isThreeCrown = rank >= 10;
  const isTwoCrown = rank === 9;
  const isCrown = rank === 8;
  const isSevenStar = rank === 7;
  const isSixStar = rank === 6;
  const isFiveStar = rank === 5;
  const isFourStar = rank === 4;
  const isThreeStar = rank === 3;
  const isTwoStar = rank === 2;

  // Single crisp emblem icon - avoids messy rows of multiple repeating emojis
  const starIcon = isCrownRank ? '👑' : '⭐';

  // Format label cleanly: strip duplicate leading stars/crowns if passed in badge
  let labelText = '';
  if (badge) {
    const cleaned = badge.replace(/^[★⭐👑\s]+/, '').trim();
    if (cleaned) {
      labelText = cleaned;
    } else {
      labelText = isThreeCrown ? '3 CROWN' : isTwoCrown ? '2 CROWN' : isCrown ? 'CROWN' : size === 'xs' ? `${rank}★` : `${rank} STAR`;
    }
  } else {
    labelText = isThreeCrown ? '3 CROWN' : isTwoCrown ? '2 CROWN' : isCrown ? 'CROWN' : size === 'xs' ? `${rank}★` : `${rank} STAR`;
  }

  return (
    <View
      style={[
        styles.badgeBase,
        isTwoStar && styles.badgeBase_rank2,
        isThreeStar && styles.badgeBase_rank3,
        isFourStar && styles.badgeBase_rank4,
        isFiveStar && styles.badgeBase_rank5,
        isSixStar && styles.badgeBase_rank6,
        isSevenStar && styles.badgeBase_rank7,
        isCrown && styles.badgeBase_crown,
        isTwoCrown && styles.badgeBase_twoCrown,
        isThreeCrown && styles.badgeBase_threeCrown,
        styles[`badge_${size}`],
        glow && (isThreeCrown ? styles.glowEffect_threeCrown : isTwoCrown ? styles.glowEffect_twoCrown : isCrown ? styles.glowEffect_crown : isSevenStar ? styles.glowEffect_rank7 : isSixStar ? styles.glowEffect_rank6 : isFiveStar ? styles.glowEffect_rank5 : isFourStar ? styles.glowEffect_rank4 : isThreeStar ? styles.glowEffect_rank3 : isTwoStar ? styles.glowEffect_rank2 : styles.glowEffect),
        style,
      ]}
    >
      <Text style={[styles.starIcon, isTwoStar && styles.starIcon_rank2, isThreeStar && styles.starIcon_rank3, isFourStar && styles.starIcon_rank4, isFiveStar && styles.starIcon_rank5, isSixStar && styles.starIcon_rank6, isSevenStar && styles.starIcon_rank7, isCrown && styles.starIcon_crown, isTwoCrown && styles.starIcon_twoCrown, isThreeCrown && styles.starIcon_threeCrown, styles[`starIcon_${size}`]]}>
        {starIcon}
      </Text>
      {showLabel && (
        <Text
          style={[
            styles.badgeText,
            isTwoStar && styles.badgeText_rank2,
            isThreeStar && styles.badgeText_rank3,
            isFourStar && styles.badgeText_rank4,
            isFiveStar && styles.badgeText_rank5,
            isSixStar && styles.badgeText_rank6,
            isSevenStar && styles.badgeText_rank7,
            isCrown && styles.badgeText_crown,
            isTwoCrown && styles.badgeText_twoCrown,
            isThreeCrown && styles.badgeText_threeCrown,
            styles[`badgeText_${size}`],
          ]}
        >
          {labelText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  badgeBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.14)',
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: 12,
  },
  badgeBase_rank2: {
    backgroundColor: 'rgba(255, 145, 0, 0.18)',
    borderColor: '#FF9100',
    borderWidth: 1.5,
  },
  badgeBase_rank3: {
    backgroundColor: 'rgba(255, 61, 0, 0.22)',
    borderColor: '#FF3D00',
    borderWidth: 1.5,
  },
  badgeBase_rank4: {
    backgroundColor: 'rgba(192, 132, 252, 0.22)',
    borderColor: '#C084FC',
    borderWidth: 1.8,
  },
  badgeBase_rank5: {
    backgroundColor: 'rgba(0, 240, 255, 0.22)',
    borderColor: '#00F0FF',
    borderWidth: 2,
  },
  badgeBase_rank6: {
    backgroundColor: 'rgba(255, 0, 128, 0.22)',
    borderColor: '#FF007F',
    borderWidth: 2.2,
  },
  badgeBase_rank7: {
    backgroundColor: 'rgba(255, 215, 0, 0.28)',
    borderColor: '#FFE600',
    borderWidth: 2.5,
  },
  badgeBase_crown: {
    backgroundColor: 'rgba(255, 215, 0, 0.35)',
    borderColor: '#FFD700',
    borderWidth: 2.8,
  },
  badgeBase_twoCrown: {
    backgroundColor: 'rgba(255, 180, 0, 0.42)',
    borderColor: '#FFE000',
    borderWidth: 3,
  },
  badgeBase_threeCrown: {
    backgroundColor: 'rgba(255, 235, 59, 0.48)',
    borderColor: '#FFF275',
    borderWidth: 3.2,
  },
  glowEffect: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  glowEffect_rank2: {
    shadowColor: '#FF9100',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 9,
    elevation: 6,
  },
  glowEffect_rank3: {
    shadowColor: '#FF3D00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 12,
    elevation: 8,
  },
  glowEffect_rank4: {
    shadowColor: '#C084FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 14,
    elevation: 9,
  },
  glowEffect_rank5: {
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 10,
  },
  glowEffect_rank6: {
    shadowColor: '#FF007F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
  },
  glowEffect_rank7: {
    shadowColor: '#FFE600',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 14,
  },
  glowEffect_crown: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 16,
  },
  glowEffect_twoCrown: {
    shadowColor: '#FFE000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 18,
  },
  glowEffect_threeCrown: {
    shadowColor: '#FFF275',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 20,
  },
  // Sizes
  badge_xs: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    gap: 3,
  },
  badge_sm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  badge_md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
  },
  badge_lg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    gap: 8,
  },
  // Star Icon
  starIcon: {
    color: '#FFD700',
  },
  starIcon_xs: {
    fontSize: 10,
  },
  starIcon_sm: {
    fontSize: 12,
  },
  starIcon_md: {
    fontSize: 15,
  },
  starIcon_lg: {
    fontSize: 18,
  },
  // Text
  badgeText: {
    color: '#FFE27A',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  badgeText_xs: {
    fontSize: 9,
  },
  badgeText_sm: {
    fontSize: 10,
  },
  badgeText_md: {
    fontSize: 12,
  },
  badgeText_lg: {
    fontSize: 14,
  },
  starIcon_rank2: {
    color: '#FFA726',
  },
  starIcon_rank3: {
    color: '#FF3D00',
  },
  starIcon_rank4: {
    color: '#C084FC',
  },
  starIcon_rank5: {
    color: '#00F0FF',
  },
  starIcon_rank6: {
    color: '#FF007F',
  },
  starIcon_rank7: {
    color: '#FFE600',
  },
  starIcon_crown: {
    fontSize: 14,
  },
  starIcon_twoCrown: {
    fontSize: 14,
  },
  starIcon_threeCrown: {
    fontSize: 14,
  },
  badgeText_rank2: {
    color: '#FFE082',
    fontWeight: '900',
  },
  badgeText_rank3: {
    color: '#FFD54F',
    fontWeight: '900',
  },
  badgeText_rank4: {
    color: '#E9D5FF',
    fontWeight: '900',
  },
  badgeText_rank5: {
    color: '#E0F7FA',
    fontWeight: '900',
  },
  badgeText_rank6: {
    color: '#FFE4E6',
    fontWeight: '900',
  },
  badgeText_rank7: {
    color: '#FFFDE7',
    fontWeight: '900',
  },
  badgeText_crown: {
    color: '#FFF8E7',
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  badgeText_twoCrown: {
    color: '#FFFDF0',
    fontWeight: '900',
    letterSpacing: 1,
  },
  badgeText_threeCrown: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});
