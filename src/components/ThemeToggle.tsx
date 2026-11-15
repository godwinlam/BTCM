import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/context/ThemeContext';

interface ThemeToggleProps {
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false }) => {
  const { isDark, toggleTheme, colors } = useThemeMode();
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        compact ? styles.buttonCompact : styles.buttonFull,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)',
        },
      ]}
      onPress={toggleTheme}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isDark ? t('common.lightMode', 'Switch to Light Mode') : t('common.darkMode', 'Switch to Dark Mode')}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{isDark ? '🌙' : '☀️'}</Text>
      </View>
      {!compact && (
        <Text
          style={[
            styles.label,
            { color: isDark ? '#E2E8F0' : '#1E293B' },
          ]}
        >
          {isDark ? t('common.darkMode', 'Dark') : t('common.lightMode', 'Light')}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    cursor: Platform.OS === 'web' ? ('pointer' as any) : undefined,
  },
  buttonCompact: {
    width: 38,
    height: 38,
    borderRadius: 19,
    padding: 0,
  },
  buttonFull: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 7,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
