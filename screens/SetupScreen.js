import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { ArrowLeft, UserPlus, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SetupScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);

  useEffect(() => {
    loadSavedContacts();
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.PhoneNumbers],
        });
        if (data.length > 0) {
          // Filter out contacts without names or numbers
          const validContacts = data.filter(c => c.name && c.phoneNumbers && c.phoneNumbers.length > 0);
          setContacts(validContacts);
        }
      } else {
        Alert.alert('Permission needed', 'Please allow contact access to pick your allowed contacts.');
      }
    })();
  }, []);

  const loadSavedContacts = async () => {
    try {
      const saved = await AsyncStorage.getItem('@allowed_contacts');
      if (saved) {
        setSelectedContacts(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveContacts = async () => {
    try {
      await AsyncStorage.setItem('@allowed_contacts', JSON.stringify(selectedContacts));
      navigation.goBack();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleContact = (contact) => {
    const isSelected = selectedContacts.find(c => c.id === contact.id);
    if (isSelected) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contact.id));
    } else {
      if (selectedContacts.length >= 2) {
        Alert.alert('Limit Reached', 'You can only select a maximum of 2 allowed contacts.');
        return;
      }
      setSelectedContacts([...selectedContacts, contact]);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedContacts.find(c => c.id === item.id);
    return (
      <TouchableOpacity 
        style={[styles.contactCard, isSelected && styles.contactCardSelected]} 
        onPress={() => toggleContact(item)}
      >
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactNumber}>{item.phoneNumbers[0].number}</Text>
        </View>
        {isSelected ? (
          <CheckCircle2 color="#fff" size={24} />
        ) : (
          <UserPlus color="#888" size={24} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Allowed Contacts</Text>
      </View>
      
      <Text style={styles.subtitle}>
        Select exactly 2 contacts to allow calling while your device is locked.
      </Text>
      
      <View style={styles.selectedCount}>
        <Text style={styles.countText}>{selectedContacts.length} / 2 Selected</Text>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
      />

      <TouchableOpacity style={styles.saveButton} onPress={saveContacts}>
        <Text style={styles.saveButtonText}>Save Details</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    color: '#aaaaaa',
    fontSize: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  selectedCount: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  countText: {
    color: '#1dd1a1',
    fontWeight: 'bold',
  },
  listContainer: {
    padding: 20,
  },
  contactCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  contactCardSelected: {
    borderColor: '#1dd1a1',
    backgroundColor: '#1e2d26',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 18,
    color: '#ffffff',
    marginBottom: 4,
  },
  contactNumber: {
    fontSize: 14,
    color: '#888888',
  },
  saveButton: {
    backgroundColor: '#1dd1a1',
    margin: 20,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
