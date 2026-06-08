import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PickedImage = { uri: string; base64: string };

async function captureFromCamera(withBase64: boolean): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera Access Needed', 'Enable camera permissions in your device settings to take photos.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: withBase64,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

async function captureFromLibrary(withBase64: boolean): Promise<ImagePicker.ImagePickerAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Photo Library Access Needed', 'Enable photo library permissions in your device settings to add photos.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    base64: withBase64,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0];
}

function promptSource(
  title: string,
  message: string,
  withBase64: boolean,
): Promise<ImagePicker.ImagePickerAsset | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Take Photo', onPress: () => captureFromCamera(withBase64).then(resolve) },
        { text: 'Choose from Library', onPress: () => captureFromLibrary(withBase64).then(resolve) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** Prompts the user to take a new photo or pick one from their library, returning the picked image's local uri (or null if cancelled/denied). */
export async function pickImage(opts?: { title?: string; message?: string }): Promise<string | null> {
  const asset = await promptSource(opts?.title ?? 'Add Photo', opts?.message ?? 'Choose how you want to add your photo.', false);
  return asset?.uri ?? null;
}

/** Prompts the user to take a new progress photo or pick one from their library. */
export function pickProgressPhoto(): Promise<string | null> {
  return pickImage({ title: 'Add Progress Photo', message: 'Choose how you want to add your photo.' });
}

/** Like `pickImage`, but also returns the image's Base64 data — used to send a photo to an AI model for analysis. */
export async function pickImageWithData(opts?: { title?: string; message?: string }): Promise<PickedImage | null> {
  const asset = await promptSource(opts?.title ?? 'Add Photo', opts?.message ?? 'Choose how you want to add your photo.', true);
  if (!asset?.base64) return null;
  return { uri: asset.uri, base64: asset.base64 };
}
