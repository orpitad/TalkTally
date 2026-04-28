import { Audio } from 'expo-av';

export const playSuccessSound = async () => {
  const { sound } = await Audio.Sound.createAsync(
    // You can drop a 'success.mp3' in your assets folder
    require('../../assets/success.mp3') 
  );
  await sound.playAsync();
};