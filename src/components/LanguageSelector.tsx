import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, setAppLanguage } from '../i18n';

interface LanguageSelectorProps {
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ compact = false }) => {
  const { i18n, t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLang =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === i18n.language) ||
    SUPPORTED_LANGUAGES.find((lang) => i18n.language.startsWith(lang.code.split('-')[0])) ||
    SUPPORTED_LANGUAGES[0];

  const handleSelectLanguage = async (code: string) => {
    await setAppLanguage(code);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, compact && styles.buttonCompact]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.buttonFlagBadge}>
          <Text style={styles.buttonFlagText}>{currentLang.flag}</Text>
        </View>
        {!compact && <Text style={styles.langName}>{currentLang.nativeName}</Text>}
        <Text style={styles.arrowIcon}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={[
            styles.modalOverlay,
            Platform.OS === 'web' && ({
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            } as any),
          ]}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              Platform.OS === 'web' && ({
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              } as any),
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitleIcon}>🌐</Text>
                <Text style={styles.modalTitle}>{t('common.selectLanguage', 'Select Language')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.langList} showsVerticalScrollIndicator={false}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected =
                  lang.code === currentLang.code ||
                  i18n.language === lang.code;

                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.langItem, isSelected && styles.langItemSelected]}
                    onPress={() => handleSelectLanguage(lang.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langItemLeft}>
                      <View style={[styles.flagBadge, isSelected && styles.flagBadgeSelected]}>
                        <Text style={[styles.flagBadgeText, isSelected && styles.flagBadgeTextSelected]}>
                          {lang.flag}
                        </Text>
                      </View>
                      <View style={styles.langItemTextGroup}>
                        <Text style={[styles.langItemNative, isSelected && styles.langItemTextSelected]}>
                          {lang.nativeName}
                        </Text>
                        <Text style={[styles.langItemEnglish, isSelected && styles.langItemEnglishSelected]}>
                          {lang.name}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkIcon}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  buttonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  buttonFlagBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  buttonFlagText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  langName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  arrowIcon: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: -1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderColor: 'rgba(247, 147, 26, 0.45)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    maxHeight: '88%',
    ...Platform.select({
      web: {
        boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(247, 147, 26, 0.2)',
      },
      default: {
        elevation: 16,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitleIcon: {
    fontSize: 20,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  langList: {
    marginTop: 6,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  langItemSelected: {
    backgroundColor: 'rgba(247, 147, 26, 0.18)',
    borderColor: '#FFD700',
    borderWidth: 1.5,
  },
  langItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flagBadge: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagBadgeSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.22)',
    borderColor: '#FFD700',
  },
  flagBadgeText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  flagBadgeTextSelected: {
    color: '#FFD700',
    fontWeight: '900',
  },
  langItemTextGroup: {
    gap: 2,
  },
  langItemNative: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  langItemEnglish: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  langItemTextSelected: {
    color: '#FFD700',
    fontWeight: '800',
  },
  langItemEnglishSelected: {
    color: '#FDE047',
    fontWeight: '600',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
  },
  checkIcon: {
    color: '#0B0E14',
    fontSize: 13,
    fontWeight: '900',
  },
});

