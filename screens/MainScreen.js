import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, Alert, NativeModules } from 'react-native';
const { KioskModule, ScreenTimeModule } = NativeModules;

import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Lock, Unlock, Phone } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';

export default function MainScreen({ navigation }) {
  const [isLocked, setIsLocked] = useState(false);
  const [allowedContacts, setAllowedContacts] = useState([]);
  const [hasNfc, setHasNfc] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  useEffect(() => {
    async function initNfc() {
      const supported = await NfcManager.isSupported();
      setHasNfc(supported);
      if (supported) {
        await NfcManager.start();
      }
    }
    initNfc();
    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => 0);
    };
  }, []);

  const loadContacts = async () => {
    try {
      const saved = await AsyncStorage.getItem('@allowed_contacts');
      if (saved) {
        setAllowedContacts(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const initiateLockDown = async () => {
    if (allowedContacts.length === 0) {
      Alert.alert('Setup Required', 'Please setup your allowed contacts first.');
      navigation.navigate('Setup');
      return;
    }
    Alert.alert(
      'Enter Detox Mode',
      'This will pin your screen (Android) or trigger Focus mode (iOS). Are you ready?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Lock', 
          style: 'destructive',
          onPress: () => {
            setIsLocked(true);
            if (Platform.OS === 'android' && KioskModule) {
              KioskModule.startLockTask();
            } else if (Platform.OS === 'ios' && ScreenTimeModule) {
              ScreenTimeModule.requestAuthorization((err, status) => {
                if (!err && status === 'granted') {
                  ScreenTimeModule.blockApps({}, (err2, res) => {
                    if (err2) Console.warn(err2);
                  });
                }
              });
            }
            scanForUnlockTag();
          }
        }
      ]
    );
  };

  const scanForUnlockTag = async () => {
    try {
      if (!hasNfc) {
        // Fallback for sim testing
        setTimeout(() => {
          Alert.alert("NFC Tag Detected", "Unlocking device...");
          setIsLocked(false);
        }, 5000);
        return;
      }
      
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      if (tag) {
        setIsLocked(false);
        if (Platform.OS === 'android' && KioskModule) {
          KioskModule.stopLockTask();
        } else if (Platform.OS === 'ios' && ScreenTimeModule) {
          ScreenTimeModule.unblockApps();
        }
        NfcManager.cancelTechnologyRequest();
        Alert.alert('Detox complete!', 'Welcome back to reality.');
      }
    } catch (ex) {
      console.warn('NFC Scan Error:', ex);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  };

  if (isLocked) {
    return (
      <SafeAreaView style={[styles.container, styles.lockedContainer]}>
        <View style={styles.topSection}>
          <Lock color="#1dd1a1" size={80} style={{ marginBottom: 20 }} />
          <Text style={styles.lockedTitle}>Living in the Moment</Text>
          <Text style={styles.lockedSubtitle}>
            Your phone is locked. Tap your designated NFC tag to the back of your phone to unlock.
          </Text>
        </View>

        <View style={styles.contactsSection}>
          <TouchableOpacity 
            style={[styles.callCard, styles.emergencyCard]} 
            onPress={() => handleCall('911')}
          >
            <Phone color="#ff4757" size={24} />
            <Text style={styles.emergencyText}>Emergency (911)</Text>
          </TouchableOpacity>

          {allowedContacts.map((contact, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.callCard} 
              onPress={() => handleCall(contact.phoneNumbers[0].number)}
            >
              <Phone color="#1dd1a1" size={24} />
              <View>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactNumber}>{contact.phoneNumbers[0].number}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NFC Detox</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Setup')}>
          <Settings color="#fff" size={28} />
        </TouchableOpacity>
      </View>

      <View style={styles.centerContent}>
        <TouchableOpacity style={styles.lockButton} onPress={initiateLockDown}>
          <Lock color="#000" size={48} />
          <Text style={styles.lockButtonText}>START DETOX</Text>
        </TouchableOpacity>
        <Text style={styles.hintText}>
          Requires NFC Tag to unlock
        </Text>
      </View>

      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>Setup Status</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Allowed Contacts:</Text>
          <Text style={styles.statusValue}>{allowedContacts.length} / 2</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>NFC Support:</Text>
          <Text style={styles.statusValue}>{hasNfc ? 'Available' : 'Not Available'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  lockedContainer: {
    backgroundColor: '#0a0a0a',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1dd1a1',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockButton: {
    backgroundColor: '#1dd1a1',
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#1dd1a1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  lockButtonText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 20,
    marginTop: 10,
  },
  hintText: {
    color: '#888',
    marginTop: 20,
    fontSize: 16,
  },
  statusSection: {
    padding: 24,
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusText: {
    color: '#aaa',
    fontSize: 16,
  },
  statusValue: {
    color: '#1dd1a1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Locked screen styles
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  lockedTitle: {
    color: '#1dd1a1',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  lockedSubtitle: {
    color: '#aaa',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
  contactsSection: {
    padding: 20,
    paddingBottom: 40,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  emergencyCard: {
    borderColor: '#ff4757',
    backgroundColor: '#2a1216',
  },
  emergencyText: {
    color: '#ff4757',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  contactName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 4,
  },
  contactNumber: {
    color: '#aaa',
    fontSize: 14,
    marginLeft: 15,
  },
});
