import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export const StyledButton = ({ title, onPress, variant = 'primary' }: any) => (
  <TouchableOpacity 
    style={[styles.button, variant === 'secondary' ? styles.secondary : styles.primary]} 
    onPress={onPress}
  >
    <Text style={styles.text}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: { padding: 16, borderRadius: 12, alignItems: 'center', width: '80%', marginVertical: 8 },
  primary: { backgroundColor: '#4F46E5' },
  secondary: { backgroundColor: '#10B981' },
  text: { color: 'white', fontWeight: '600', fontSize: 16 },
});