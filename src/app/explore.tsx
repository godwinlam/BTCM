import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MineBestHomeScreen } from '@/components/MineBestHomeScreen';
import { api } from '@/services/api';

export default function ExploreScreen() {
  const router = useRouter();
  const [btcPrice, setBtcPrice] = useState<number>(78300);

  useEffect(() => {
    api.getBtcPrice().then((data) => {
      if (data?.price) setBtcPrice(data.price);
    });
  }, []);

  return (
    <View style={styles.container}>
      <MineBestHomeScreen
        onNavigateTab={(tab) => {
          router.push('/' as any);
        }}
        onSignUp={() => {
          router.push('/register' as any);
        }}
        btcPriceUsd={btcPrice}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0E14',
  },
});
